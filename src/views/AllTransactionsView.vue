<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import ExpenseList from '../components/ExpenseList.vue'
import Calendar from '../components/Calendar.vue'
import { transactions, selectedCurrency } from '../stores/useStore'

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
}

interface GroupedTransactions {
  [key: string]: Transaction[]
}

const router = useRouter()
const showDateRange = ref(false)
const showFromCalendar = ref(false)
const showToCalendar = ref(false)
const touchStart = ref({ y: 0 })

// Get the date of first transaction
const firstTransactionDate = computed(() => {
  const dates = transactions.value.map(t => new Date(t.date))
  return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
})

// Initialize date range
const fromDate = ref(firstTransactionDate.value)
const toDate = ref(new Date())

const handleTouchStart = (e: TouchEvent) => {
  touchStart.value.y = e.touches[0].clientY
}

const handleTouchMove = (e: TouchEvent) => {
  const deltaY = touchStart.value.y - e.touches[0].clientY
  if (deltaY > 50) { // Swipe up threshold
    showDateRange.value = true
  } else if (deltaY < -50) { // Swipe down threshold
    showDateRange.value = false
  }
}

const groupedTransactions = computed(() => {
  const groups: GroupedTransactions = {}
  
  // Filter transactions by date range and sort
  const filteredAndSorted = [...transactions.value]
    .filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= fromDate.value && txDate <= toDate.value
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Group by date
  filteredAndSorted.forEach(transaction => {
    const dateKey = new Date(transaction.date).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(transaction)
  })
  
  return groups
})

const totalAmount = computed(() => {
  return Object.values(groupedTransactions.value)
    .flat()
    .reduce((sum, tx) => sum + tx.amount, 0)
})

// Update formatDate function signature to accept Date
const formatDate = (date: Date | string | number) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(amount)
}
</script>

<template>
  <div class="transactions-view">
    <header 
      class="header"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
    >
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Transactions</h1>
    </header>

    <Transition name="slide">
      <div v-if="showDateRange" class="date-range">
        <div class="date-inputs">
          <div class="date-field" @click="showFromCalendar = true">
            <CalendarIcon :size="16" />
            <span>From: {{ formatDate(fromDate) }}</span>
          </div>
          <div class="date-field" @click="showToCalendar = true">
            <CalendarIcon :size="16" />
            <span>To: {{ formatDate(toDate) }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <div class="content">
      <div v-if="Object.keys(groupedTransactions).length === 0" class="empty-state">
        <p>No transactions yet</p>
      </div>
      
      <template v-else>
        <div 
          v-for="(dayTransactions, date) in groupedTransactions" 
          :key="date"
          class="date-group"
        >
          <div class="date-header">
            <span class="date">{{ formatDate(date) }}</span>
          </div>
          
          <ExpenseList
            :expenses="dayTransactions"
            :hide-total="true"
          />
        </div>
      </template>
    </div>

    <div class="total-container">
      <div v-if="Object.keys(groupedTransactions).length > 0" class="total-amount">
        <span :class="{ negative: totalAmount < 0 }">
          {{ formatCurrency(totalAmount) }}
        </span>
      </div>
    </div>

    <!-- Calendar Popups -->
    <Transition name="fade">
      <div v-if="showFromCalendar" class="calendar-popup" @click.self="showFromCalendar = false">
        <div class="calendar-wrapper">
          <Calendar 
            :model-value="fromDate"
            :max-date="toDate"
            @update:model-value="(date) => { fromDate = date; showFromCalendar = false }"
            @monthChange="(date) => fromDate = date"
          />
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showToCalendar" class="calendar-popup" @click.self="showToCalendar = false">
        <div class="calendar-wrapper">
          <Calendar 
            :model-value="toDate"
            :min-date="fromDate"
            :max-date="new Date()"
            @update:model-value="(date) => { toDate = date; showToCalendar = false }"
            @monthChange="(date) => toDate = date"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.transactions-view {
  min-height: 100vh;
  background: black;
  color: white;
  padding-top: 4rem; /* Add space for fixed header */
  padding-bottom: 5rem; /* Add padding to avoid overlap with total amount */
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: black;
  z-index: 10;
  border-bottom: 1px solid #222;
  height: 4rem; /* Fixed height */
  touch-action: none; /* Prevent scrolling */
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

.date-group:not(:last-child) {
  margin-bottom: 1.5rem;
}

.date-header {
  display: flex;
  justify-content: flex-start; /* Changed from space-between */
  align-items: center;
  padding: 1rem;
  background: #111;
  border-radius: 8px 8px 0 0;
  margin-bottom: 1px;
}

.date {
  font-size: 0.875rem;
  font-weight: 500;
  color: #888;
}

.day-total {
  font-size: 0.875rem;
  font-weight: 500;
  color: #42b883;
}

.day-total.negative {
  color: #ef4444;
}

.date-range {
  background: #111;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
}

.date-inputs {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #000;
  border-radius: 4px;
  cursor: pointer;
}

.date-field:hover {
  background: #222;
}

.calendar-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.calendar-wrapper {
  background: #111;
  padding: 1rem;
  border-radius: 12px;
  max-width: 90%;
  transform-origin: center;
  animation: popup 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

@keyframes popup {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.total-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: black;
  padding: 1rem;
  text-align: center;
  z-index: 10;
}

.total-amount {
  font-size: 1.25rem;
  font-weight: 500;
  color: #42b883; /* Add default color for positive amounts */
}

.date-range-info {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
  text-align: right;
}

.negative {
  color: #ef4444;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .header {
    padding: 0.25rem 0;
    height: 3.5rem; /* Fixed height for mobile */
  }

  .date-header {
    padding: 0.5rem 0.875rem;
  }

  .date, .day-total {
    font-size: 0.8125rem;
  }

  .date-inputs {
    flex-direction: column;
    gap: 0.5rem;
  }

  .total-amount {
    font-size: 1rem;
    padding: 0.5rem 0.75rem;
  }

  .date-range-info {
    font-size: 0.6875rem;
  }
}
</style>
