<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { Account } from '../stores/useStore'

const props = defineProps<{
  accounts: Account[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', account: Account): void
}>()

const suggestionsEl = ref<HTMLElement | null>(null)
const showAbove = ref(false)

const updatePosition = async () => {
  await nextTick()
  if (!suggestionsEl.value) return

  const rect = suggestionsEl.value.getBoundingClientRect()
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  const height = rect.height

  // Default to showing below
  showAbove.value = spaceBelow < height && spaceAbove > spaceBelow
}

onMounted(() => {
  updatePosition()
  window.addEventListener('resize', updatePosition)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <div 
    ref="suggestionsEl"
    class="account-suggestions"
    :class="{ 'position-above': showAbove }"
  >
    <button
      v-for="(account, index) in accounts"
      :key="account.id"
      class="suggestion-item"
      :class="{ active: index === selectedIndex }"
      @click="emit('select', account)"
    >
      <span class="account-name">{{ account.name }}</span>
      <span class="account-balance">
        {{ account.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.account-suggestions {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: calc(100% + 4px);
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10000;
}

.account-suggestions.position-above {
  bottom: auto;
  top: 100%;
  margin-bottom: 0;
  margin-top: 4px
  
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  text-align: left;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: #222;
}

.account-name {
  font-weight: 500;
}

.account-balance {
  color: #666;
  font-size: 0.9em;
}
</style>
