<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, RefreshCw, Trash2 } from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import { deletedTransactions, restoreTransaction, permanentlyDelete, selectedCurrency } from '../stores/useStore'

const router = useRouter()

const sortedDeletedTransactions = computed(() => {
  return [...deletedTransactions.value].sort((a, b) => 
    new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  )
})

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(amount)
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const getTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <div class="deleted-transactions">
    <header class="header">
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Recently Deleted</h1>
    </header>

    <div class="content">
      <div v-if="sortedDeletedTransactions.length === 0" class="empty-state">
        <p>No deleted transactions</p>
      </div>

      <div v-else class="transactions-list">
        <div v-for="transaction in sortedDeletedTransactions" 
             :key="transaction.id" 
             class="transaction-item"
        >
          <div class="transaction-info">
            <div class="amount" :class="{ negative: transaction.amount < 0 }">
              {{ formatAmount(transaction.amount) }}
            </div>
            <div class="description">{{ transaction.description }}</div>
            <div class="metadata">
              <span class="date">{{ formatDate(transaction.date) }}</span>
              <span class="deleted-at">Deleted {{ getTimeAgo(transaction.deletedAt) }}</span>
            </div>
          </div>
          
          <div class="actions">
            <Button 
              variant="ghost" 
              size="icon"
              class="restore-btn" 
              @click="restoreTransaction(transaction.id)"
              title="Restore transaction"
            >
              <RefreshCw :size="16" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              class="delete-btn" 
              @click="permanentlyDelete(transaction.id)"
              title="Delete permanently"
            >
              <Trash2 :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deleted-transactions {
  min-height: 100vh;
  background: black;
  padding: 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.content {
  max-width: 768px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #222;
}

.transaction-info {
  flex: 1;
  min-width: 0;
}

.amount {
  font-size: 0.9375rem;
  color: #42b883;
  margin-bottom: 0.25rem;
}

.description {
  color: white;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
}

.metadata {
  font-size: 0.75rem;
  color: #666;
  display: flex;
  gap: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.restore-btn {
  color: #2563eb;
}

.delete-btn {
  color: #dc2626;
}

.restore-btn:hover,
.delete-btn:hover {
  transform: scale(1.1);
}

.negative {
  color: #ef4444;
}
</style>
