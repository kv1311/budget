<script setup lang="ts">
import PageTransition from './components/PageTransition.vue'
</script>

<template>
  <PageTransition>
    <router-view></router-view>
  </PageTransition>
</template>

<style>
:root {
  --font-family: 'CustomFont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

body {
  margin: 0;
  background-color: #000;
  color: #fff;
  font-family: var(--font-family);
}

input, button {
  font-family: var(--font-family);
}
</style>
