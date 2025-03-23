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

const touchStart = ref<number | null>(null)
const touchEnd = ref<number | null>(null)
const minSwipeDistance = 50

const handleTouchStart = (e: TouchEvent) => {
  touchStart.value = e.touches[0].clientX
  touchEnd.value = null
}

const handleTouchMove = (e: TouchEvent) => {
  touchEnd.value = e.touches[0].clientX
}

const handleTouchEnd = () => {
  if (!touchStart.value || !touchEnd.value) return

  const distance = touchEnd.value - touchStart.value
  const isSwipe = Math.abs(distance) > minSwipeDistance

  if (isSwipe) {
    if (distance > 0) {
      changeDate(-1) // Swipe right = previous day
    } else {
      changeDate(1)  // Swipe left = next day
    }
  }

  touchStart.value = null
  touchEnd.value = null
}
</script>

<template>
  <div class="top-bar">
    <div class="date-navigator">
      <Button 
        variant="outline" 
        class="date-selector" 
        @click="toggleCalendar"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <CalendarIcon :size="16" class="calendar-icon" />
        <span>{{ formatDate(currentDate) }}</span>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 3rem;
  background-color: #000;
  border-bottom: 1px solid #222;
  padding: 0 0.5rem;
  gap: 0.5rem;
}

.date-navigator {
  display: flex;
  align-items: center;
  gap: 0 rem; /* Reduced gap between arrows and date */
  flex-shrink: 0;
}

.date-selector {
  min-width: auto; /* Allow button to shrink */
  padding: 0 1rem;
  touch-action: pan-y pinch-zoom;
  user-select: none;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.date-selector::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  opacity: 0.5;
  border-radius: 1px;
}

.amount {
  font-size: 1.25rem; /* Slightly smaller font */
  font-weight: bold;
  color: #42b883;
  flex: 1;
  text-align: center;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding-top: calc(64px + env(safe-area-inset-top, 20px)); /* Fallback added */
  z-index: 1001;
  overflow-y: auto;
}

.calendar-wrapper {
  position: relative;
  margin-top: 1rem;
  max-height: calc(100vh - 100px);
  animation: slideDown 0.2s ease-out;
}

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
    padding: 0 0.25rem;
  }

  .date-selector {
    font-size: 0.875rem;
  }

  .amount {
    font-size: 1rem;
  }

  .button--icon {
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
  }

  .date-selector {
    min-width: 110px;
    padding: 0.25rem;
    font-size: 0.875rem;
  }

  .amount {
    font-size: 1rem;
    max-width: 150px; /* Adjusted max-width for mobile */
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
    padding: 0.35rem;
  }

  .calendar-icon {
    display: none;
  }

  .calendar-popup {
    padding-top: calc(56px + env(safe-area-inset-top, 20px));
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
