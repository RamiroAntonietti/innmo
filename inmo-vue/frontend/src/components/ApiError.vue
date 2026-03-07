<template>
  <transition name="fade">
    <div v-if="message"
      class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
      <span class="text-red-500 mt-0.5 flex-shrink-0">✕</span>
      <span>{{ message }}</span>
    </div>
  </transition>
</template>

<script setup>
defineProps({ message: String });
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
