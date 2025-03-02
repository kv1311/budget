<script setup lang="ts">
import { computed, ref, nextTick, onUnmounted } from 'vue'
import { currencies, selectedCurrency, expenses, moveToDeleted, updateAccountBalance, formatAmount} from '../stores/useStore'
import { Edit2, Trash2 } from 'lucide-vue-next'

interface Expense {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
  currency: string;
  account: string;
}

const props = defineProps<{
  expenses: Expense[];
  selectedDate?: Date;
  hideTotal?: boolean; // Add this prop
}>()

const formattedAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const filteredExpenses = computed(() => {
  if (!props.selectedDate) return props.expenses

  return props.expenses.filter(expense => {
    const expenseDate = new Date(expense.date)
    return expenseDate.toDateString() === props.selectedDate?.toDateString()
  })
})

const totalSpend = computed(() => {
  return filteredExpenses.value.reduce((total, expense) => total + expense.amount, 0)
})

// Remove the local formatAmount function since we're now using the one from the store

const formatAccountName = (accountName: string) => {
  return accountName || 'Unknown Account'
}

const touchStart = ref({ x: 0, y: 0 })
const swipeOffset = ref<Record<number, number>>({})
const swipeThreshold = 50
const maxSwipe = 80

const handleTouchStart = (e: TouchEvent, expenseId: number) => {
  touchStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  }
  if (!(expenseId in swipeOffset.value)) {
    swipeOffset.value[expenseId] = 0
  }
}

const handleTouchMove = (e: TouchEvent, expenseId: number) => {
  const deltaX = e.touches[0].clientX - touchStart.value.x
  const deltaY = Math.abs(e.touches[0].clientY - touchStart.value.y)

  if (deltaY < 30) {
    e.preventDefault()
    const newOffset = Math.min(Math.max(deltaX, -maxSwipe), maxSwipe)
    swipeOffset.value[expenseId] = newOffset
  }
}

const handleTouchEnd = (e: TouchEvent, expenseId: number) => {
  const currentOffset = swipeOffset.value[expenseId] || 0

  if (Math.abs(currentOffset) > swipeThreshold) {
    swipeOffset.value[expenseId] = currentOffset > 0 ? maxSwipe : -maxSwipe
  } else {
    swipeOffset.value[expenseId] = 0
  }
}

const closeSwipe = (expenseId: number) => {
  swipeOffset.value[expenseId] = 0
}

const handleDelete = (transactionId: number) => {
  moveToDeleted(transactionId)
}

// Add new refs for editing
const editingId = ref<number | null>(null)
const editValue = ref('')
const editInput = ref<HTMLInputElement | null>(null)

// Add edit handling functions
const startEdit = (expense: Expense) => {
  editingId.value = expense.id
  editValue.value = `${Math.abs(expense.amount)} ${expense.description} ${expense.account ? ':' + expense.account : ''} ${expense.category ? '#' + expense.category : ''}`
  
  // Focus input on next tick
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus()
    }
  })
}

const cancelEdit = () => {
  editingId.value = null
  editValue.value = ''
}

const saveEdit = (originalExpense: Expense) => {
  const parsed = parseExpense(editValue.value)
  if (!parsed) {
    cancelEdit()
    return
  }

  const index = expenses.value.findIndex(e => e.id === originalExpense.id)
  if (index !== -1) {
    const updatedExpense: Expense = {  // Explicitly type as Expense
      ...originalExpense,
      description: parsed.description!,
      amount: -Math.abs(parsed.amount!),
      category: parsed.category || 'uncategorized', // Ensure category is always a string
      account: parsed.account || originalExpense.account,
      currency: originalExpense.currency,
      date: originalExpense.date,
      id: originalExpense.id
    }
    
    expenses.value[index] = updatedExpense
    
    if (parsed.account && parsed.account !== originalExpense.account) {
      updateAccountBalance(originalExpense.account, originalExpense.amount)
      updateAccountBalance(parsed.account, -parsed.amount!)
    }
  }

  editingId.value = null
  editValue.value = ''
}

// Add parsing function (similar to ExpenseInput)
const parseExpense = (input: string): Partial<Expense> | null => {
  const amount = input.match(/(\d+(\.\d{1,2})?)/)?.[0]
  const description = input.match(/(?:^|\s)(?!:\S|#\S)([^#:]+?)(?=\s+[:#]|$)/)?.[1]?.trim()
  const accountMatch = input.match(/:([^\s#]+)/)
  const category = input.match(/#(\S+)/)?.[1]

  if (!amount || !description) return null

  return {
    amount: parseFloat(amount),
    description,
    account: accountMatch ? accountMatch[1].trim() : '',
    category: category || 'uncategorized', // Ensure category is always a string
  }
}

// Update handleEdit to start editing
const handleEdit = (id: number) => {
  const expense = props.expenses.find(exp => exp.id === id)
  if (expense) {
    startEdit(expense)
  }
  closeSwipe(id)
}

// Add keyboard event handler for the edit input
const handleEditKeydown = (e: KeyboardEvent, expense: Expense) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveEdit(expense)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

// Add computed for monthly total
const monthlyTotal = computed(() => {
  if (!props.selectedDate) return 0
  
  const currentMonth = props.selectedDate.getMonth()
  const currentYear = props.selectedDate.getFullYear()
  
  return props.expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear
    })
    .reduce((total, expense) => total + expense.amount, 0)
})

// Add state for total display
const showMonthlyTotal = ref(false)
const totalResetTimeout = ref<number | null>(null)

const handleTotalSwipe = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  showMonthlyTotal.value = !showMonthlyTotal.value
  
  // Clear existing timeout if any
  if (totalResetTimeout.value) {
    window.clearTimeout(totalResetTimeout.value)
  }
  
  // Reset to daily total after 4 seconds
  totalResetTimeout.value = window.setTimeout(() => {
    showMonthlyTotal.value = false
  }, 4000)
}

// Clean up timeout on component unmount
onUnmounted(() => {
  if (totalResetTimeout.value) {
    window.clearTimeout(totalResetTimeout.value)
  }
})
</script>

<template>
  <!-- Remove the duplicate input field and total section -->
  <div v-if="editingId" class="edit-hint">
    Editing expense... Escape to cancel
    <button @click="cancelEdit" class="cancel-edit">X</button>
  </div>
  
  <div class="expense-list">
    <TransitionGroup name="list">
      <div
        v-for="expense in filteredExpenses"
        :key="expense.id"
        class="expense-container"
      >
        <div class="swipe-actions left">
          <button class="edit-action" @click="handleEdit(expense.id)">
            <Edit2 :size="24" />
          </button>
        </div>
        
        <div class="swipe-actions right">
          <button class="delete-action" @click="handleDelete(expense.id)">
            <Trash2 :size="24" />
          </button>
        </div>
        
        <div
          class="expense-item"
          :style="{
            transform: `translateX(${swipeOffset[expense.id] ?? 0}px)`,
          }"
          @touchstart="(e) => handleTouchStart(e, expense.id)"
          @touchmove="(e) => handleTouchMove(e, expense.id)"
          @touchend="(e) => handleTouchEnd(e, expense.id)"
        >
          <template v-if="editingId === expense.id">
            <input
              ref="editInput"
              v-model="editValue"
              class="edit-input"
              @keydown="(e) => handleEditKeydown(e, expense)"
              @blur="cancelEdit"
            />
          </template>
          <div v-else class="expense-layout">
            <div class="expense-amount">
              <span :class="{ income: expense.amount > 0, expense: expense.amount < 0 }">
                {{ formatAmount(expense.amount, expense.currency) }}
              </span>
            </div>
            <div class="expense-content">
              <div class="description">{{ expense.description }}</div>
              <div class="category" v-if="expense.category">#{{ expense.category }}</div>
            </div>
            <div class="expense-account">
              <span class="account-name">{{ formatAccountName(expense.account) }}</span>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>

  <div 
    v-if="filteredExpenses.length > 0 && !hideTotal" 
    class="total-spend"
    @touchstart="handleTotalSwipe"
  >
    <TransitionGroup name="flip">
      <span v-if="!showMonthlyTotal" :key="'daily'" class="total-amount">
        {{ formatAmount(totalSpend, selectedCurrency.code) }}
      </span>
      <span v-else :key="'monthly'" class="total-amount">
        Month: {{ formatAmount(monthlyTotal, selectedCurrency.code) }}
      </span>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.expense-list {
  background: black;
  width: 100%;
}

.expense-container {
  position: relative;
  background: transparent;
  overflow: hidden;
}

.expense-item {
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

.expense-layout {
  display: grid;
  grid-template-areas: "amount content account";
  grid-template-columns: minmax(80px, auto) 1fr minmax(80px, auto);
  gap: 0.75rem;
  width: 100%;
  align-items: center;
}

.expense-amount {
  grid-area: amount;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.5;
  white-space: nowrap;
}

.income {
  color: #42b883;
}

.expense {
  color: #ef4444;
}

.expense-content {
  grid-area: content;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.description {
  color: white;
  font-size: 0.9375rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category {
  color: #666;
  font-size: 0.75rem;
  line-height: 1;
}

.expense-account {
  grid-area: account;
  text-align: right;
  overflow: hidden;
}

.account-name {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Swipe actions styling */
.swipe-actions {
  position: absolute;
  top: 0;
  height: 100%;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: opacity 0.2s ease;
}

.swipe-actions.left {
  left: 0;
  background: linear-gradient(to right, #2563eb, #2563ebcc);
}

.swipe-actions.right {
  right: 0;
  background: linear-gradient(to left, #dc2626, #dc2626cc);
}

.edit-action,
.delete-action {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  color: white;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s ease;
}

.edit-action:hover,
.delete-action:hover {
  transform: scale(1.2);
}

@media (max-width: 480px) {
  .expense-item {
    padding: 0.625rem 0.875rem;
  }
  
  .expense-layout {
    grid-template-columns: minmax(70px, auto) 1fr minmax(70px, auto);
    gap: 0.5rem;
  }

  .expense-amount {
    font-size: 0.875rem;
  }

  .description {
    font-size: 0.875rem;
  }

  .category {
    font-size: 0.6875rem;
  }

  .account-name {
    font-size: 0.8;
  }
}

/* List transition animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expense-item:last-child {
  border-bottom: none;
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
  background: #2563eb;
}

.swipe-actions.right {
  right: 0;
  background: #dc2626;
}

.edit-action:hover,
.delete-action:hover {
  transform: scale(1.1);
}

.edit-hint {
  position: fixed;
  bottom: calc(var(--keyboard-height, 0px) + 60px);
  left: 0;
  right: 0;
  background: #2563eb;
  color: white;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  z-index: 100;
}

.cancel-edit {
  background: transparent;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 1rem;
}

.edit-input {
  width: 100%;
  padding: 0.75rem;
  background: #111;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 0.9375rem;
  font-family: inherit;
}

.edit-input:focus {
  outline: none;
  background: #1a1a1a;
}

.total-spend {
  position: fixed;
  bottom: calc(var(--keyboard-height, 0px) + 70px);
  right: 1rem;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  min-width: 120px;
  text-align: right;
  touch-action: pan-x;
}

.total-amount {
  display: inline-block;
}

/* Flip animation for total switch */
.flip-enter-active,
.flip-leave-active {
  transition: all 0.3s ease-out;
}

.flip-enter-from {
  opacity: 0;
  transform: rotateX(90deg);
}

.flip-leave-to {
  opacity: 0;
  transform: rotateX(-90deg);
}

.flip-move {
  transition: transform 0.3s ease-out;
}

@media (max-width: 480px) {
  .total-spend {
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
  }
}
</style>
