<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronLeft, Plus, X, Check } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import Button from '../components/ui/Button.vue'
import { accounts, selectedCurrency } from '../stores/useStore'

interface Account {
  id: number;
  name: string;
  balance: number;
  createdAt: Date;
  isPrimary: boolean;
}

const router = useRouter()
// const accounts = ref<Account[]>([])
const newAccountName = ref('')
const newAccountBalance = ref('')
const showAddForm = ref(false)

const toggleAddForm = () => {
  showAddForm.value = !showAddForm.value
  if (!showAddForm.value) {
    newAccountName.value = ''
    newAccountBalance.value = ''
  }
}

const setPrimaryAccount = (accountId: number) => {
  accounts.value = accounts.value.map(account => ({
    ...account,
    isPrimary: account.id === accountId
  }))
}

const addAccount = () => {
  if (!newAccountName.value || !newAccountBalance.value) return

  accounts.value.push({
    id: Date.now(),
    name: newAccountName.value.trim(),
    balance: parseFloat(newAccountBalance.value),
    createdAt: new Date(),
    isPrimary: accounts.value.length === 0
  })

  newAccountName.value = ''
  newAccountBalance.value = ''
  showAddForm.value = false
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: selectedCurrency.value.code
  }).format(amount)
}

// Add transition name for list items
const primaryTransition = 'primary'

// Add watcher for currency changes
watch(selectedCurrency, () => {
  // Force re-render of account balances
  accounts.value = [...accounts.value]
}, { deep: true })
</script>

<template>
  <div class="accounts">
    <header class="accounts-header">
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Accounts</h1>
      <Button variant="ghost" size="icon" @click="toggleAddForm" class="add-button">
        <Plus v-if="!showAddForm" :size="24" />
        <X v-else :size="24" />
      </Button>
    </header>

    <div class="accounts-list">
      <div v-for="account in accounts" :key="account.id" class="account-item">
        <div class="account-info">
          <div class="account-left">
            <span class="account-name">{{ account.name }}</span>
            <Transition :name="primaryTransition">
              <span v-if="account.isPrimary" class="primary-tag">primary</span>
            </Transition>
          </div>
          <div class="account-right">
            <span class="account-balance">{{ formatCurrency(account.balance) }}</span>
            <Button 
              v-if="!account.isPrimary"
              variant="ghost" 
              class="primary-btn"
              title="Set as primary account"
              @click="setPrimaryAccount(account.id)"
            >
              <Check :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="slide">
      <div v-if="showAddForm" class="add-account">
        <h2>Add Account</h2>
        <div class="input-group">
          <input
            v-model="newAccountName"
            type="text"
            placeholder="Account name"
            class="account-input"
            @keyup.enter="addAccount"
          />
          <input
            v-model="newAccountBalance"
            type="number"
            step="0.01"
            placeholder="Initial balance"
            class="account-input"
            @keyup.enter="addAccount"
          />
          <Button variant="default" @click="addAccount">Add Account</Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.accounts {
  min-height: 100vh;
  background-color: #000;
  color: #fff;
  padding: 1rem;
}

.accounts-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.accounts-header h1 {
  flex: 1;
  font-size: 1.5rem;
  font-weight: 600;
}

.add-button {
  margin-left: auto;
}

.accounts-list {
  max-width: 600px;
  margin: 0 auto 2rem;
}

.account-item {
  padding: 1rem;
  border-bottom: 1px solid #222;
}

.account-info {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
  height: 40px; /* Fixed height to prevent layout shifts */
}

.account-left, .account-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.account-name {
  font-size: 1rem;
}

.account-balance {
  color: #42b883;
  font-size: 1rem;
  width: 100px; /* Fixed width to prevent layout shifts */
  text-align: right;
}

.primary-tag {
  font-size: 0.8rem;
  color: #42b883;
  background: rgba(66, 184, 131, 0.1);
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
}

.primary-btn {
  color: #666;
  padding: 0.25rem;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.primary-btn:hover {
  color: #42b883;
}

/* Transitions */
.primary-enter-active,
.primary-leave-active {
  transition: all 0.3s ease;
}

.primary-enter-from,
.primary-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.add-account {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
  background: #111;
  border-radius: 8px;
  position: relative;
  z-index: 100; /* Add this to ensure form appears above other elements */
}

.add-account h2 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative; /* Add this line */
}

.account-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: #000;
  border: none;
  color: white;
  border-radius: 4px;
}

.account-input:focus {
  outline: none;
  background: #0a0a0a;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
