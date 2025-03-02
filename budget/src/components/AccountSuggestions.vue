<script setup lang="ts">
import type { Account } from '../stores/useStore'

const props = defineProps<{
  accounts: Account[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', account: Account): void
}>()
</script>

<template>
  <div class="account-suggestions">
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
  bottom: 100%;
  left: 0;
  right: 0;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
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
