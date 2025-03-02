<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import ExpenseList from '../components/ExpenseList.vue'
import TopBar from '../components/TopBar.vue'
import AccountSuggestions from '../components/AccountSuggestions.vue'
import type { Account } from '../stores/useStore'  // Add this line
import { 
  transactions, 
  updateAccountBalance, 
  selectedCurrency,
  accounts,
  getPrimaryAccountBalance 
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
  const amount = input.match(/(\d+(\.\d{1,2})?)/)?.[0]
  const description = input.match(/(?:^|\s)(?!:\S|#\S)([^#:]+?)(?=\s+[:#]|$)/)?.[1]?.trim()
  const accountMatch = input.match(/:([^\s#]+)/)  // Modified regex
  const category = input.match(/#(\S+)/)?.[1]

  if (!amount || !description) return null

  return {
    amount: parseFloat(amount),
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

  const newTransaction = {
    id: Date.now(),
    date: currentDate.value,
    description: parsed.description,
    amount: -parsed.amount,
    category: parsed.category || 'uncategorized',
    account: accountToUse.name,
    currency: selectedCurrency.value.code
  }
  
  transactions.value.push(newTransaction)
  
  // Update the balance for the specified account
  updateAccountBalance(accountToUse.name, -parsed.amount)
  
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
  return transactions.value.filter(transaction => 
    transaction.date.toDateString() === currentDate.value.toDateString()
  )
})

const hasExpenses = computed(() => transactions.value.length > 0)
</script>

<template>
  <div class="home">
    <TopBar 
      :current-date="currentDate"
      @update:current-date="currentDate = $event"
    />
    <main class="content">
      <div class="home-screen">
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
        <div v-else class="content">
          <ExpenseList 
            :expenses="filteredExpenses" 
            :selected-date="currentDate"
          />
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
  min-height: 100vh;
  background-color: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: 0;
  margin-top: 64px;
}

@media (max-width: 768px) {
  .content {
    margin-top: 15px;
    padding: 0;
  }
}

.home-screen {
  max-width: 100%; /* Remove max-width constraint */
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap between elements */
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.input-container {
  position: sticky;
  bottom: 0;
  background: #000;
  padding: 0.5rem;
  border-top: 1px solid #222;
  margin-top: 0; /* Remove auto margin */
  position: relative;
}

.expense-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: transparent;
  border: none;  /* Remove border */
  color: white;
  height: 40px;
  box-sizing: border-box;
  font-family: var(--font-family);
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

@media (min-width: 768px) {
  .content {
    flex-direction: row;
    align-items: flex-start;
  }
}
</style>
