<script setup>
const props = defineProps({
  payload: { type: Object, required: true },
})
const emit = defineEmits(["respond","prefill"]) // we'll “respond” upward or prefill the composer

function accept()  { emit("respond", { ...props.payload, op:"accept",  seq:(props.payload.seq ?? 0)+1 }) }
function decline() { emit("respond", { ...props.payload, op:"decline", seq:(props.payload.seq ?? 0)+1 }) }
</script>

<template>
  <div class="border rounded-lg p-3 bg-white/70 dark:bg-black/20">
    <div class="text-xs opacity-60">Game invite</div>
    <div class="font-medium">Variant: {{ payload.variant }}</div>
    <div class="text-xs mt-1">Game ID: {{ (payload.game_id || '').slice(0,8) }}…</div>
    <div class="mt-2 flex gap-2">
      <button class="px-3 py-1 rounded bg-green-600 text-white" @click="accept">Accept</button>
      <button class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" @click="decline">Decline</button>
    </div>
  </div>
</template>
