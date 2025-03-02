<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Menu, Settings } from 'lucide-vue-next'

import { useRouter } from 'vue-router'
import { getPrimaryAccountBalance, accounts, selectedCurrency } from '../stores/useStore'

const props = defineProps<{
  currentDate: Date
}>()

const emit = defineEmits<{
  (e: 'update:currentDate', value: Date): void
}>()

const showCalendar = ref(false)
const totalAmount = computed(() => {
  accounts.value // for reactivity
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(getPrimaryAccountBalance())
})

const handleCalendarUpdate = (date: Date) => {
  // Prevent selecting future dates
  if (date > new Date()) return
  
  emit('update:currentDate', date)
  showCalendar.value = false  // Only close calendar on date selection
}

const changeMonth = (delta: number) => {
  const newDate = new Date(props.currentDate)
  newDate.setMonth(newDate.getMonth() + delta)
  emit('update:currentDate', newDate) // Fixed from modelValue to currentDate
}

// ...rest of your existing script code...
</script>

// ...rest of the file remains unchanged...
