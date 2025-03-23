<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, EyeOff } from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import { 
  categories, 
  transactions, 
  formatAmount, 
  blacklistedCategories,
  toggleCategoryBlacklist,
  isCategoryBlacklisted
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
        >
          <div class="category-header">
            <h3>{{ category.name }}</h3>
            <div class="category-actions">
              <span class="transaction-count">{{ category.count }}</span>
              <button 
                class="blacklist-button"
                :class="{ active: isCategoryBlacklisted(category.name) }"
                @click="toggleBlacklist(category.name)"
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
  </div>
</template>

<style scoped>
.analysis-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  position: fixed;
  width: 100%;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #222;
  background: #000;
  position: fixed;
  width: 100%;
  z-index: 10;
  font-size: 0.75rem
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  padding-top: 7rem;
  scroll-behavior: smooth;
}

.categories-list {
  display: grid;
  gap: 0.5rem;
  padding-bottom: 2rem;
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

@media (max-width: 480px) {
  .header {
    padding-top: 3rem;
  }
}
</style>
