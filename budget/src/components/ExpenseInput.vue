<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { selectedCurrency, accounts, formatAmount } from '../stores/useStore'
import type { Expense, Account } from '../stores/useStore'
import AccountSuggestions from './AccountSuggestions.vue'

const props = defineProps<{
  expenses: Expense[]
}>()

const emit = defineEmits<{
  (e: 'submit', expense: Partial<Expense>): void
}>()

const inputValue = ref('')
const showAccountSuggestions = ref(false)
const selectedAccountIndex = ref(0)

// Add watcher for account suggestions
watch(inputValue, (newValue) => {
  const colonIndex = newValue.lastIndexOf(':')
  if (colonIndex !== -1 && colonIndex === newValue.length - 1) {
    showAccountSuggestions.value = true
    selectedAccountIndex.value = 0
  } else {
    showAccountSuggestions.value = false
  }
})

// Add keyboard navigation for suggestions
const handleKeydown = (e: KeyboardEvent) => {
  if (!showAccountSuggestions.value) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedAccountIndex.value = (selectedAccountIndex.value + 1) % filteredAccounts.value.length
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedAccountIndex.value = selectedAccountIndex.value - 1 < 0 
        ? filteredAccounts.value.length - 1 
        : selectedAccountIndex.value - 1
      break
    case 'Enter':
      e.preventDefault()
      if (filteredAccounts.value[selectedAccountIndex.value]) {
        handleAccountSelect(filteredAccounts.value[selectedAccountIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      showAccountSuggestions.value = false
      break
  }
}

// Update placeholder to show better examples
const placeholder = computed(() => 
  `Start typing (e.g. "Coffee 5 :cash #food" or "Salary +1000 :bank")`
)

const filteredAccounts = computed(() => {
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex === -1) return []
  
  const query = inputValue.value.slice(colonIndex + 1).toLowerCase()
  return accounts.value.filter(account => 
    account.name.toLowerCase().includes(query)
  )
})

const handleAccountSelect = (account: Account) => {
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex === -1) return

  const nextSpaceIndex = inputValue.value.indexOf(' ', colonIndex)
  const textAfterAccount = nextSpaceIndex !== -1 
    ? inputValue.value.slice(nextSpaceIndex) 
    : ''

  inputValue.value = 
    inputValue.value.slice(0, colonIndex) + 
    ':' + account.name +
    textAfterAccount
    
  showAccountSuggestions.value = false
}

const parseExpense = (input: string): Partial<Expense> | null => {
  // Match amount at the start OR after a space followed by optional + or -
  const amountMatch = input.match(/^([+-]?\d+(\.\d{1,2})?)|(?<=\s)([+-]?\d+(\.\d{1,2})?)/)?.[0]
  // Match description after amount and space, until : or #
  const description = input.replace(amountMatch || '', '')
    .match(/^\s*([^:#]+?)(?=\s+[:#]|$)/)?.[1]?.trim()
  const accountMatch = input.match(/:([^\s#]+)/)
  const category = input.match(/#(\S+)/)?.[1]

  if (!amountMatch || !description) return null

  const amount = parseFloat(amountMatch)
  const finalAmount = amountMatch.startsWith('+') ? amount : -Math.abs(amount)

  return {
    amount: finalAmount,
    description,
    account: accountMatch ? accountMatch[1].trim() : '',
    category: category || 'uncategorized'
  }
}

const handleSubmit = () => {
  const expense = parseExpense(inputValue.value)
  if (expense) {
    emit('submit', expense)
    inputValue.value = ''
  }
}
</script>

<template>
  <div 
    class="expense-input-container"
    :style="{ top: props.expenses.length > 0 ? '0' : 'auto' }"
  >
    <div class="input-wrapper">
      <input
        v-model="inputValue"
        type="text"
        :placeholder="placeholder"
        class="expense-input"
        @keyup.enter="handleSubmit"
        @keydown="handleKeydown"
      />
      <div v-if="showAccountSuggestions" class="suggestions-container">
        <div
          v-for="(account, index) in filteredAccounts"
          :key="account.id"
          class="suggestion-item"
          :class="{ selected: index === selectedAccountIndex }"
          @click="handleAccountSelect(account)"
        >
          <span class="account-name">{{ account.name }}</span>
          <span class="account-balance">{{ formatAmount(account.balance) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expense-input-container {
  background: #000;
  border-top: 1px solid #222;
  padding: 0.75rem 0;
  position: sticky;
  width: 100%;
  z-index: 10;
  transition: top 0.3s ease;
}

.input-wrapper {
  max-width: 768px;
  margin: 0 auto;
  padding: 0 1rem;
  position: relative;
}

.expense-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: transparent;
  border: none;
  color: white;
  height: 40px;
  box-sizing: border-box;
}

.expense-input:focus {
  outline: none;
}

@media (min-width: 768px) {
  .input-wrapper {
    padding: 0 2rem;
  }
}

.suggestions-container {
  position: absolute;
  top: 100%;
  left: 1rem;
  right: 1rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: #222;
}

.account-name {
  color: white;
  font-size: 0.875rem;
}

.account-balance {
  color: #666;
  font-size: 0.75rem;
}

@media (min-width: 768px) {
  .suggestions-container {
    left: 2rem;
    right: 2rem;
  }
}
</style>
