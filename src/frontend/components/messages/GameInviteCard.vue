<!-- src/components/messages/GameInviteCard.vue -->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Expecting payload like: { type:'game', op:'create', game:'tic_tac_toe', id:'a1b2c3' }
  payload: { type: Object, required: true },
});

const emit = defineEmits(['respond']);

const GAME_LABELS = {
  tic_tac_toe: 'Tic-Tac-Toe',
};

const gameName = computed(() => GAME_LABELS[props.payload?.game] || props.payload?.game || 'Unknown');
const sessionId = computed(() => (props.payload?.id ?? '').toString().slice(0, 6));

function accept() {
  emit('respond', {
    type: 'game',
    op: 'accept',
    game: props.payload.game,
    id: props.payload.id,
  });
}

function decline() {
  emit('respond', {
    type: 'game',
    op: 'decline',
    game: props.payload.game,
    id: props.payload.id,
  });
}
</script>

<template>
  <div class="border rounded-lg p-3 bg-white/70 dark:bg-black/20">
    <div class="text-xs opacity-60">Game invite</div>
    <div class="font-medium">{{ gameName }}</div>
    <div class="text-xs mt-1">Session: {{ sessionId }}</div>

    <div class="mt-2 flex gap-2">
      <button
        class="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500"
        @click="accept"
      >
        Accept
      </button>
      <button
        class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-600 dark:text-white"
        @click="decline"
      >
        Decline
      </button>
    </div>
  </div>
</template>
