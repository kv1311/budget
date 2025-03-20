import { ref, watch } from 'vue'
import { downloadJSON, uploadJSON } from '../utils/fileHelper'

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

// Get initial currency from localStorage or default to USD
const getInitialCurrency = () => {
  const saved = localStorage.getItem('selectedCurrency')
  if (saved) {
    const parsed = JSON.parse(saved)
    return currencies.find(c => c.code === parsed.code) || currencies[0]
  }
  return currencies[0]
}

export const selectedCurrency = ref(getInitialCurrency())

export const setCurrency = (currency: typeof currencies[0]) => {
  selectedCurrency.value = currency
  // Save to localStorage whenever currency changes
  localStorage.setItem('selectedCurrency', JSON.stringify(currency))
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
    
    transactions.value.splice(targetIndex, 0, transaction)
    deletedTransactions.value = deletedTransactions.value.filter(t => t.id !== deletedId)
  }
}

export function permanentlyDelete(deletedId: number) {
  deletedTransactions.value = deletedTransactions.value.filter(t => t.id !== deletedId)
}
export function exportAllData() {
  const data = {
    accounts: accounts.value,
    transactions: transactions.value,
    deletedTransactions: deletedTransactions.value,
    selectedCurrency: selectedCurrency.value
  };
  
  const timestamp = new Date().toISOString().split('T')[0];
  downloadJSON(data, `budget-backup-${timestamp}.json`);
}

export async function importAllData() {
  try {
    const data = await uploadJSON();
    
    // Validate data structure
    if (!data.accounts || !data.transactions || !data.selectedCurrency) {
      throw new Error('Invalid backup file format');
    }

    // Parse dates
    data.accounts = data.accounts.map((a: any) => ({
      ...a,
      createdAt: new Date(a.createdAt)
    }));
    
    data.transactions = data.transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }));

    if (data.deletedTransactions) {
      data.deletedTransactions = data.deletedTransactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        deletedAt: new Date(t.deletedAt)
      }));
    }

    // Update store
    accounts.value = data.accounts;
    transactions.value = data.transactions;
    deletedTransactions.value = data.deletedTransactions || [];
    setCurrency(data.selectedCurrency);

    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
}
