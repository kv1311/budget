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
const touchStart = ref({ x: 0, y: 0 })
const touchEnd = ref({ x: 0, y: 0 })
const minSwipeDistance = 50
const calendarTopPosition = ref(0)

const closeCalendars = () => {
  showFromCalendar.value = false
  showToCalendar.value = false
}

const showCalendar = (type: 'from' | 'to', event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  calendarTopPosition.value = rect.bottom + 8 // 8px gap

  if (type === 'from') {
    showFromCalendar.value = true
    showToCalendar.value = false
  } else {
    showToCalendar.value = true
    showFromCalendar.value = false
  }
}

// Update click handlers in template
const handleFromDateClick = (e: MouseEvent) => showCalendar('from', e)
const handleToDateClick = (e: MouseEvent) => showCalendar('to', e)

// Get the date of first transaction
const firstTransactionDate = computed(() => {
  const dates = transactions.value.map(t => new Date(t.date))
  return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
})

// Initialize date range
const fromDate = ref(firstTransactionDate.value)
const toDate = ref(new Date())

const handleTouchStart = (e: TouchEvent) => {
  touchStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  }
  touchEnd.value = { ...touchStart.value }
}

const handleTouchMove = (e: TouchEvent) => {
  touchEnd.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  }
  
  const deltaY = touchEnd.value.y - touchStart.value.y
  if (Math.abs(deltaY) > minSwipeDistance) {
    if (deltaY < 0) { // Swipe up
      showDateRange.value = true
    } else { // Swipe down
      showDateRange.value = false
    }
  }
}

const handleTouchEnd = () => {
  touchStart.value = { x: 0, y: 0 }
  touchEnd.value = { x: 0, y: 0 }
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
      @touchend="handleTouchEnd"
    >
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Transactions</h1>
      <div class="swipe-hint" :class="{ active: showDateRange }"></div>
    </header>

    <div class="scrollable-content">
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

    <div class="total-bar">
      <div v-if="Object.keys(groupedTransactions).length > 0" class="total-amount">
        <span :class="{ negative: totalAmount < 0 }">
          {{ formatCurrency(totalAmount) }}
        </span>
      </div>
    </div>

    <!-- Date Range Popup -->
    <Transition name="fade">
      <div v-if="showDateRange" class="date-range-popup" @click.self="showDateRange = false">
        <div class="date-range-content">
          <div class="date-inputs">
            <div class="date-field" @click="handleFromDateClick">
              <CalendarIcon :size="16" />
              <span>From: {{ formatDate(fromDate) }}</span>
            </div>
            <div class="date-field" @click="handleToDateClick">
              <CalendarIcon :size="16" />
              <span>To: {{ formatDate(toDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Calendar Popups -->
    <Transition name="fade">
      <div v-if="showFromCalendar || showToCalendar" class="calendar-popup" @click.self="closeCalendars">
        <div 
          class="calendar-wrapper"
          :style="{
            top: `${calendarTopPosition}px`,
            left: '50%',
            transform: 'translateX(-50%)'
          }"
        >
          <Calendar 
            v-if="showFromCalendar"
            :model-value="fromDate"
            :max-date="toDate"
            @update:model-value="(date) => { fromDate = date; showFromCalendar = false }"
            @monthChange="(date) => fromDate = date"
          />
          <Calendar 
            v-if="showToCalendar"
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  position: fixed;
  width: 85%;
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
  touch-action: none; /* Prevent browser touch actions */
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem;
  padding-top: 8rem; /* Make space for fixed header */
  padding-bottom: 8rem; /* Make space for total bar */
}

.total-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #222;
  padding: 1rem;
  z-index: 100;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.total-amount {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 500;
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
  color: #8e44ef;
}

.date-range-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  z-index: 1000;
}

.date-range-content {
  position: absolute;
  top: calc(64px + env(safe-area-inset-top, 20px));
  width: 90%;
  max-width: 400px;
  background: #111;
  border-radius: 12px;
  padding: 1rem;
  animation: slideIn 0.2s ease-out;
  border: 1px solid #333;
  z-index: 1001;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.date-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.date-field:hover {
  background: #222;
}

/* Update transition classes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Remove unused date-range styles */
.date-range {
  display: none;
}

.total-container {
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

.calendar-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  display: flex;
}

.calendar-wrapper {
  position: absolute;
  background: #111;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #333;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 1002; /* Above the backdrop blur */
}

@media (max-width: 480px) {
  .header {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.75rem 1rem;
    padding-top: 3rem
  }


  .total-bar {
    padding: 0.75rem 1rem;
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
