<template>
  <div class="reminder-view">
    <header class="reminder-header">
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" color="white" />
      </Button>
      <h1>Reminders</h1>
      <Button variant="ghost" size="icon" @click="showForm = true" class="add-button">
        <Plus :size="24" />
      </Button>
    </header>

    <div class="reminders-list">
      <TransitionGroup 
        name="list" 
        tag="div" 
        class="reminders-grid"
      >
        <div 
          v-for="reminder in reminders" 
          :key="reminder.id" 
          class="reminder-item"
          @touchstart="handleTouchStart(reminder, $event)"
          @touchend="handleTouchEnd"
          @mousedown="handleMouseDown(reminder, $event)"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <div class="reminder-content">
            <h3>{{ reminder.description }}</h3>
            <div class="reminder-details-row">
              <span class="account">{{ reminder.account }}</span>
              <span class="dot">•</span>
              <span class="frequency">{{ reminder.frequency }}</span>
              <span class="dot">•</span>
              <span class="date">{{ formatNextDue(reminder.datetime) }}</span>
            </div>
          </div>
          <div class="reminder-actions">
            <span class="amount">{{ selectedCurrency.symbol }}{{ reminder.amount.toFixed(2) }}</span>
            <button @click.stop="handlePayNow(reminder)" class="pay-button">Pay</button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Action Menu Popup -->
    <Transition name="fade">
      <div v-if="showActionMenu" class="action-menu-overlay" @click="closeActionMenu">
        <div 
          class="action-menu"
          :style="{
            left: `${actionMenuPosition.x}px`,
            top: `${actionMenuPosition.y}px`
          }"
          @click.stop
        >
          <button @click="handleEdit" class="action-button">
            <Pencil :size="16" />
            Edit
          </button>
          <button @click="handleTestNotification" class="action-button">
            <Bell :size="16" />
            Test Notification
          </button>
          <button @click="handleDelete" class="action-button delete">
            <Trash :size="16" />
            Delete
          </button>
        </div>
      </div>
    </Transition>

    <!-- Edit Modal -->
    <Transition name="modal">
      <div v-if="showEditForm" class="modal-overlay" @click="showEditForm = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Edit Reminder</h2>
            <button class="close-button" @click="showEditForm = false">
              <X :size="24" />
            </button>
          </div>
          <form v-if="editingReminder" @submit.prevent="handleEditSubmit" class="reminder-form">
            <div class="form-group">
              <label for="edit-description">Description</label>
              <input 
                v-model="editingReminder.description" 
                type="text" 
                id="edit-description" 
                required
                placeholder="e.g., Pay Rent"
              >
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="edit-amount">Amount</label>
                <div class="amount-input">
                  <span class="currency-symbol">{{ selectedCurrency.symbol }}</span>
                  <input 
                    v-model.number="editingReminder.amount" 
                    type="number" 
                    id="edit-amount" 
                    required 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                  >
                </div>
              </div>

              <div class="form-group flex-1">
                <label for="edit-account">Account</label>
                <select v-model="editingReminder.account" id="edit-account" required>
                  <option value="" disabled>Select account</option>
                  <option 
                    v-for="account in accounts" 
                    :key="account.id" 
                    :value="account.name"
                  >
                    {{ account.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Due Date</label>
                <input 
                  v-model="editingReminder.datetime" 
                  type="date" 
                  id="edit-datetime" 
                  required
                  :min="minDateTime"
                  class="date-input"
                >
              </div>

              <div class="form-group flex-1">
                <label for="edit-frequency">Frequency</label>
                <select v-model="editingReminder.frequency" id="edit-frequency" required>
                  <option value="" disabled>Select frequency</option>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="edit-category">Category</label>
                <div class="category-input-wrapper">
                  <input
                    id="edit-category"
                    v-model="editCategoryInput"
                    type="text"
                    placeholder="Enter category"
                    @input="handleEditCategoryInput"
                    required
                  >
                  <div 
                    v-if="showEditCategorySuggestions && editFilteredCategories.length" 
                    class="category-suggestions"
                  >
                    <button
                      v-for="category in editFilteredCategories"
                      :key="category"
                      type="button"
                      @click="selectEditCategory(category)"
                      class="category-suggestion"
                    >
                      {{ category }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="cancel-button" @click="showEditForm = false">
                Cancel
              </button>
              <button type="submit" class="submit-button">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Modal Form -->
    <Transition name="modal">
      <div v-if="showForm" class="modal-overlay" @click="showForm = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>New Reminder</h2>
            <button class="close-button" @click="showForm = false">
              <X :size="24" />
            </button>
          </div>
          <form @submit.prevent="handleSubmit" class="reminder-form">
            <div class="form-group">
              <label for="description">Description</label>
              <input 
                v-model="newReminder.description" 
                type="text" 
                id="description" 
                required
                placeholder="e.g., Pay Rent"
              >
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="amount">Amount</label>
                <div class="amount-input">
                  <span class="currency-symbol">{{ selectedCurrency.symbol }}</span>
                  <input 
                    v-model.number="newReminder.amount" 
                    type="number" 
                    id="amount" 
                    required 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                  >
                </div>
              </div>

              <div class="form-group flex-1">
                <label for="account">Account</label>
                <select v-model="newReminder.account" id="account" required>
                  <option value="" disabled>Select account</option>
                  <option 
                    v-for="account in accounts" 
                    :key="account.id" 
                    :value="account.name"
                  >
                    {{ account.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Due Date</label>
                <input 
                  v-model="newReminder.datetime" 
                  type="date" 
                  id="datetime" 
                  required
                  :min="minDateTime"
                  class="date-input"
                >
              </div>

              <div class="form-group flex-1">
                <label for="frequency">Frequency</label>
                <select v-model="newReminder.frequency" id="frequency" required>
                  <option value="" disabled>Select frequency</option>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="category">Category</label>
                <div class="category-input-wrapper">
                  <input
                    id="category"
                    v-model="categoryInput"
                    type="text"
                    placeholder="Enter category"
                    @input="handleCategoryInput"
                    required
                  >
                  <div 
                    v-if="showCategorySuggestions && filteredCategories.length" 
                    class="category-suggestions"
                  >
                    <button
                      v-for="category in filteredCategories"
                      :key="category"
                      type="button"
                      @click="selectCategory(category)"
                      class="category-suggestion"
                    >
                      {{ category }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="cancel-button" @click="showForm = false">
                Cancel
              </button>
              <button type="submit" class="submit-button">
                Add Reminder
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Add Payment Confirmation Modal -->
    <Transition name="modal">
      <div v-if="showPaymentConfirm" class="modal-overlay" @click="showPaymentConfirm = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Confirm Payment</h2>
            <button class="close-button" @click="showPaymentConfirm = false">
              <X :size="24" />
            </button>
          </div>
          <div class="payment-confirm-content">
            <p>Are you sure you want to pay:</p>
            <p class="confirm-amount">{{ selectedCurrency.symbol }}{{ selectedReminder?.amount.toFixed(2) }}</p>
            <p class="confirm-description">{{ selectedReminder?.description }}</p>
          </div>
          <div class="modal-actions">
            <button class="cancel-button" @click="showPaymentConfirm = false">Cancel</button>
            <button class="submit-button" @click="confirmPayment">Confirm Payment</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, ChevronLeft, Pencil, Trash, Bell } from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import { useRouter } from 'vue-router'
import { 
  reminders, 
  addReminder, 
  deleteReminder, 
  payReminder,
  updateReminder,
  accounts,
  categories,
  selectedCurrency // Add this import
} from '../stores/useStore'
import { useNotifications } from '../stores/useNotifications'

const router = useRouter()
const showForm = ref(false)

const newReminder = ref({
  description: '',
  amount: 0,
  account: '',
  datetime: '',
  frequency: 'monthly',
  category: ''  // Add this line
})

const notifications = useNotifications()

// Update handleSubmit to schedule notifications
const handleSubmit = async () => {
  if (!notifications.hasPermission) {
    await notifications.requestPermission()
  }
  
  const reminder = await addReminder(newReminder.value)
  if (notifications.hasPermission) {
    await notifications.scheduleReminderNotifications(reminder)
    // Add this line to check scheduled notifications
    await notifications.checkScheduledNotifications()
  }
  
  newReminder.value = {
    description: '',
    amount: 0,
    account: 'checking',
    datetime: '',
    frequency: 'monthly',
    category: ''  // Add this line
  }
  showForm.value = false
}

const minDateTime = computed(() => {
  const now = new Date()
  return now.toISOString().split('T')[0]
})

const formatNextDue = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 3600 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

// Add these new refs and computed properties
const categoryInput = ref('')
const filteredCategories = computed(() => {
  if (!categoryInput.value) return []
  const input = categoryInput.value.toLowerCase()
  return categories.value
    .map(c => c.name)
    .filter(name => name.toLowerCase().includes(input))
})

// Add state for suggestion visibility
const showCategorySuggestions = ref(false)
const showEditCategorySuggestions = ref(false)

// Update category handling for new reminder
const handleCategoryInput = () => {
  if (categoryInput.value) {
    // Show suggestions only if input doesn't exactly match an existing category
    showCategorySuggestions.value = !categories.value
      .map(c => c.name.toLowerCase())
      .includes(categoryInput.value.toLowerCase())
  } else {
    showCategorySuggestions.value = false
  }
  newReminder.value.category = categoryInput.value
}

const selectCategory = (category: string) => {
  newReminder.value.category = category
  categoryInput.value = category
  showCategorySuggestions.value = false
}

// Update category handling for edit form
const handleEditCategoryInput = () => {
  if (editCategoryInput.value) {
    showEditCategorySuggestions.value = !categories.value
      .map(c => c.name.toLowerCase())
      .includes(editCategoryInput.value.toLowerCase())
  } else {
    showEditCategorySuggestions.value = false
  }
  if (editingReminder.value) {
    editingReminder.value.category = editCategoryInput.value
  }
}

const selectEditCategory = (category: string) => {
  if (editingReminder.value) {
    editingReminder.value.category = category
    editCategoryInput.value = category
    showEditCategorySuggestions.value = false
  }
}

const showPaymentConfirm = ref(false)
const selectedReminder = ref<typeof reminders.value[0] | null>(null)

const handlePayNow = async (reminder: typeof reminders.value[0]) => {
  selectedReminder.value = reminder
  showPaymentConfirm.value = true
  
  // Schedule next occurrence if recurring
  if (reminder.frequency !== 'once') {
    const nextDate = calculateNextDate(reminder)
    if (nextDate) {
      const updatedReminder = { ...reminder, datetime: nextDate.toISOString() }
      await updateReminder(updatedReminder)
      notifications.scheduleReminderNotifications(updatedReminder)
    }
  }
}

const confirmPayment = () => {
  if (selectedReminder.value) {
    payReminder(selectedReminder.value)
    showPaymentConfirm.value = false
    selectedReminder.value = null
  }
}

// Add long press handling
const pressTimeout = ref<number | null>(null)
const selectedItemId = ref<number | null>(null)
const showActionMenu = ref(false)
const actionMenuPosition = ref({ x: 0, y: 0 })

const handleTouchStart = (reminder: typeof reminders.value[0], event: TouchEvent) => {
  pressTimeout.value = setTimeout(() => {
    selectedItemId.value = reminder.id
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    actionMenuPosition.value = {
      x: rect.left,
      y: rect.bottom + window.scrollY
    }
    showActionMenu.value = true
  }, 500) // 500ms for long press
}

const handleTouchEnd = () => {
  if (pressTimeout.value) {
    clearTimeout(pressTimeout.value)
    pressTimeout.value = null
  }
}

const handleMouseDown = (reminder: typeof reminders.value[0], event: MouseEvent) => {
  pressTimeout.value = setTimeout(() => {
    selectedItemId.value = reminder.id
    actionMenuPosition.value = {
      x: event.clientX,
      y: event.clientY + window.scrollY
    }
    showActionMenu.value = true
  }, 500)
}

const handleMouseUp = () => {
  if (pressTimeout.value) {
    clearTimeout(pressTimeout.value)
    pressTimeout.value = null
  }
}

const closeActionMenu = () => {
  showActionMenu.value = false
  selectedItemId.value = null
}

// Add edit functionality
const showEditForm = ref(false)
const editingReminder = ref<typeof reminders.value[0] | null>(null)

const handleEdit = () => {
  const reminder = reminders.value.find(r => r.id === selectedItemId.value)
  if (reminder) {
    editingReminder.value = { ...reminder }
    editCategoryInput.value = reminder.category
    showEditForm.value = true
    closeActionMenu()
  }
}

const handleDelete = () => {
  if (selectedItemId.value) {
    deleteReminder(selectedItemId.value)
    closeActionMenu()
  }
}

// Add edit form handling
const editCategoryInput = ref('')
const handleEditSubmit = async () => {
  if (editingReminder.value) {
    const updated = await updateReminder(editingReminder.value)
    if (notifications.hasPermission) {
      await notifications.scheduleReminderNotifications(updated)
      // Add this line to check scheduled notifications
      await notifications.checkScheduledNotifications()
    }
    editingReminder.value = null
    editCategoryInput.value = ''
    showEditForm.value = false
  }
}

// Add computed for edit form categories
const editFilteredCategories = computed(() => {
  if (!editCategoryInput.value) return []
  const input = editCategoryInput.value.toLowerCase()
  return categories.value
    .map(c => c.name)
    .filter(name => name.toLowerCase().includes(input))
})

// Add function to calculate next occurrence
const calculateNextDate = (reminder: typeof reminders.value[0]) => {
  const current = new Date(reminder.datetime)
  const next = new Date(current)
  
  switch (reminder.frequency) {
    case 'daily':
      next.setDate(current.getDate() + 1)
      break
    case 'weekly':
      next.setDate(current.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(current.getMonth() + 1)
      break
    case 'yearly':
      next.setFullYear(current.getFullYear() + 1)
      break
    default:
      return null
  }
  
  return next
}

// Add service worker message listener
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'pay-reminder') {
      const reminder = reminders.value.find(r => r.id === event.data.reminderId)
      if (reminder) {
        handlePayNow(reminder)
      }
    }
  })
}

// Add handleTestNotification function
const handleTestNotification = async () => {
  const reminder = reminders.value.find(r => r.id === selectedItemId.value)
  if (reminder) {
    if (!notifications.hasPermission) {
      await notifications.requestPermission()
    }
    await notifications.testNotification()
    closeActionMenu()
  }
}
</script>

<style scoped>
.reminder-view {
  padding: 1rem;
  padding-top: calc(env(safe-area-inset-top, 20px) + 1rem);
  max-width: 600px;
  margin: 0 auto;;
}

.reminder-header {
  position: relative  ;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  background: #000;
  z-index: 100;
  border-bottom: 1px solid #222;
}

.reminder-header h1 {
  font-size: 1.5rem;
  color: white;
}

.content-wrapper {
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .content-wrapper {
    grid-template-columns: minmax(300px, 400px) 1fr;
  }
}

.reminder-form {
  position: static;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 540px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
}

.flex-1 {
  flex: 1;
}

label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #a1a1aa;
  margin-bottom: 0.25rem;
}

input, select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #27272a;
  font-size: 0.938rem;
  color: #fff;
  transition: all 0.2s;
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  background: #27272a;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.amount-input {
  position: relative;
}

.currency-symbol {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1aa;
}

.amount-input input {
  padding-left: 1.75rem;
}

.submit-button {
  width: 100%;
  padding: 0.875rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.submit-button:hover {
  background: #2563eb;
}

.reminders-list {
  padding: 1rem 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.reminders-list h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #ffffff;
}

.reminders-grid {
  display: grid;
  gap: 0.75rem;
}

.reminder-item {
  background: #18181b;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #27272a;
  width: 100%;
  max-width: 100%;
  gap: 0.75rem; /* Reduced from 1rem to give more space */
  overflow: hidden; /* Ensure content doesn't overflow */
}

.reminder-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.reminder-details-row {
  display: flex;
  align-items: center;
  gap: 0.25rem; /* Reduced from 0.5rem */
  font-size: 0.75rem; /* Slightly smaller */
  color: #a1a1aa;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.reminder-content {
  flex: 1;
  min-width: 0; /* Allow content to shrink properly */
  overflow: hidden;
}

.reminder-content h3 {
  font-size: 0.938rem;
  font-weight: 500;
  margin: 0;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  font-size: 0.875rem; /* Slightly smaller font */
  font-weight: 500;
  color: #34d399;
}

.dot {
  font-size: 0.75rem;
  color: #52525b;
}

.reminder-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Reduced from 1rem */
  margin-left: auto;
  flex-shrink: 0; /* Prevent actions from shrinking */
  white-space: nowrap;
}
.pay-button {
  padding: 0.375rem 0.75rem; /* Reduced horizontal padding */
  font-size: 0.813rem;
  border-radius: 0.5rem;
  background-color: #10b981;
  color: white;
  border: none;
  font-weight: 500;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.pay-button:hover {
  background-color: #059669;
}

.delete-button {
  padding: 0.375rem;
  height: 28px;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Make modal content more compact */
.modal-content {
  padding: 1.25rem;
}

.modal-header {
  margin-bottom: 1rem;
}

.modal-header h2 {
  font-size: 1.25rem;
}

.modal-actions {
  margin-top: 1.5rem;
}

/* Update payment confirmation modal */
.payment-confirm-content {
  text-align: center;
  margin: 1rem 0;
}

.confirm-amount {
  font-size: 1.25rem;
  font-weight: 600;
  color: #34d399;
  margin: 0.375rem 0;
}

.confirm-description {
  color: #a1a1aa;
  font-size: 0.938rem;
}

/* Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Mobile Keyboard Adjustments */
@media (max-width: 767px) {
  .reminder-form {
    margin-bottom: 60px; /* Space for keyboard */
  }
  
  .content-wrapper {
    padding-bottom: 60px;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #111111;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.25rem;
  border: 1px solid #27272a;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h2 {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: #71717a;
  padding: 0.5rem;
  transition: color 0.2s;
}

.close-button:hover {
  color: #fff;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-button {
  padding: 0.875rem 1.5rem;
  background: #27272a;
  color: #fff;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #3f3f46;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Override datetime input styles */
input[type="date"] {
  color-scheme: dark;
  padding: 0.75rem;
}

/* Custom scrollbar for the modal */
.modal-content {
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #27272a;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #52525b;
  }
}

.add-button {
  color: #ffffff;
}

/* Update Plus icon color */
.add-button :deep(svg) {
  color: #ffffff;
}

.category-input-wrapper {
  position: relative;
}

.category-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.category-suggestion {
  width: 100%;
  text-align: left;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: #fff;
}

.category-suggestion:hover {
  background: #3f3f46;
}

/* Replace Calendar styles with date input styles */
.date-input {
  appearance: none;
  background-color: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #fff;
  font-size: 0.938rem;
  padding: 0.625rem 0.75rem;
  width: 100%;
  position: relative;
}

.date-input::-webkit-calendar-picker-indicator {
  opacity: 1;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.date-input:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Remove Calendar specific styles */
.calendar-popup,
.calendar-popup :deep(.calendar-header),
.calendar-popup :deep(.calendar-grid) {
  display: none;
}

.action-menu-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 100;
}

.action-menu {
  position: absolute;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 0.5rem;
  min-width: 150px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: #fff;  /* Make sure text is white */
  font-size: 0.875rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-button:hover {
  background: #27272a;
  color: #fff;  /* Keep text white on hover */
}

.action-button.delete {
  color: #ef4444;
}

.action-button.delete:hover {
  background: #27272a;
}

/* Make reminder items not selectable for better touch handling */
.reminder-item {
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (max-width: 360px) {
  .reminder-item {
    padding: 0.75rem 0.5rem;
  }
  
  .pay-button {
    padding: 0.375rem 0.5rem;
  }
  
  .amount {
    font-size: 0.813rem;
  }
  
  .reminder-actions {
    gap: 0.25rem;
  }
}

.action-button :deep(svg) {
  color: currentColor;
}
</style>