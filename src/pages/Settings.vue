<script setup lang="ts">
import { useRouter } from 'vue-router'
import { 
  CreditCard, 
  Clock, 
  DollarSign, 
  BarChart3, 
  FileDown, 
  Save,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'

const router = useRouter()

const settingsItems = [
  { icon: CreditCard, label: 'Accounts', route: '/settings/accounts' },
  { icon: Clock, label: 'Recently Deleted', route: '/settings/deleted' },
  { icon: DollarSign, label: 'Currency', route: '/settings/currency' },
  { icon: BarChart3, label: 'Analysis', route: '/settings/analysis' },
  { icon: FileDown, label: 'Export Data', route: '/settings/export' },
  { icon: Save, label: 'Backup', route: '/settings/backup' },
]
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <Button variant="ghost" size="icon" @click="router.back()">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Settings</h1>
    </header>

    <div class="settings-list">
      <Button
        v-for="item in settingsItems"
        :key="item.route"
        variant="ghost"
        class="setting-item"
        @click="router.push(item.route)"
      >
        <component :is="item.icon" :size="24" />
        <span>{{ item.label }}</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.settings-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  justify-content: flex-start;
  font-size: 1rem;
}
</style>
