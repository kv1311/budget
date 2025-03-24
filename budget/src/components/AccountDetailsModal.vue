<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import Button from './ui/Button.vue'
import { balanceHistory } from '../stores/useBalanceHistoryStore'
import { selectedCurrency } from '../stores/useStore'

const props = defineProps<{
  accountId: number
  accountName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(amount)
}

const accountHistory = computed(() => {
  return balanceHistory.value
    .filter(record => record.accountId === props.accountId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Account Details - {{ accountName }}</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          class="close-button" 
          @click="emit('close')"
        >
          <X :size="20" />
        </Button>
      </div>
      <div class="balance-history">
        <div v-if="accountHistory.length === 0" class="no-history">
          No balance history available yet
        </div>
        <div v-else v-for="record in accountHistory" :key="record.date" class="history-item">
          <span class="date">{{ new Date(record.date).toLocaleDateString() }}</span>
          <span class="balance">{{ formatCurrency(record.balance) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-history {
  /* Height calculation: item height (48px) * 10 items */
  height: 480px;
  overflow-y: auto;
  background: #0a0a0a;
  padding:1rem;
  border-radius: 0 0 18px 18px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid #222;
  height: 48px; /* Fixed height for each item */
  align-items: center;
}

.history-item:last-child {
  border-bottom: none;
}

/* Add scrollbar styling */
.balance-history::-webkit-scrollbar {
  width: 8px;
}

.balance-history::-webkit-scrollbar-track {
  background: #0a0a0a;
  border-radius: 8px;
}

.balance-history::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 8px;
}

.balance-history::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.date {
  color: #888;
}

.balance {
  color: #42b883;
}

.no-history {
  text-align: center;
  color: #888;
  padding: 2rem;


}

.modal-header {
  display: flex;
  gap:1rem;
  justify-content: space-between;
  align-items: center;
  background: #111;
  border-radius: 18px 18px 0 0;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 10;  
}

.close-button {
  color: #666;
}

.close-button:hover {
  color: white;
}

/* Remove modal-actions class since we don't need it anymore */
</style>
