<script setup lang="ts">
import { computed, ref } from 'vue'
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
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const swipeOffset = ref<Record<number, number>>({})
const touchStart = ref({ x: 0, y: 0 })
const swipeThreshold = 50
const maxSwipe = 80

const handleTouchStart = (e: TouchEvent, transactionId: number) => {
  touchStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  }
  if (!(transactionId in swipeOffset.value)) {
    swipeOffset.value[transactionId] = 0
  }
}

const handleTouchMove = (e: TouchEvent, transactionId: number) => {
  const deltaX = e.touches[0].clientX - touchStart.value.x
  const deltaY = Math.abs(e.touches[0].clientY - touchStart.value.y)

  if (deltaY < 30) {
    e.preventDefault()
    const newOffset = Math.min(Math.max(deltaX, -maxSwipe), maxSwipe)
    swipeOffset.value[transactionId] = newOffset
  }
}

const handleTouchEnd = (e: TouchEvent, transactionId: number) => {
  const currentOffset = swipeOffset.value[transactionId] || 0

  if (Math.abs(currentOffset) <= swipeThreshold) {
    swipeOffset.value[transactionId] = 0
  } else {
    swipeOffset.value[transactionId] = currentOffset > 0 ? maxSwipe : -maxSwipe
  }
}

const handleRestore = (transactionId: number) => {
  restoreTransaction(transactionId)
  swipeOffset.value[transactionId] = 0
}

const handleDelete = (transactionId: number) => {
  permanentlyDelete(transactionId)
  swipeOffset.value[transactionId] = 0
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
             class="transaction-container"
        >
          <div class="swipe-actions left">
            <Button 
              variant="ghost" 
              size="icon" 
              class="restore-btn"
              @click="handleRestore(transaction.id)"
            >
              <RefreshCw :size="20" />
            </Button>
          </div>
          <div class="swipe-actions right">
            <Button 
              variant="ghost" 
              size="icon" 
              class="delete-btn"
              @click="handleDelete(transaction.id)"
            >
              <Trash2 :size="20" />
            </Button>
          </div>

          <div
            class="transaction-item"
            :style="{
              transform: `translateX(${swipeOffset[transaction.id] ?? 0}px)`,
            }"
            @touchstart="(e) => handleTouchStart(e, transaction.id)"
            @touchmove="(e) => handleTouchMove(e, transaction.id)"
            @touchend="(e) => handleTouchEnd(e, transaction.id)"
          >
            <div class="transaction-layout">
              <div class="transaction-amount">
                <span :class="{ negative: transaction.amount < 0 }">
                  {{ formatAmount(transaction.amount) }}
                </span>
              </div>
              <div class="transaction-content">
                <div class="description-category">
                  <div class="description">{{ transaction.description }}</div>
                  <div class="category" v-if="transaction.category">#{{ transaction.category }}</div>
                </div>
                <div class="account-date">
                  <div class="date">{{ formatDate(transaction.date) }}</div>
                  <div class="account">{{ transaction.account }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deleted-transactions {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  position: fixed;
  width: 100%;
}

.header {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  z-index: 1000;
  background: #000;
  min-height: 1cm;
  padding: 1rem;
  border-bottom: 1px solid #222;
  touch-action: none;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem;
  padding-top: 6.5rem;
  padding-bottom: 8rem;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.transaction-container {
  position: relative;
  overflow: hidden;
}

.transaction-item {
  position: relative;
  padding: 0.75rem 1rem;
  background: black;
  border-bottom: 1px solid #222;
  width: 100%;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: pan-y;
  z-index: 2;
  will-change: transform;
}

.transaction-layout {
  display: grid;
  grid-template-areas: "amount content";
  grid-template-columns: minmax(80px, auto) 1fr;
  gap: 0.75rem;
  align-items: center;
}

.transaction-amount {
  grid-area: amount;
  font-weight: 500;
  font-size: 1rem;
}

.transaction-content {
  grid-area: content;
  display: flex;
  justify-content: space-between;
  min-width: 0;
  align-items: center;
}

.description-category {
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}

.account-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.description {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
}

.category {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
}

.account {
  font-size: 0.75rem;
  color: #888;
}

.date {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
}

.negative {
  color: #ef4444;
}

.swipe-actions {
  position: absolute;
  top: 0;
  height: 100%;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.swipe-actions.left {
  left: 0;
  background: #1d4ed8;
}

.swipe-actions.right {
  right: 0;
  background: #b91c1c;
}

.restore-btn {
  color: white;
}

.delete-btn {
  color: white;
}

.total-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: black;
  padding: 1rem;
  text-align: center;
  z-index: 100;
  width: 100%;
}

.total-amount {
  font-size: 1.25rem;
  font-weight: 500;
  color: #42b883; /* Add default color for positive amounts */
}

@media (max-width: 480px) {
  .header {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.75rem 1rem;
    padding-top: 3rem;
  }

  .transaction-item {
    padding: 0.625rem 0.875rem;
  }
  
  .transaction-amount {
    font-size: 0.875rem;
  }

  .description {
    font-size: 0.875rem;
  }

  .category, .account, .date {
    font-size: 0.6875rem;
  }

  .transaction-layout {
    grid-template-columns: minmax(70px, auto) 1fr;
    gap: 0.5rem;
  }
}
</style>
