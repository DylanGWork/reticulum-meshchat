// src/utils/gameWire.js


/*
 * GameWire v0 — compact invite/response format (for LoRa/LXMF)
 *
 * Transport string form used by the UI:
 *   "gw:" + base64url(PAYLOAD_5B)
 *     - PAYLOAD_5B is exactly 5 bytes (see layout below)
 *     - 5 bytes -> 8 base64 chars (with one '=' padding which we strip)
 *     - final string length ≈ 3 + 7 = 10 ASCII chars, e.g. "gw:AAESqzQ"
 *
 * PAYLOAD_5B (big-endian) byte layout
 *   Byte 0 : VVVV OOOO
 *             VVVV = version (4 bits)  -> 0
 *             OOOO = opcode  (4 bits)  -> 0=create, 1=accept, 2=decline, 3–15 reserved
 *   Byte 1 : GAME (8 bits)             -> game code (0..255). See GAME_CODES below.
 *   Byte 2 : SID[23:16]                 \
 *   Byte 3 : SID[15:8]                   > 24-bit session/invite ID (random if not supplied)
 *   Byte 4 : SID[7:0]                   /
 *
 * Notes
 * - No inviter hash or timestamp on-wire: derive inviter from the LXMF envelope
 *   (source hash) and timestamp from local receipt time. Keeps payload minimal.
 * - Decoder is backward compatible: it still understands the old JSON formats
 *   ("gamewire:" + base64(JSON)) and raw JSON {type:'game', ...}.
 * - If you later use a binary LXMF field, you can send PAYLOAD_5B directly and
 *   drop the "gw:" + base64url wrapper to cut the ASCII overhead (5 bytes raw).
 *
 * Example
 *   ver=0, op=create(0), game=tic_tac_toe(1), sid=0x12AB34
 *   bytes: 00 01 12 AB 34
 *   base64url: "AAESqzQ"
 *   string sent: "gw:AAESqzQ"
 */


// Registry of games -> byte codes (0..255)
const GAME_CODES = {
  tic_tac_toe: 1,
  // add more here...
};
const CODES_GAME = Object.fromEntries(
  Object.entries(GAME_CODES).map(([k, v]) => [v, k])
);

// Opcodes
const OP = { create: 0, accept: 1, decline: 2 };
const OP_NAME = { 0: "create", 1: "accept", 2: "decline" };

// --- helpers ---
function toB64Url(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}
function fromB64Url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function rand24() {
  const a = new Uint8Array(3);
  if (crypto?.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 3; i++) a[i] = Math.floor(Math.random()*256);
  return (a[0] << 16) | (a[1] << 8) | a[2];
}
function id24ToHex(n24) { return n24.toString(16).padStart(6, "0"); }
function hexToId24(hex6) { return parseInt(hex6, 16) & 0xFFFFFF; }

// --- compact encoder ---
export function encodeGame(obj) {
  if (typeof obj === "string") return obj; // passthrough

  const ver = 0;
  const opcode = OP[obj.op];
  if (opcode == null) throw new Error("Unknown op");
  const gameCode = GAME_CODES[obj.game];
  if (gameCode == null) throw new Error("Unknown game");

  // session id: provided (hex/number) or generated 24-bit
  let sid;
  if (obj.id != null) {
    sid = typeof obj.id === "number" ? (obj.id & 0xFFFFFF) : hexToId24(String(obj.id));
  } else {
    sid = rand24();
  }

  const b0 = ((ver & 0x0F) << 4) | (opcode & 0x0F);
  const payload = new Uint8Array(5);
  payload[0] = b0;
  payload[1] = gameCode;
  payload[2] = (sid >> 16) & 0xFF;
  payload[3] = (sid >> 8) & 0xFF;
  payload[4] = sid & 0xFF;

  return "gw:" + toB64Url(payload);
}

// --- decoder (compact + legacy JSON/gamewire) ---
export function decodeGame(text) {
  if (!text) return null;

  if (text.startsWith("gw:")) {
    try {
      const bytes = fromB64Url(text.slice(3));
      if (bytes.length < 5) return null;

      const b0 = bytes[0];
      const ver = (b0 >> 4) & 0x0F;
      const opcode = b0 & 0x0F;
      if (ver !== 0) return null;

      const gameCode = bytes[1];
      const sid = (bytes[2] << 16) | (bytes[3] << 8) | bytes[4];

      return {
        type: "game",
        op: OP_NAME[opcode],
        game: CODES_GAME[gameCode] ?? `code_${gameCode}`,
        id: id24ToHex(sid),
      };
    } catch { return null; }
  }

  // Legacy JSON
  try {
    const o = JSON.parse(text);
    if (o && o.type === "game" && o.op && o.game && o.id) return o;
  } catch {}

  // Legacy "gamewire:" base64(JSON)
  try {
    if (text.startsWith("gamewire:")) {
      const json = atob(text.slice("gamewire:".length));
      const o = JSON.parse(json);
      if (o && o.type === "game") return o;
    }
  } catch {}

  return null;
}
