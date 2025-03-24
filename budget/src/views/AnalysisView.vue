<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, EyeOff, Pencil, Trash } from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import { 
  categories, 
  transactions, 
  formatAmount, 
  blacklistedCategories,
  toggleCategoryBlacklist,
  isCategoryBlacklisted,
  deleteCategory,
  updateCategoryName
} from '../stores/useStore'

const router = useRouter()

const categoryStats = computed(() => {
  return categories.value.map(category => {
    const categoryTransactions = transactions.value
      .filter(t => t.category === category.name)
    
    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
    const count = categoryTransactions.length
    
    return {
      ...category,
      total,
      count,
      averageAmount: count > 0 ? total / count : 0
    }
  }).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
})

const toggleBlacklist = (categoryName: string) => {
  toggleCategoryBlacklist(categoryName)
}

// Add new refs for edit modal
const showEditModal = ref(false)
const editingCategory = ref<{ id: number, name: string } | null>(null)
const newCategoryName = ref('')

const canDelete = computed(() => (category: typeof categories.value[0]) => {
  return category.transactions.length === 0
})

// Add new refs for long press and action menu
const pressTimeout = ref<number | null>(null)
const selectedItemId = ref<number | null>(null)
const showActionMenu = ref(false)
const actionMenuPosition = ref({ x: 0, y: 0 })

const handleTouchStart = (category: typeof categories.value[0], event: TouchEvent) => {
  pressTimeout.value = setTimeout(() => {
    selectedItemId.value = category.id
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

const handleMouseDown = (category: typeof categories.value[0], event: MouseEvent) => {
  pressTimeout.value = setTimeout(() => {
    selectedItemId.value = category.id
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

const handleEditFromMenu = () => {
  const category = categories.value.find(c => c.id === selectedItemId.value)
  if (category) {
    editingCategory.value = category
    newCategoryName.value = category.name
    showEditModal.value = true
    closeActionMenu()
  }
}

const handleDeleteFromMenu = () => {
  const category = categories.value.find(c => c.id === selectedItemId.value)
  if (category && canDelete.value(category)) {
    deleteCategory(category.id)
    closeActionMenu()
  }
}

const handleEditSubmit = () => {
  if (editingCategory.value && newCategoryName.value.trim()) {
    updateCategoryName(editingCategory.value.id, newCategoryName.value.trim())
    showEditModal.value = false
    editingCategory.value = null
    newCategoryName.value = ''
  }
}

// Add type for the category find function
const findCategory = (id: number) => categories.value.find(c => c.id === id)
</script>

<template>
  <div class="analysis-view">
    <header class="header">
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Analysis</h1>
    </header>

    <div class="content">
      <TransitionGroup 
        name="list" 
        tag="div" 
        class="categories-list"
      >
        <div v-for="category in categoryStats" 
             :key="category.id" 
             class="category-card"
             @touchstart="handleTouchStart(category, $event)"
             @touchend="handleTouchEnd"
             @mousedown="handleMouseDown(category, $event)"
             @mouseup="handleMouseUp"
             @mouseleave="handleMouseUp"
        >
          <div class="category-header">
            <h3>{{ category.name }}</h3>
            <div class="category-actions">
              <span class="transaction-count">{{ category.count }}</span>
              <button 
                class="blacklist-button"
                :class="{ active: isCategoryBlacklisted(category.name) }"
                @click="toggleBlacklist(category.name)"
                title="Toggle visibility in totals"
              >
                <EyeOff :size="14" />
              </button>
            </div>
          </div>
          <div class="category-stats">
            <span class="value" :class="{ negative: category.total < 0 }">
              {{ formatAmount(category.total) }}
            </span>
            <span class="avg-value">
              avg {{ formatAmount(category.averageAmount) }}
            </span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Update Action Menu Popup -->
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
          <button @click="handleEditFromMenu" class="action-button">
            <Pencil :size="16" />
            Edit
          </button>
          <button 
            v-if="selectedItemId && findCategory(selectedItemId) && canDelete(findCategory(selectedItemId)!)"
            @click="handleDeleteFromMenu" 
            class="action-button delete"
          >
            <Trash :size="16" />
            Delete
          </button>
        </div>
      </div>
    </Transition>

    <!-- Add Edit Modal -->
    <Transition name="modal">
      <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Edit Category</h2>
            <button class="close-button" @click="showEditModal = false">×</button>
          </div>
          <form @submit.prevent="handleEditSubmit">
            <div class="form-group">
              <label for="categoryName">Category Name</label>
              <input
                id="categoryName"
                v-model="newCategoryName"
                type="text"
                required
                placeholder="Enter category name"
              >
            </div>
            <div class="modal-actions">
              <button type="button" class="cancel-button" @click="showEditModal = false">
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
  </div>
</template>

<style scoped>
.analysis-view {
    padding: 1rem;
  padding-top: calc(env(safe-area-inset-top, 20px) + 1rem);
  max-width: 600px;
  margin: 0 auto;
}

.header {
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
  font-size: .75rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scroll-behavior: smooth;
}

.categories-list {
  display: grid;
  gap: 0.5rem;
  padding-top: .5rem;
  max-width: 600px;
  margin: 0 auto;
}

.category-card {
  background: #111;
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid #222;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.category-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.category-header h3 {
  font-size: 0.9rem;
  font-weight: 500;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.transaction-count {
  font-size: 0.75rem;
  color: #666;
  padding: 0.15rem 0.4rem;
  border-radius: 12px;
}

.category-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #42b883;
}

.value.negative {
  color: #ef4444;
}

.avg-value {
  font-size: 0.75rem;
  color: #666;
}

.blacklist-button {
  background: transparent;
  border: none;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
  line-height: 0;
  transition: all 0.2s;
}

.blacklist-button.active {
  color: #ef4444;
}

/* List transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-active {
  position: absolute;
}

.action-button {
  background: transparent;
  border: none;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
  line-height: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.action-button:hover {
  color: #fff;
  background: #333;
}

.action-button.delete {
  color: #666;
}

.action-button.delete:hover {
  color: #ef4444;
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
  background: #111;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  border: 1px solid #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #999;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.submit-button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
}

.cancel-button {
  background: #333;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
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
  color: #fff;
  font-size: 0.875rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-button:hover {
  background: #27272a;
}

.action-button.delete {
  color: #ef4444;
}

/* Make category items not selectable for better touch handling */
.category-card {
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
</style>
