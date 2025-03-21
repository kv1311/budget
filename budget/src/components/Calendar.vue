<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Button from './ui/Button.vue'

const props = defineProps<{
  modelValue: Date,
  maxDate?: Date,
  minDate?: Date
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
  (e: 'monthChange', value: Date): void
}>()

const currentView = ref(new Date(props.modelValue))

const monthYear = computed(() => {
  return currentView.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  const date = new Date(currentView.value.getFullYear(), currentView.value.getMonth() + 1, 0)
  return date.getDate()
})

const firstDayOfMonth = computed(() => {
  const date = new Date(currentView.value.getFullYear(), currentView.value.getMonth(), 1)
  return date.getDay()
})

const days = computed(() => {
  const days = []
  for (let i = 0; i < firstDayOfMonth.value; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth.value; i++) {
    days.push(i)
  }
  return days
})

const changeMonth = (delta: number) => {
  const newDate = new Date(currentView.value)
  newDate.setMonth(newDate.getMonth() + delta)
  currentView.value = newDate
  emit('monthChange', newDate)
}

const selectDate = (day: number | null) => {
  if (day === null || isDateDisabled(day)) return
  const newDate = new Date(currentView.value)
  newDate.setDate(day)
  emit('update:modelValue', newDate)
}

// Add animation direction tracking
const slideDirection = ref('right')
const isAnimating = ref(false)

const handleMonthChange = (delta: number) => {
  if (isAnimating.value) return
  slideDirection.value = delta > 0 ? 'left' : 'right'
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
  changeMonth(delta)
}

const getIsCurrentDay = (day: number | null) => {
  if (!day) return false
  
  return day === props.modelValue.getDate() && 
         currentView.value.getMonth() === props.modelValue.getMonth() &&
         currentView.value.getFullYear() === props.modelValue.getFullYear()
}

const isDateDisabled = (day: number | null) => {
  if (!day) return false
  const date = new Date(currentView.value.getFullYear(), currentView.value.getMonth(), day)
  return date > new Date()
}

const canNavigateNext = computed(() => {
  const today = new Date()
  return currentView.value.getMonth() < today.getMonth() || 
         currentView.value.getFullYear() < today.getFullYear()
})
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <Button variant="ghost" size="icon" @click="handleMonthChange(-1)">
        <ChevronLeft :size="16" />
      </Button>
      <span :key="monthYear" class="month-year">{{ monthYear }}</span>
      <Button variant="ghost" size="icon" @click="handleMonthChange(1)" :disabled="!canNavigateNext">
        <ChevronRight :size="16" />
      </Button>
    </div>
    <div class="calendar-grid-container">
      <div class="weekdays">
        <div class="weekday" v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day">
          {{ day }}
        </div>
      </div>
      <div :key="monthYear" class="days-grid">
        <button
          v-for="(day, index) in days"
          :key="index"
          :class="['day', { 
            'current': getIsCurrentDay(day),
            'disabled': isDateDisabled(day)
          }]"
          @click="() => day !== null && selectDate(day)"
          :disabled="day === null || isDateDisabled(day)"
        >
          <span class="day-text">{{ day }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  background: black;
  border-radius: 8px;
  padding: 0.75rem;
  width: 280px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  height: 32px;
}

.month-year {
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  min-width: 120px;
  text-align: center;
}

.calendar-grid-container {
  position: relative;
  overflow: hidden;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.25rem;
  background: black;
}

.weekday {
  color: #666;
  font-size: 0.75rem;
  text-align: center;
  padding: 0.25rem;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  position: relative;
  background: black;
}

.day {
  aspect-ratio: 1;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  position: relative;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.day-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day:hover:not(:disabled) .day-text {
  background: #333;
}

.day.current .day-text {
  background: #42b883;
  font-weight: 500;
}

.day:disabled {
  opacity: 0;
  cursor: default;
}

/* Animation adjustments */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s ease-out;
  position: absolute;
  width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.day.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.day.disabled .day-text:hover {
  background: none;
}
</style>
