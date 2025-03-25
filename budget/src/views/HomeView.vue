<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
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
  addTransaction,
  calculateTotalExcludingBlacklisted
} from '../stores/useStore'
import { Keyboard } from '@capacitor/keyboard'

interface Expense {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  isCredit?: boolean; // Add this optional property
}

const inputValue = ref('')
const currentDate = ref(new Date())
const isKeyboardVisible = ref(false)
const keyboardHeight = ref(0)

// Setup Capacitor Keyboard listeners with dynamic height
onMounted(() => {
  Keyboard.addListener('keyboardWillShow', (info) => {
    isKeyboardVisible.value = true
    // The info object contains the keyboard height in pixels
    keyboardHeight.value = info.keyboardHeight || 0
    
    // Apply keyboard height as CSS variable for styling
    document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight.value}px`)
  })
  
  Keyboard.addListener('keyboardDidShow', (info) => {
    // Sometimes the height is more accurate in didShow event
    if (info.keyboardHeight && info.keyboardHeight !== keyboardHeight.value) {
      keyboardHeight.value = info.keyboardHeight
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight.value}px`)
    }
  })
  
  Keyboard.addListener('keyboardWillHide', () => {
    isKeyboardVisible.value = false
    keyboardHeight.value = 0
  })
})

onUnmounted(() => {
  // Remove listeners when component is unmounted
  Keyboard.removeAllListeners()
})

const parseExpense = (input: string): Partial<Expense> | null => {
  const trimmedInput = input.trim();
  const tokens = trimmedInput.split(/\s+/).filter(Boolean);
  
  let amount: number | null = null;
  let category: string | null = null;
  let account: string | null = null;
  let descriptionTokens: string[] = [];
  let isCredit = false;

  tokens.forEach((token) => {
    if (token.startsWith('+')) {
      isCredit = true;
      const numericValue = parseFloat(token.slice(1));
      if (!isNaN(numericValue)) {
        amount = numericValue;
      }
    } else if (!isNaN(Number(token))) {
      amount = parseFloat(token);
    } else if (token.startsWith('#')) {
      category = token.slice(1).trim();
    } else if (token.startsWith(':')) {
      account = token.slice(1).trim();
    } else {
      descriptionTokens.push(token);
    }
  });

  const description = descriptionTokens.join(' ').trim();

  // Validate: amount and description are required
  if (!amount || !description) {
    return null;
  }

  // Validate: credit transactions must specify an account
  if (isCredit && !account) {
    console.error('Account must be specified for credit transactions');
    return null;
  }

  return {
    amount: isCredit ? amount : -amount, // Only negate for debits
    category: category || 'uncategorized',
    account: account || undefined,
    description,
    isCredit // Add this flag for later use
  };
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
  // Check if we're in an account input context (after a colon)
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex !== -1) {
    showAccountSuggestions.value = true
    selectedAccountIndex.value = 0
    cursorPosition.value = inputElement.value?.selectionStart || 0
  } else {
    showAccountSuggestions.value = false
  }

  if (event.key === ':') {
    showAccountSuggestions.value = true
    selectedAccountIndex.value = 0
    cursorPosition.value = inputElement.value?.selectionStart || 0
    return
  }

  if (event.key === 'Enter') {
    // If there are account suggestions and one is selected, use it
    if (showAccountSuggestions.value && filteredAccounts.value.length > 0) {
      selectAccount(filteredAccounts.value[selectedAccountIndex.value])
      showAccountSuggestions.value = false
    }
    // Always try to submit after handling suggestions
    handleExpenseSubmit()
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
    } else if (event.key === 'Escape') {
      showAccountSuggestions.value = false
    }
  }
}

// Add a new method to watch input changes
const onInputChange = () => {
  const colonIndex = inputValue.value.lastIndexOf(':')
  if (colonIndex !== -1) {
    showAccountSuggestions.value = true
    selectedAccountIndex.value = 0
  } else {
    showAccountSuggestions.value = false
  }
}

const selectAccount = (account: Account) => {
  const colonIndex = inputValue.value.lastIndexOf(':');
  if (colonIndex === -1) return;

  // Find the next space after the colon
  const nextSpaceIndex = inputValue.value.indexOf(' ', colonIndex);
  const textAfterAccount = nextSpaceIndex !== -1 
    ? inputValue.value.slice(nextSpaceIndex) 
    : '';

  // Replace from colon to next space (or end) and append any remaining text
  inputValue.value = 
    inputValue.value.slice(0, colonIndex) + 
    ':' + account.name +
    textAfterAccount;

  showAccountSuggestions.value = false;

  // Keep input focused and move cursor to end
  nextTick(() => {
    inputElement.value?.focus();
    const newCursorPosition = inputValue.value.length;
    inputElement.value?.setSelectionRange(newCursorPosition, newCursorPosition);
  });
}

// Move original Enter key handling to a separate function
const handleExpenseSubmit = () => {
  const parsed = parseExpense(inputValue.value);
  if (!parsed || !parsed.description || parsed.amount === undefined) return;

  // Find the specified account
  let accountToUse = null;
  if (parsed.account) {
    accountToUse = accounts.value.find(a => a.name === parsed.account);
    if (!accountToUse) {
      console.error(`Specified account "${parsed.account}" not found`);
      return;
    }
  } else {
    // Only use default account for debits
    if (parsed.amount < 0) {
      accountToUse = accounts.value.find(a => a.isPrimary) || accounts.value[0];
      if (!accountToUse) {
        console.error('No valid account found');
        return;
      }
    } else {
      console.error('Account must be specified for credit transactions');
      return;
    }
  }

  // Add the transaction
  addTransaction({
    date: currentDate.value,
    description: parsed.description,
    amount: parsed.amount, // Use the amount directly (already signed correctly)
    category: parsed.category || 'uncategorized',
    account: accountToUse.name,
    currency: selectedCurrency.value.code,
  });

  inputValue.value = '';
};

// Update placeholder to show current currency
const inputPlaceholder = computed(() => 
  `Enter expense (e.g. ${selectedCurrency.value.symbol}50.00 Groceries :account #food)`
)

const handleAddExpense = (expenseData: any) => {
  transactions.value.push({
    id: Date.now(),
    date: currentDate.value,
    currency: selectedCurrency.value.code,
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
  const debitsOnly = filteredExpenses.value.filter(tx => tx.amount < 0);
  return calculateTotalExcludingBlacklisted(debitsOnly);
})

// Add new computed property for monthly total
const monthlyTotal = computed(() => {
  const debitsOnly = monthlyExpenses.value.filter(tx => tx.amount < 0);
  return calculateTotalExcludingBlacklisted(debitsOnly);
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

// Compute bottom section style based on keyboard height
const bottomSectionStyle = computed(() => {
  if (isKeyboardVisible.value && keyboardHeight.value > 0) {
    // Add a small buffer (20px) to position it slightly above the keyboard
    return { transform: `translateY(calc(-1 * (var(--keyboard-height) + 20px)))` }
  }
  return {}
})
</script>

<template>
  <div class="home">
    <TopBar class="top-bar"
      :current-date="currentDate"
      @update:current-date="currentDate = $event"
    />
    <main class="content" :class="{ 'keyboard-visible': isKeyboardVisible }">
      <!-- Make the list scrollable -->
      <div class="scrollable-container">
        <div v-if="!hasExpenses" class="empty-state">
          <p>No expenses yet. Start by entering an expense below.</p>
          <p class="format-hint">Format: [+]amount description :account #category</p>
          <p class="examples">
            Examples:<br>
            25.99 Lunch :cash #food<br>
            +100 Salary :savings #income<br>
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
      <div 
        class="bottom-section" 
        :class="{ 'keyboard-active': isKeyboardVisible }"
        :style="bottomSectionStyle"
      >
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
            @input="onInputChange"
            @focus="isKeyboardVisible = true"
            @blur="isKeyboardVisible = false"
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
  height: -webkit-fill-available; /* iOS viewport fix */
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

/* Adjust content when keyboard is visible */
.content.keyboard-visible {
  /* This will be adjusted dynamically based on keyboard height */
  height: calc(100% - var(--keyboard-height, 300px));
}

.scrollable-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  padding-top: calc(1rem + env(safe-area-inset-top, 3rem)); /* Adjust padding to account for TopBar */
  /* Adjust bottom padding to account for fixed bottom section */
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 20px));
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

.bottom-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #000;
  padding-bottom: env(safe-area-inset-bottom, 20px);
  border-top: 1px solid #222;
  z-index: 1000;
  transition: transform 0.2s ease-out;
}

/* The transform style will be applied dynamically based on actual keyboard height */
.bottom-section.keyboard-active {
  position: fixed;
  bottom: 0;
}

.total-display {
  text-align: right;
  padding-right: 1rem;
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
  position: relative; /* For account suggestions positioning */
  /* Add padding to ensure visibility above keyboard */
  padding-bottom: env(safe-area-inset-bottom, 20px);
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
  /* Remove bottom padding that was pushing content down */
  padding-bottom: 0.75rem;
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