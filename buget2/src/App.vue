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
  
  --font-family: "Courier New", Courier, monospace;
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
