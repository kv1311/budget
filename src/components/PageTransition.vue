<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, watch } from 'vue'

const route = useRoute()
const transitionName = ref('slide-left')

watch(() => route.name, () => {
  transitionName.value = 'slide-left'
})
</script>

<template>
  <transition :name="transitionName" mode="out-in">
    <slot></slot>
  </transition>
</template>

<style>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
