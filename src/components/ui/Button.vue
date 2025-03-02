<script setup lang="ts">
const props = defineProps<{
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'icon'
}>()
</script>

<template>
  <button
    :class="[
      'button',
      `button--${variant || 'default'}`,
      `button--${size || 'default'}`
    ]"
  >
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
  transform: translateY(0);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.2s ease,
              opacity 0.2s ease;
  font-family: var(--font-family);
}

.button:active {
  transform: scale(0.95);
}

.button--default {
  background: #42b883;
  color: white;
  padding: 0.5rem 1rem;
}

.button--default:hover {
  background: #3aa876;
}

.button--outline {
  background: transparent;
  border: none;  /* Remove border */
  color: white;
  padding: 0.5rem 1rem;
}

.button--outline:hover,
.button--ghost:hover {
  background: rgba(255, 255, 255, 0.05);
}

.button--ghost {
  background: transparent;
  color: white;
  padding: 0.5rem;
}

.button--icon {
  padding: 0.5rem;
  width: 36px;
  height: 36px;
}

.button:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .button--icon {
    width: 32px;
    height: 32px;
  }
}
</style>
