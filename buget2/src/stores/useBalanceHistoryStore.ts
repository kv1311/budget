import { ref } from 'vue'
import { accounts } from './useStore'

interface BalanceRecord {
  accountId: number
  balance: number
  date: string // YYYY-MM-DD format
}

export const balanceHistory = ref<BalanceRecord[]>([])

export function logDailyBalances() {
  const today = new Date().toISOString().split('T')[0]
  
  // Log balance for each account
  accounts.value.forEach(account => {
    balanceHistory.value.push({
      accountId: account.id,
      balance: account.balance,
      date: today
    })
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
