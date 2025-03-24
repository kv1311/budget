import { ref } from 'vue'
import { accounts } from './useStore'

interface BalanceRecord {
  accountId: number
  balance: number
  date: string // YYYY-MM-DD format
}

export const balanceHistory = ref<BalanceRecord[]>([])

// Load from localStorage
const savedHistory = localStorage.getItem('balanceHistory')
if (savedHistory) {
  balanceHistory.value = JSON.parse(savedHistory)
}

export function addBalanceRecord(accountId: number, balance: number) {
  const today = new Date().toISOString().split('T')[0]
  
  // Check if we already have a record for this account today
  const existingIndex = balanceHistory.value.findIndex(
    record => record.accountId === accountId && record.date === today
  )

  if (existingIndex !== -1) {
    // Update existing record
    balanceHistory.value[existingIndex].balance = balance
  } else {
    // Add new record
    balanceHistory.value.push({
      accountId,
      balance,
      date: today
    })
  }

  // Save to localStorage
  localStorage.setItem('balanceHistory', JSON.stringify(balanceHistory.value))
}

export function logDailyBalances() {
  const today = new Date().toISOString().split('T')[0]
  
  // Log balance for each account
  accounts.value.forEach(account => {
    addBalanceRecord(account.id, account.balance)
  })
}

// Schedule daily balance logging at 9 PM
export function initializeBalanceLogging() {
  const scheduleNextLog = () => {
    const now = new Date()
    const next = new Date()
    next.setHours(21, 0, 0, 0) // Set to 9 PM
    
    if (now.getHours() >= 21) {
      next.setDate(next.getDate() + 1)
    }
    
    const delay = next.getTime() - now.getTime()
    setTimeout(() => {
      logDailyBalances()
      scheduleNextLog()
    }, delay)
  }
  
  scheduleNextLog()
}

export function importBalanceHistory(data: BalanceRecord[]) {
  balanceHistory.value = data.map(record => ({
    ...record,
    date: record.date // Already in YYYY-MM-DD format
  }))
}
