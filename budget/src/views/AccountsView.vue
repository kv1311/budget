<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ChevronLeft, Plus, X, Check, Trash2, Edit, ChartLine } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import Button from '../components/ui/Button.vue'
import AccountDetailsModal from '../components/AccountDetailsModal.vue'
import { accounts, selectedCurrency, transactions } from '../stores/useStore'
import { initializeBalanceLogging } from '../stores/useBalanceHistoryStore'
import '../styles/animations.css'

interface Account {
  id: number;
  name: string;
  balance: number;
  createdAt: Date;
  isPrimary: boolean;
}

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string;
  account: string;    // This is the account name
  accountName: string; // If you need both ID and name
  currency: string;
}

const router = useRouter()
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

// Handle editing
const editingAccount = ref<Account | null>(null)
const editAccountName = ref('')
const editAccountBalance = ref('')

// Hold state management
const holdTimeout = ref<number | null>(null)
const holdActive = ref<number | null>(null)
const showPopup = ref<number | null>(null)
const popupPosition = ref({ x: 0, y: 0 })
const isHolding = ref(false) // Add this to track if we're currently in a hold state

// Modified hold methods to fix double popup issue
const startHold = (e: MouseEvent | TouchEvent, accountId: number) => {
  if (showPopup.value) return // Prevent new popup if one is already open
  
  // Handle right-click
  if (e instanceof MouseEvent && e.button === 2) {
    e.preventDefault()
    handleContextMenu(e, accountId)
    return
  }

  // Clear any existing timeout
  if (holdTimeout.value) {
    clearTimeout(holdTimeout.value)
  }

  isHolding.value = true // Set flag to indicate we're in hold state
  
  holdTimeout.value = setTimeout(() => {
    if (isHolding.value) { // Only show popup if we're still in hold state
      handlePopup(e, accountId)
    }
  }, 500)
}

const handleContextMenu = (e: MouseEvent | TouchEvent, accountId: number) => {
  e.preventDefault()
  handlePopup(e, accountId)
}

const handlePopup = (e: MouseEvent | TouchEvent, accountId: number) => {
  holdActive.value = accountId
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate initial position
  let x = 'touches' in e ? e.touches[0].clientX : e.clientX
  let y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.height
  
  // Adjust popup position
  const popupWidth = 150
  const popupHeight = 100
  
  if (x + popupWidth > viewportWidth) {
    x = viewportWidth - popupWidth - 16
  }
  if (x < 0) {
    x = 16
  }
  
  if (y + popupHeight > viewportHeight) {
    y = viewportHeight - popupHeight - 16
  }
  if (y < 0) {
    y = 16
  }

  popupPosition.value = { x, y }
  showPopup.value = accountId
}

const cancelHold = () => {
  if (holdTimeout.value) {
    clearTimeout(holdTimeout.value)
    holdTimeout.value = null
  }
  holdActive.value = null
  isHolding.value = false // Reset the holding state
}

const closePopup = () => {
  showPopup.value = null
}

// Delete confirmation refs
const showDeleteConfirm = ref(false)
const accountToDelete = ref<Account | null>(null)

// Confirmation handling methods
const confirmDelete = (account: Account) => {
  accountToDelete.value = account
  showDeleteConfirm.value = true
  showPopup.value = null // Close the action popup
}

const handleDeleteConfirm = () => {
  if (accountToDelete.value) {
    deleteAccount(accountToDelete.value.id)
    showDeleteConfirm.value = false
    accountToDelete.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  accountToDelete.value = null
}

// Modified to properly detect clicks outside popup
const handleOutsideClick = (e: MouseEvent) => {
  // Close popup if clicking outside of it
  if (showPopup.value && !isClickInsidePopup(e)) {
    closePopup()
  }
}

// Helper function to check if click is inside popup
const isClickInsidePopup = (e: MouseEvent): boolean => {
  if (!showPopup.value) return false
  
  const popupElement = document.querySelector('.action-popup')
  return popupElement ? popupElement.contains(e.target as Node) : false
}

// Account Details Modal
const showDetails = ref(false)
const selectedAccount = ref<Account | null>(null)

const showAccountDetails = (account: Account) => {
  selectedAccount.value = account
  showDetails.value = true
  showPopup.value = null
}

// Edit methods
const startEdit = (account: Account) => {
  editingAccount.value = account
  editAccountName.value = account.name
  editAccountBalance.value = account.balance.toString()
  showAddForm.value = false
  showPopup.value = null // Close popup when starting edit
}

const cancelEdit = () => {
  editingAccount.value = null
  editAccountName.value = ''
  editAccountBalance.value = ''
}

const saveEdit = () => {
  if (!editingAccount.value || !editAccountName.value || !editAccountBalance.value) return

  accounts.value = accounts.value.map(account => {
    if (account.id === editingAccount.value!.id) {
      return {
        ...account,
        name: editAccountName.value.trim(),
        balance: parseFloat(editAccountBalance.value)
      }
    }
    return account
  })

  cancelEdit()
}

// Delete with balance recalculation
const deleteAccount = (accountId: number) => {
  const account = accounts.value.find(a => a.id === accountId)
  if (!account) return

  // Recalculate balances for transferred transactions
  transactions.value = transactions.value.filter(t => {
    if (t.account === account.name) {  // Changed from accountId to account name
      // Find the affected transactions and adjust balances
      const relatedAccount = accounts.value.find(a => a.name === t.account && a.id !== accountId)
      
      if (relatedAccount) {
        // Reverse the transaction amount in the related account
        relatedAccount.balance += t.amount
      }
      return false
    }
    return true
  })

  // Remove the account
  accounts.value = accounts.value.filter(a => a.id !== accountId)

  // Set new primary account if needed
  if (account.isPrimary && accounts.value.length > 0) {
    accounts.value[0].isPrimary = true
  }
}

// Add event listener for document-level clicks
onMounted(() => {
  initializeBalanceLogging()
  
  // Add global click handler to close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (showPopup.value && !isClickInsidePopup(e)) {
      closePopup()
    }
  })
})
</script>

<template>
  <!-- Removed handleOutsideClick from main container -->
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

    <TransitionGroup 
      name="list" 
      tag="div" 
      class="accounts-list"
    >
      <div 
        v-for="account in accounts" 
        :key="account.id" 
        class="account-item"
        @mousedown="(e) => startHold(e, account.id)"
        @touchstart="(e) => startHold(e, account.id)"
        @mouseup="cancelHold"
        @mouseleave="cancelHold"
        @touchend="cancelHold"
        @touchcancel="cancelHold"
        @contextmenu.prevent="(e) => handleContextMenu(e, account.id)"
      >
        <div 
          class="account-info" 
          :class="{
            'hold-active': holdActive === account.id
          }"
        >
          <div class="account-left">
            <span class="account-name">{{ account.name }}</span>
            <Transition name="primary">
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
              @click.stop="setPrimaryAccount(account.id)"
            >
              <Check :size="16" />
            </Button>
          </div>
        </div>

        <!-- Action Popup - with stopPropagation to prevent immediate closing -->
        <Transition name="fade">
          <div 
            v-if="showPopup === account.id" 
            class="action-popup"
            :style="{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`
            }"
            @click.stop
          >
            <button @click="showAccountDetails(account)" class="popup-btn details">
              <ChartLine :size="16" />
              Details
            </button>
            <button @click="startEdit(account)" class="popup-btn edit">
              <Edit :size="16" />
              Edit
            </button>
            <button @click="confirmDelete(account)" class="popup-btn delete">
              <Trash2 :size="16" />
              Delete
            </button>
          </div>
        </Transition>
      </div>
    </TransitionGroup>

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

    <!-- Edit Account Modal -->
    <Transition name="modal">
      <div v-if="editingAccount" class="modal-overlay" @click="cancelEdit">
        <div class="modal-content" @click.stop>
          <h3>Edit Account</h3>
          <div class="input-group">
            <input
              v-model="editAccountName"
              type="text"
              placeholder="Account name"
              class="account-input"
              @keyup.enter="saveEdit"
            />
            <input
              v-model="editAccountBalance"
              type="number"
              step="0.01"
              placeholder="Balance"
              class="account-input"
              @keyup.enter="saveEdit"
            />
            <div class="modal-actions">
              <Button variant="ghost" @click="cancelEdit">Cancel</Button>
              <Button variant="default" @click="saveEdit">Save</Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete confirmation dialog -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
        <div class="modal-content" @click.stop>
          <h3>Delete Account</h3>
          <p>Are you sure you want to delete account "{{ accountToDelete?.name }}"?</p>
          <div class="modal-actions">
            <Button variant="ghost" @click="cancelDelete">Cancel</Button>
            <Button variant="destructive" @click="handleDeleteConfirm">Delete</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Account Details Modal -->
    <Transition name="modal">
      <AccountDetailsModal
        v-if="showDetails && selectedAccount"
        :account-id="selectedAccount.id"
        :account-name="selectedAccount.name"
        @close="showDetails = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.accounts {
  padding: 1rem;
  padding-top: calc(env(safe-area-inset-top, 20px) + 1rem);
  max-width: 600px;
  margin: 0 auto;
}

.accounts-header {
  position: relative  ;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  padding-top: calc(env(safe-area-inset-top, 20px) + 2rem);
  background: #000;
  z-index: 1000;
  border-bottom: 1px solid #222;
}

.accounts-header h1 {
  flex: 1;
  font-size: 1.5rem;
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
  position: relative;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: none; /* Prevent scrolling while long pressing */
}

.account-info {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
  height: 40px; /* Fixed height to prevent layout shifts */
  background: #000;
  position: relative;
  z-index: 1;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.account-info.hold-active {
  transform: scale(0.98);
  background: #111;
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

.action-popup {
  position: fixed;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transform-origin: top center;
}

.popup-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  color: white;
  width: 100%;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.popup-btn:hover {
  background: #222;
}

.popup-btn.edit:hover {
  color: #42b883;
}

.popup-btn.delete:hover {
  color: #ff4757;
}

.popup-btn.details:hover {
  color: #60a5fa;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.modal-content p {
  margin-bottom: 1.5rem;
  color: #888;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

[variant="destructive"] {
  background: #dc2626;
  color: white;
}

[variant="destructive"]:hover {
  background: #b91c1c;
}

/* Update these styles for the edit form */
.modal-content .input-group {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-content .account-input {
  width: 100%;
  padding: 0.75rem;
  background: #000;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
}

.modal-content .account-input:focus {
  outline: none;
  border-color: #42b883;
}
</style>