<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Button from './ui/Button.vue'

const props = defineProps<{
  modelValue: Date
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
}>()

const monthYear = computed(() => {
  return props.modelValue.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  const date = new Date(props.modelValue.getFullYear(), props.modelValue.getMonth() + 1, 0)
  return date.getDate()
})

const firstDayOfMonth = computed(() => {
  const date = new Date(props.modelValue.getFullYear(), props.modelValue.getMonth(), 1)
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
  const newDate = new Date(props.modelValue)
  newDate.setMonth(newDate.getMonth() + delta)
  emit('update:modelValue', newDate)
}

const selectDate = (day: number | null) => {
  if (day === null) return
  const newDate = new Date(props.modelValue)
  newDate.setDate(day)
  emit('update:modelValue', newDate)
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <Button variant="ghost" size="icon" @click="changeMonth(-1)">
        <ChevronLeft :size="20" />
      </Button>
      <span class="month-year">{{ monthYear }}</span>
      <Button variant="ghost" size="icon" @click="changeMonth(1)">
        <ChevronRight :size="20" />
      </Button>
    </div>
    <div class="calendar-grid">
      <div class="weekday" v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day">
        {{ day }}
      </div>
      <button
        v-for="(day, index) in days"
        :key="index"
        :class="['day', { 'current': day === props.modelValue.getDate() }]"
        @click="() => day !== null && selectDate(day)"
        :disabled="day === null"
      >
        {{ day }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  background: black;
  border-radius: 8px;
  padding: 1rem;
  width: 300px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.month-year {
  color: white;
  font-weight: 500;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekday {
  color: #666;
  font-size: 0.875rem;
  text-align: center;
  padding: 0.5rem;
}

.day {
  aspect-ratio: 1;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

.day:hover:not(:disabled) {
  background: #333;
}

.day.current {
  background: #42b883;
  font-weight: bold;
}

.day:disabled {
  opacity: 0;
  cursor: default;
}
</style>
