<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import ExpenseList from '../components/ExpenseList.vue'
import TopBar from '../components/TopBar.vue'
import AccountSuggestions from '../components/AccountSuggestions.vue'
import type { Account } from '../stores/useStore'
import { 
  transactions, 
  updateAccountBalance, 
  selectedCurrency,
  accounts,
  getPrimaryAccountBalance,
  addTransaction, // Add this import
  calculateTotalExcludingBlacklisted
} from '../stores/useStore'

interface Expense {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
}

const inputValue = ref('')
const currentDate = ref(new Date()) // Add this

const parseExpense = (input: string): Partial<Expense> | null => {
  const amountMatch = input.match(/(\d+(\.\d{1,2})?)/)?.[0]
  if (!amountMatch) return null
  
  // Remove amount from input before parsing description
  const inputWithoutAmount = input.replace(amountMatch, '').trim()
  const description = inputWithoutAmount.match(/^([^:#]+)/)?.[1]?.trim()
  const accountMatch = input.match(/:([^\s#]+)/)
  const category = input.match(/#(\S+)/)?.[1]

  if (!description) return null

  return {
    amount: parseFloat(amountMatch),
    description,
    account: accountMatch ? accountMatch[1].trim() : undefined,
    category: category || 'uncategorized'
  }
}

const showAccountSuggestions = ref(false)
const selectedAccountIndex = ref(0)
const cursorPosition = ref(0)
const inputElement = ref<HTMLInputElement | null>(null)

const filteredAccounts = computed(() => {
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex === -1) return []
  
  const query = inputValue.value.slice(colonIndex + 1)
  return accounts.value.filter(account => 
    account.name.includes(query)
  )
})

const handleInput = (event: KeyboardEvent) => {
  if (event.key === ':') {
    showAccountSuggestions.value = true
    selectedAccountIndex.value = 0
    cursorPosition.value = inputElement.value?.selectionStart || 0
    return
  }

  if (showAccountSuggestions.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedAccountIndex.value = (selectedAccountIndex.value + 1) % filteredAccounts.value.length
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedAccountIndex.value = selectedAccountIndex.value - 1
      if (selectedAccountIndex.value < 0) {
        selectedAccountIndex.value = filteredAccounts.value.length - 1
      }
    } else if (event.key === 'Enter' && filteredAccounts.value.length > 0) {
      event.preventDefault()
      selectAccount(filteredAccounts.value[selectedAccountIndex.value])
    } else if (event.key === 'Escape') {
      showAccountSuggestions.value = false
    }
  } else if (event.key === 'Enter') {
    // Original enter handling for expense submission
    handleExpenseSubmit()
  }
}

const selectAccount = (account: Account) => {
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex === -1) return

  // Find the next space after the colon
  const nextSpaceIndex = inputValue.value.indexOf(' ', colonIndex)
  const textAfterAccount = nextSpaceIndex !== -1 
    ? inputValue.value.slice(nextSpaceIndex) 
    : ''

  // Replace from colon to next space (or end) and append any remaining text
  inputValue.value = 
    inputValue.value.slice(0, colonIndex) + 
    ':' + account.name +
    textAfterAccount
    
  showAccountSuggestions.value = false
  
  // Keep input focused and move cursor to end
  nextTick(() => {
    inputElement.value?.focus()
    const newCursorPosition = inputValue.value.length
    inputElement.value?.setSelectionRange(newCursorPosition, newCursorPosition)
  })
}

// Move original Enter key handling to a separate function
const handleExpenseSubmit = () => {
  const parsed = parseExpense(inputValue.value)
  if (!parsed || !parsed.description || !parsed.amount) return

  // Find the specified account - add debug logging
  let accountToUse = null
  if (parsed.account) {
    accountToUse = accounts.value.find(a => a.name === parsed.account)
    if (!accountToUse) {
      console.log('Looking for account:', parsed.account)
      console.log('Available accounts:', accounts.value.map(a => a.name))
      console.error('Specified account not found')
      return
    }
  } else {
    // If no account specified, use primary account or first account
    accountToUse = accounts.value.find(a => a.isPrimary) || accounts.value[0]
    if (!accountToUse) {
      console.error('No valid account found')
      return
    }
  }

  // Use the addTransaction function from store
  addTransaction({
    date: currentDate.value,
    description: parsed.description,
    amount: -parsed.amount,
    category: parsed.category || 'uncategorized',
    account: accountToUse.name,
    currency: selectedCurrency.value.code
  })
  
  inputValue.value = ''
}

// Update placeholder to show current currency
const inputPlaceholder = computed(() => 
  `Enter expense (e.g. ${selectedCurrency.value.symbol}50.00 Groceries :account #food)`
)

const handleAddExpense = (expenseData: any) => {
  transactions.value.push({
    id: Date.now(),
    date: currentDate.value,
    currency: selectedCurrency.value.code, // Add currency here too
    ...expenseData
  })
}

const filteredExpenses = computed(() => {
  if (!currentDate.value) return transactions.value

  const selectedDate = new Date(currentDate.value)
  const selectedDateString = selectedDate.toDateString()
  
  const filtered = transactions.value.filter(transaction => {
    const txDate = new Date(transaction.date)
    return txDate.toDateString() === selectedDateString
  })

  return filtered
})

const displayTotal = computed(() => {
  return calculateTotalExcludingBlacklisted(filteredExpenses.value)
})

// Add new computed property for monthly total
const monthlyTotal = computed(() => {
  return calculateTotalExcludingBlacklisted(monthlyExpenses.value)
})

// Add state for showing monthly total
const showMonthlyTotal = ref(false)

const toggleTotalDisplay = () => {
  showMonthlyTotal.value = !showMonthlyTotal.value
}

// Add new computed property for monthly expenses
const monthlyExpenses = computed(() => {
  if (!currentDate.value) return transactions.value

  const selectedDate = new Date(currentDate.value)
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()

  return transactions.value.filter(transaction => {
    const txDate = new Date(transaction.date)
    return txDate.getMonth() === currentMonth && 
           txDate.getFullYear() === currentYear
  })
})

const hasExpenses = computed(() => transactions.value.length > 0)
</script>

<template>
  <div class="home">
    <TopBar class="top-bar"
      :current-date="currentDate"
      @update:current-date="currentDate = $event"
    />
    <main class="content">
      <!-- Make the list scrollable -->
      <div class="scrollable-container">
        <div v-if="!hasExpenses" class="empty-state">
          <p>No expenses yet. Start by entering an expense below.</p>
          <p class="format-hint">Format: amount description :account #category</p>
          <p class="examples">
            Examples:<br>
            25.99 Lunch :cash #food<br>
            99 Netflix :credit #entertainment<br>
            12.50 Coffee #drinks :debit
          </p>
        </div>
        <div v-else class="expense-list-container">
          <ExpenseList 
            :expenses="monthlyExpenses" 
            :selected-date="currentDate"
          />
        </div>
      </div>

      <!-- Fixed bottom section with total and input -->
      <div class="bottom-section">
        <div class="total-display" @click="toggleTotalDisplay">
          <Transition name="fade" mode="out-in">
            <span v-if="!showMonthlyTotal" :key="'daily'">
              Today: {{ selectedCurrency.symbol }}{{ Math.abs(displayTotal).toFixed(2) }}
            </span>
            <span v-else :key="'monthly'">
              Month: {{ selectedCurrency.symbol }}{{ Math.abs(monthlyTotal).toFixed(2) }}
            </span>
          </Transition>
        </div>

        <div class="input-container">
          <input
            ref="inputElement"
            v-model="inputValue"
            @keydown="handleInput"
            @click.stop
            :placeholder="inputPlaceholder"
            class="expense-input"
          />
          <AccountSuggestions
            v-if="showAccountSuggestions && filteredAccounts.length > 0"
            :accounts="filteredAccounts"
            :selected-index="selectedAccountIndex"
            @select="selectAccount"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home {
  height: 100vh;
  width: 100%;
  position: fixed;
  display: flex;
  flex-direction: column;
  background: #000; 
}
.top-bar {
  position: relative;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + 2rem);
  padding-bottom: 2rem;
  z-index: 1000;
  padding-left: 1rem;
  padding-right: 1rem;
  background: #000; /* Ensure background is solid */
  border-bottom: none; /* Remove any border if present */
}

.content {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.scrollable-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  padding-top: calc(1rem + env(safe-area-inset-top, 3rem)); /* Adjust padding to account for TopBar */
  padding-bottom: env(safe-area-inset-bottom, 20px);
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

.bottom-section {
  position: sticky;
  bottom: 0;
  background: #000;
  padding-bottom: env(safe-area-inset-bottom, 20px);
  border-top: 1px solid #222;
}

.total-display {
  text-align: right;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  font-weight: 500;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 40px;
}

.input-container {
  background: #000;
  padding: 0.5rem 1rem;
  position: relative; /* For account suggestions positioning */
}

.expense-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: transparent;
  border: none;
  color: white;
  height: 50px;
  box-sizing: border-box;
  font-family: var(--font-family);
  padding-bottom: 4rem;
}

.expense-input:focus {
  outline: none;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.format-hint {
  margin-top: 1rem;
  color: #42b883;
}

.examples {
  margin-top: 2rem;
  line-height: 1.8;
  color: #888;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .total-display {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

@media (min-width: 768px) {
  .content {
    flex-direction: row;
    align-items: flex-start;
  }
}
</style>