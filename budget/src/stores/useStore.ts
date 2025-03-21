import { ref, watch, computed } from 'vue'
import { downloadJSON, uploadJSON } from '../utils/fileHelper'
import { balanceHistory, importBalanceHistory } from './useBalanceHistoryStore'

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

export const accounts = ref<Account[]>(storedAccounts ? parseStoredData(storedAccounts) : [])
export const transactions = ref<Transaction[]>(storedTransactions ? parseStoredData(storedTransactions) : [])
export const expenses = ref<Expense[]>([])
export const deletedTransactions = ref<DeletedTransaction[]>(
  storedDeletedTransactions ? parseStoredData(storedDeletedTransactions) : []
)

// Watch for changes and update localStorage
watch(accounts, (newAccounts) => {
  localStorage.setItem('accounts', JSON.stringify(newAccounts))
}, { deep: true })

watch(transactions, (newTransactions) => {
  localStorage.setItem('transactions', JSON.stringify(newTransactions))
}, { deep: true })

watch(deletedTransactions, (newDeletedTransactions) => {
  localStorage.setItem('deletedTransactions', JSON.stringify(newDeletedTransactions))
}, { deep: true })

export function getPrimaryAccountBalance(): number {
  const primaryAccount = accounts.value.find(account => account.isPrimary)
  return primaryAccount?.balance || 0
}

export function updateAccountBalance(accountName: string, amount: number) {
  // Find exact matching account
  const account = accounts.value.find(a => a.name === accountName)
  
  if (account) {
    account.balance += amount
  } else {
    console.error(`Account "${accountName}" not found`)
  }
}

export function moveToDeleted(transactionId: number) {
  const index = transactions.value.findIndex(t => t.id === transactionId)
  const transaction = transactions.value[index]
  
  if (transaction) {
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

export function restoreTransaction(deletedId: number) {
  const deletedTransaction = deletedTransactions.value.find(t => t.id === deletedId)
  
  if (deletedTransaction) {
    const { deletedAt, originalIndex, ...transaction } = deletedTransaction
    const targetIndex = Math.min(originalIndex, transactions.value.length)
    
    // Update the balance when restoring
    updateAccountBalance(transaction.account, transaction.amount)
    
    transactions.value.splice(targetIndex, 0, transaction)
    deletedTransactions.value = deletedTransactions.value.filter(t => t.id !== deletedId)
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

export function exportAllData() {
  const data = {
    accounts: accounts.value,
    transactions: transactions.value,
    deletedTransactions: deletedTransactions.value,
    balanceHistory: balanceHistory.value,
    settings: appSettings.value // This will now include currency
  }
  
  const timestamp = new Date().toISOString().split('T')[0]
  downloadJSON(data, `budget-backup-${timestamp}.json`)
}

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

    return true
  } catch (error) {
    console.error('Import failed:', error)
    return false
  }
}
