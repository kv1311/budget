<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Menu, Settings } from 'lucide-vue-next'
import Button from './ui/Button.vue'
import Calendar from './Calendar.vue'
import { useRouter } from 'vue-router'
import { getPrimaryAccountBalance, accounts, selectedCurrency } from '../stores/useStore'  // Add accounts import

const props = defineProps<{
  currentDate: Date
}>()

const emit = defineEmits<{
  (e: 'update:currentDate', value: Date): void
}>()

const showCalendar = ref(false)

// Make totalAmount reactive to accounts changes
const totalAmount = computed(() => {
  // Add accounts.value as a dependency to ensure reactivity
  accounts.value
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(getPrimaryAccountBalance())
})

const changeDate = (days: number) => {
  const newDate = new Date(props.currentDate)
  newDate.setDate(newDate.getDate() + days)
  
  // Prevent selecting future dates
  if (newDate > new Date()) return
  
  emit('update:currentDate', newDate)
}

const toggleCalendar = () => {
  showCalendar.value = !showCalendar.value
}

const selectDate = (date: Date) => {
  emit('update:currentDate', date)
  showCalendar.value = false
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const handleCalendarUpdate = (date: Date) => {
  // Prevent selecting future dates
  if (date > new Date()) return
  
  emit('update:currentDate', date)
  showCalendar.value = false
}

// Add computed for max date
const maxDate = computed(() => new Date())

const router = useRouter()

const toggleSettings = (event: MouseEvent) => {
  event.stopPropagation()
  router.push('/settings')
}

const toggleAllTransactions = (event: MouseEvent) => {
  event.stopPropagation()
  router.push('/all-transactions')
}
</script>

<template>
  <div class="top-bar">
    <div class="date-navigator">
      <Button variant="ghost" size="icon" @click="changeDate(-1)">
        <ChevronLeft :size="20" />
      </Button>
      
      <Button variant="outline" class="date-selector" @click="toggleCalendar">
        <CalendarIcon :size="16" class="calendar-icon" />
        <span>{{ formatDate(currentDate) }}</span>
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        @click="changeDate(1)"
        :disabled="currentDate.toDateString() === new Date().toDateString()"
      >
        <ChevronRight :size="20" />
      </Button>
    </div>

    <div class="amount">{{ totalAmount }}</div>

    <div class="actions">
      <Button variant="ghost" size="icon" @click="toggleAllTransactions">
        <Menu :size="24" />
      </Button>
      <Button variant="ghost" size="icon" @click="toggleSettings">
        <Settings :size="24" />
      </Button>
    </div>

    <Transition name="fade">
      <div v-if="showCalendar" class="calendar-popup" @click.self="showCalendar = false">
        <div class="calendar-wrapper">
          <Calendar 
            :model-value="currentDate"
            :max-date="maxDate"
            @update:model-value="handleCalendarUpdate"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 64px; /* Fixed height for consistency */
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background-color: #000;
  border-bottom: 1px solid #333;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.date-navigator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-selector {
  min-width: 200px;
  justify-content: flex-start;
  gap: 0.5rem;
}

.nav-btn, .action-btn, .date-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.nav-btn:hover, .action-btn:hover, .date-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.amount {
  font-size: 1.5rem;
  font-weight: bold;
  color: #42b883;
}

.actions {
  display: flex;
  gap: 1rem;
}

.calendar-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 80px;
  z-index: 1001; /* Above the top bar */
  overflow-y: auto;
}

.calendar-wrapper {
  position: relative;
  margin-top: 1rem;
  max-height: calc(100vh - 100px);
  animation: slideDown 0.2s ease-out;
}

/* Remove these global styles as they're no longer needed:
:root {
  --top-bar-height: 64px;
}

body {
  padding-top: var(--top-bar-height);
} */

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.calendar-content {
  background-color: #000;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  margin-bottom: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .top-bar {
    padding: 0 0.5rem;
    height: 56px;
    gap: 0.5rem;
  }

  .date-navigator {
    gap: 0.25rem;
  }

  .date-selector {
    min-width: 120px;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .amount {
    font-size: 1rem;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .button--icon {
    width: 32px;
    height: 32px;
    padding: 0.25rem;
  }

  .calendar-icon {
    display: none;
  }

  .calendar-popup {
    padding-top: 60px;
  }
}

@media (max-width: 380px) {
  .date-selector {
    min-width: 100px;
  }
}

.button--icon[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
