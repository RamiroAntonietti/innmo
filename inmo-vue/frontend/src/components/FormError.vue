<template>
  <p v-if="message" class="text-xs text-red-500 mt-1 flex items-center gap-1">
    <span>⚠</span> {{ message }}
  </p>
</template>

<script setup>
defineProps({ message: String });
</script>
