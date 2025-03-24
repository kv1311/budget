import { ref, watch, computed } from 'vue'
import { downloadJSON, uploadJSON } from '../utils/fileHelper'
import { balanceHistory, importBalanceHistory } from './useBalanceHistoryStore'
import { addBalanceRecord } from './useBalanceHistoryStore'

export interface Account {
  id: number
  name: string
  balance: number
  createdAt: Date
  isPrimary: boolean
}

export interface Transaction {
  id: number
  date: Date
  description: string
  amount: number
  category: string
  account: string
  currency: string  // No longer optional
}

export interface Expense {
  id: number
  date: Date
  description: string
  amount: number
  category: string
  currency: string
  account: string
}

// Add new interface for deleted transactions
export interface DeletedTransaction extends Transaction {
  deletedAt: Date
  originalIndex: number
}

// Update Reminder interface
export interface Reminder {
  id: number
  description: string
  amount: number
  account: string
  datetime: string
  frequency: string
  category: string  // Add this line
}

// Add Category interface after other interfaces
export interface Category {
  id: number
  name: string
  transactions: number[] // Array of transaction IDs
  blacklisted?: boolean
}

export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
]

const defaultSettings = {
  currency: currencies[0],
  theme: 'dark',
  accountSettings: {
    showBalanceHistory: true,
    balanceHistoryDays: 10
  }
}

// Remove separate currency storage
export const appSettings = ref(JSON.parse(localStorage.getItem('appSettings') || JSON.stringify(defaultSettings)))

// Create computed for currency access
export const selectedCurrency = computed(() => appSettings.value.currency)

// Update setCurrency to modify settings
export const setCurrency = (currency: typeof currencies[0]) => {
  appSettings.value.currency = currency
}

// Add formatting utilities
export const formatAmount = (amount: number, currencyCode?: string) => {
  const currency = (currencyCode 
    ? currencies.find(c => c.code === currencyCode) 
    : selectedCurrency.value) || currencies[0]

  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.code
  }).format(absAmount)
  
  return amount > 0 ? `+${formatted}` : formatted
}

export const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Helper to revive dates from JSON
function parseStoredData(data: string) {
  return JSON.parse(data, (key, value) => {
    if (key === 'date' || key === 'createdAt') {
      return new Date(value)
    }
    if (key === 'currency' && !value) {
      return selectedCurrency.value.code // Provide default currency for old data
    }
    return value
  })
}

// Initialize from localStorage or use defaults
const storedAccounts = localStorage.getItem('accounts')
const storedTransactions = localStorage.getItem('transactions')
const storedDeletedTransactions = localStorage.getItem('deletedTransactions')
const storedReminders = localStorage.getItem('reminders')
const storedCategories = localStorage.getItem('categories')

export const accounts = ref<Account[]>(storedAccounts ? parseStoredData(storedAccounts) : [])
export const transactions = ref<Transaction[]>(storedTransactions ? parseStoredData(storedTransactions) : [])
export const expenses = ref<Expense[]>([])
export const deletedTransactions = ref<DeletedTransaction[]>(
  storedDeletedTransactions ? parseStoredData(storedDeletedTransactions) : []
)

// Add reminders ref
export const reminders = ref<Reminder[]>(storedReminders ? JSON.parse(storedReminders) : [])

// Add after other refs
export const categories = ref<Category[]>(storedCategories ? JSON.parse(storedCategories) : [])

// Add initial category scanning for backward compatibility
if (transactions.value.length > 0 && categories.value.length === 0) {
  // Scan existing transactions and create categories
  scanAndMapExistingTransactions()
}

// Watch for changes and update localStorage
watch(accounts, (newAccounts) => {
  localStorage.setItem('accounts', JSON.stringify(newAccounts))
}, { deep: true })

// Remove this watcher since it's redundant
watch(transactions, (newTransactions, oldTransactions) => {
  localStorage.setItem('transactions', JSON.stringify(newTransactions))
}, { deep: true })

// Replace with new combined watcher that handles both storage and categories
watch(transactions, (newTransactions, oldTransactions) => {
  // Update localStorage
  localStorage.setItem('transactions', JSON.stringify(newTransactions))
  
  // Find newly added transactions
  const oldIds = new Set((oldTransactions || []).map(t => t.id))
  const newlyAdded = newTransactions.filter(t => !oldIds.has(t.id))
  
  // Immediately map new transactions to categories
  newlyAdded.forEach(transaction => {
    if (transaction.category) {
      let category = categories.value.find(c => c.name === transaction.category)
      
      // Create category if it doesn't exist
      if (!category) {
        category = addCategory(transaction.category)
      }
      
      // Add transaction to category
      if (!category.transactions.includes(transaction.id)) {
        category.transactions.push(transaction.id)
      }
    }
  })
}, { immediate: true, deep: true })

watch(deletedTransactions, (newDeletedTransactions) => {
  localStorage.setItem('deletedTransactions', JSON.stringify(newDeletedTransactions))
}, { deep: true })

watch(reminders, (newReminders) => {
  localStorage.setItem('reminders', JSON.stringify(newReminders))
}, { deep: true })

// Add after other watches
watch(categories, (newCategories) => {
  localStorage.setItem('categories', JSON.stringify(newCategories))
}, { deep: true })

// Add watcher for transactions to handle category mapping
watch(transactions, (newTransactions, oldTransactions) => {
  // Find newly added transactions by comparing with old transactions
  const oldIds = new Set((oldTransactions || []).map(t => t.id))
  const newlyAdded = newTransactions.filter(t => !oldIds.has(t.id))
  
  // Map new transactions to categories
  newlyAdded.forEach(transaction => {
    if (transaction.category) {
      mapTransactionToCategory(transaction.id, transaction.category)
    }
  })
}, { deep: true })

export function getPrimaryAccountBalance(): number {
  const primaryAccount = accounts.value.find(account => account.isPrimary)
  return primaryAccount?.balance || 0
}

export function updateAccountBalance(accountName: string, amount: number) {
  const account = accounts.value.find(a => a.name === accountName)
  
  if (account) {
    account.balance += amount
    // Add balance record after updating
    addBalanceRecord(account.id, account.balance)
  } else {
    console.error(`Account "${accountName}" not found`)
  }
}

// Add this helper function
function updateCategoriesForTransaction(transactionId: number, categoryName: string) {
  let category = categories.value.find(c => c.name === categoryName)
  
  // Create category if it doesn't exist
  if (!category) {
    category = addCategory(categoryName)
  }
  
  // Remove transaction from other categories
  categories.value.forEach(c => {
    c.transactions = c.transactions.filter(id => id !== transactionId)
  })
  
  // Add to new category
  if (!category.transactions.includes(transactionId)) {
    category.transactions.push(transactionId)
  }
}

// Modify addTransaction to include category mapping
export function addTransaction(transaction: Omit<Transaction, 'id'>) {
  const newTransaction = {
    id: Date.now(),
    ...transaction
  }
  
  transactions.value.push(newTransaction)
  updateAccountBalance(transaction.account, transaction.amount)
  
  // Map transaction to category immediately
  if (transaction.category) {
    updateCategoriesForTransaction(newTransaction.id, transaction.category)
  }
  
  return newTransaction
}

// Remove the duplicate watcher since we're handling categories in addTransaction
// Remove or comment out this watcher:
/*
watch(transactions, (newTransactions, oldTransactions) => {
  // Find newly added transactions...
}, { immediate: true, deep: true })
*/

// Update moveToDeleted to handle category unmapping
export function moveToDeleted(transactionId: number) {
  const index = transactions.value.findIndex(t => t.id === transactionId)
  const transaction = transactions.value[index]
  
  if (transaction) {
    // Remove from categories before deleting
    categories.value.forEach(category => {
      category.transactions = category.transactions.filter(id => id !== transactionId)
    })

    // Revert the balance before moving to deleted
    updateAccountBalance(transaction.account, -transaction.amount)

    deletedTransactions.value.unshift({
      ...transaction,
      deletedAt: new Date(),
      originalIndex: index
    })
    
    transactions.value = transactions.value.filter(t => t.id !== transactionId)
  }
}

// Update restoreTransaction to handle category mapping
export function restoreTransaction(deletedId: number) {
  const deletedTransaction = deletedTransactions.value.find(t => t.id === deletedId)
  
  if (deletedTransaction) {
    const { deletedAt, originalIndex, ...transaction } = deletedTransaction
    const targetIndex = Math.min(originalIndex, transactions.value.length)
    
    // Update the balance when restoring
    updateAccountBalance(transaction.account, transaction.amount)
    
    transactions.value.splice(targetIndex, 0, transaction)
    deletedTransactions.value = deletedTransactions.value.filter(t => t.id !== deletedId)
    
    // Remap the transaction to its category
    if (transaction.category) {
      mapTransactionToCategory(transaction.id, transaction.category)
    }
  }
}

export function permanentlyDelete(deletedId: number) {
  deletedTransactions.value = deletedTransactions.value.filter(t => t.id !== deletedId)
}

interface AppSettings {
  currency: typeof currencies[0]
  theme: string
  accountSettings: {
    showBalanceHistory: boolean
    balanceHistoryDays: number
  }
}

// Add reminder actions
export const addReminder = (reminder: Omit<Reminder, 'id'>) => {
  const newReminder = {
    id: Date.now(),
    ...reminder,
    category: reminder.category.trim() // Trim the category
  }
  reminders.value.push(newReminder)
  
  // Add category if it's new (use trimmed category)
  if (newReminder.category && !categories.value.find(c => c.name === newReminder.category)) {
    addCategory(newReminder.category)
  }
}

export const deleteReminder = (id: number) => {
  reminders.value = reminders.value.filter(reminder => reminder.id !== id)
}

// Add helper function to calculate next due date
function calculateNextDueDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default: // 'once'
      return '' // Empty string to indicate no next date
  }
  
  return date.toISOString().slice(0, 16) // Format as YYYY-MM-DDTHH:mm
}

// Update payReminder function
export const payReminder = (reminder: Reminder) => {
  // Create a transaction from the reminder
  const transaction: Omit<Transaction, 'id'> = {
    date: new Date(),
    description: reminder.description,
    amount: -reminder.amount, // Negative amount since it's an expense
    category: reminder.category,
    account: reminder.account,
    currency: selectedCurrency.value.code
  }
  
  // Add the transaction
  addTransaction(transaction)
  
  // Calculate next due date
  const nextDueDate = calculateNextDueDate(reminder.datetime, reminder.frequency)
  
  if (nextDueDate) {
    // Update the reminder's due date
    const reminderIndex = reminders.value.findIndex(r => r.id === reminder.id)
    if (reminderIndex !== -1) {
      reminders.value[reminderIndex] = {
        ...reminder,
        datetime: nextDueDate
      }
    }
  } else {
    // If frequency is 'once', delete the reminder
    deleteReminder(reminder.id)
  }
}

// Add these functions before exportAllData
export function addCategory(name: string): Category {
  const category = {
    id: Date.now(),
    name,
    transactions: []
  }
  categories.value.push(category)
  return category
}

export function mapTransactionToCategory(transactionId: number, categoryName: string) {
  let category = categories.value.find(c => c.name === categoryName)
  
  // Create category if it doesn't exist
  if (!category) {
    category = addCategory(categoryName)
  }
  
  // Remove transaction from other categories
  categories.value.forEach(c => {
    c.transactions = c.transactions.filter(id => id !== transactionId)
  })
  
  // Add to new category
  if (!category.transactions.includes(transactionId)) {
    category.transactions.push(transactionId)
  }
}

export function scanAndMapExistingTransactions() {
  const distinctCategories = new Set(transactions.value.map(t => t.category))
  
  distinctCategories.forEach(categoryName => {
    if (!categoryName) return
    
    const categoryTransactions = transactions.value
      .filter(t => t.category === categoryName)
      .map(t => t.id)
    
    let category = categories.value.find(c => c.name === categoryName)
    
    if (!category) {
      category = addCategory(categoryName)
    }
    
    category.transactions = categoryTransactions
  })
}

export function exportAllData() {
  const data = {
    accounts: accounts.value,
    transactions: transactions.value,
    deletedTransactions: deletedTransactions.value,
    balanceHistory: balanceHistory.value,
    settings: appSettings.value, // This will now include currency
    reminders: reminders.value
  }
  
  const timestamp = new Date().toISOString().split('T')[0]
  downloadJSON(data, `budget-backup-${timestamp}.json`)
}

// Modify importAllData function to handle categories
export async function importAllData(data: any) {
  try {
    // Remove the uploadJSON call since data is now passed in
    if (!data.accounts || !data.transactions) {
      throw new Error('Invalid backup file format')
    }

    // Validate data structure
    if (!data.accounts || !data.transactions) {
      throw new Error('Invalid backup file format')
    }

    // Parse dates
    data.accounts = data.accounts.map((a: any) => ({
      ...a,
      createdAt: new Date(a.createdAt)
    }))
    
    data.transactions = data.transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }))

    if (data.deletedTransactions) {
      data.deletedTransactions = data.deletedTransactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        deletedAt: new Date(t.deletedAt)
      }))
    }

    // Import balance history if available
    if (data.balanceHistory) {
      importBalanceHistory(data.balanceHistory)
    }

    if (Array.isArray(data.reminders)) {
      reminders.value = data.reminders
    }

    // Update store
    accounts.value = data.accounts
    transactions.value = data.transactions
    deletedTransactions.value = data.deletedTransactions || []

    if (data.settings) {
      // Handle legacy format where currency was separate
      const settings = {
        ...defaultSettings,
        ...data.settings,
        currency: data.selectedCurrency || data.settings.currency || defaultSettings.currency
      }
      
      // Remove defaultCurrency if it exists
      if (settings.accountSettings?.defaultCurrency) {
        delete settings.accountSettings.defaultCurrency
      }
      
      appSettings.value = settings
    }

    // Scan and map imported transactions
    scanAndMapExistingTransactions()

    return true
  } catch (error) {
    console.error('Import failed:', error)
    return false
  }
}

// Add updateReminder function
export const updateReminder = (updatedReminder: Reminder) => {
  const index = reminders.value.findIndex(r => r.id === updatedReminder.id)
  if (index !== -1) {
    reminders.value[index] = updatedReminder
  }
}

// Add after other refs
export const blacklistedCategories = ref<string[]>(
  JSON.parse(localStorage.getItem('blacklistedCategories') || '[]')
)

// Add watcher for blacklisted categories
watch(blacklistedCategories, (newValue) => {
  localStorage.setItem('blacklistedCategories', JSON.stringify(newValue))
}, { deep: true })

// Add blacklist management functions
export const toggleCategoryBlacklist = (categoryName: string) => {
  const index = blacklistedCategories.value.indexOf(categoryName)
  if (index === -1) {
    blacklistedCategories.value.push(categoryName)
  } else {
    blacklistedCategories.value.splice(index, 1)
  }
}

export const isCategoryBlacklisted = (categoryName: string) => {
  return blacklistedCategories.value.includes(categoryName)
}

// Modify the existing formatAmount or add new function
export const calculateTotalExcludingBlacklisted = (transactions: Transaction[]) => {
  return transactions
    .filter(tx => !blacklistedCategories.value.includes(tx.category))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

// Make sure to load initial balances
watch(accounts, (newAccounts) => {
  newAccounts.forEach(account => {
    addBalanceRecord(account.id, account.balance)
  })
}, { immediate: true })

// Add category deletion function
export function deleteCategory(categoryId: number) {
  const category = categories.value.find(c => c.id === categoryId)
  if (category && category.transactions.length === 0) {
    categories.value = categories.value.filter(c => c.id !== categoryId)
  }
}

// Add category update function
export function updateCategoryName(categoryId: number, newName: string) {
  const category = categories.value.find(c => c.id === categoryId)
  if (category) {
    const oldName = category.name
    category.name = newName
    
    // Update category name in all transactions
    transactions.value = transactions.value.map(transaction => {
      if (transaction.category === oldName) {
        return { ...transaction, category: newName }
      }
      return transaction
    })
  }
}
