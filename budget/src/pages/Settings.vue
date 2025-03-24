<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { 
  CreditCard, 
  Clock, 
  DollarSign, 
  BarChart3, 
  FileDown, 
  Save,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Bell
} from 'lucide-vue-next'
import Button from '../components/ui/Button.vue'
import { exportAllData, importAllData } from '../stores/useStore'
import { ref, onMounted } from 'vue'
import { 
  accounts, 
  transactions, 
  deletedTransactions, 
  appSettings, 
  selectedCurrency 
} from '../stores/useStore'
import { balanceHistory } from '../stores/useBalanceHistoryStore'
import { checkAndRequestPermissions } from '../utils/permissions'
import { useNotifications } from '../stores/useNotifications'
import type { RouteLocationRaw } from 'vue-router'

interface SettingItem {
  icon: any; // Using any for Lucide icons
  label: string;
  route?: RouteLocationRaw;
  action?: () => Promise<void>;
  description?: string;
}

const router = useRouter()
const importStatus = ref('')
const notificationStatus = ref('')
const notificationFeedback = ref('')

const checkPermissions = async () => {
  const granted = await checkAndRequestPermissions();
  if (!granted) {
    importStatus.value = 'Please grant storage permissions';
  }
  return granted;
};

const handleExport = async () => {
  try {
    if (!(await checkPermissions())) {
      return;
    }

    // Create backup data object
    const backupData = {
      accounts: accounts.value,
      transactions: transactions.value,
      deletedTransactions: deletedTransactions.value,
      balanceHistory: balanceHistory.value,
      settings: appSettings.value // Currency is now included in settings
    }

    const jsonString = JSON.stringify(backupData);
    const fileName = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        console.log("JSON String to be saved:", jsonString);
        await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        importStatus.value = 'Backup saved to Documents';
      } catch (err) {
        console.error('Write error:', err);
        importStatus.value = `Export error: ${err || 'Unknown error'}`;
      }
    } else {
      // Web download logic
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      importStatus.value = 'Download started'
    }
  } catch (error) {
    console.error('Export error:', error);
    importStatus.value = `Export failed: ${error|| 'Unknown error'}`;
  }
  setTimeout(() => importStatus.value = '', 5000);
}

const handleImport = async () => {
  try {
    if (Capacitor.isNativePlatform() && !(await checkPermissions())) {
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          const success = await importAllData(data)  // Pass the parsed data
          importStatus.value = success ? 'Import successful!' : 'Import failed'
        } catch (error) {
          console.error('Parse error:', error)
          importStatus.value = 'Invalid backup file'
        }
        setTimeout(() => importStatus.value = '', 3000)
      }
      reader.readAsText(file)
    }

    input.click()
  } catch (error) {
    console.error('Import error:', error)
    importStatus.value = 'Import failed'
    setTimeout(() => importStatus.value = '', 3000)
  }
}

const notifications = useNotifications()
const handleTestNotification = async () => {
  await notifications.testNotification()
}

onMounted(async () => {
  if (!('Notification' in window)) {
    notificationStatus.value = 'Notifications not supported'
    return
  }
  
  if (Notification.permission === 'default') {
    notificationStatus.value = 'Enable notifications'
  } else if (Notification.permission === 'denied') {
    notificationStatus.value = 'Notifications blocked'
  }
})

// Add message listener for test payments
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'test-payment') {
      notificationFeedback.value = 'Test payment action triggered successfully!'
      setTimeout(() => {
        notificationFeedback.value = ''
      }, 3000)
    }
  })
}

const handleNotificationPermission = async () => {
  if (!notifications.hasPermission) {
    const granted = await notifications.requestPermission()
    if (granted) {
      notificationStatus.value = ''
      // Show test notification after permission granted
      await handleTestNotification()
    } else {
      notificationStatus.value = 'Notifications blocked'
    }
  } else {
    await handleTestNotification()
  }
}

const handleItemClick = (item: SettingItem) => {
  if (item.action) {
    item.action()
  } else if (item.route) {
    router.push(item.route)
  }
}

const settingsItems: SettingItem[] = [
  { icon: CreditCard, label: 'Accounts', route: '/settings/accounts' },
  { icon: Clock, label: 'Recently Deleted', route: '/settings/deleted' },
  { icon: DollarSign, label: 'Currency', route: '/settings/currency' },
  { icon: PieChart, label: 'Analysis', route: '/settings/analysis' },
  { icon: FileDown, label: 'Export Data', action: handleExport },
  { icon: Save, label: 'Import Backup', action: handleImport },
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
        :key="item.label"
        variant="ghost"
        class="setting-item"
        @click="handleItemClick(item)"
      >
        <div class="setting-item-content">
          <component :is="item.icon" :size="24" />
          <div class="setting-text">
            <span>{{ item.label }}</span>
            <span v-if="item.description" class="setting-description">
              {{ item.description }}
            </span>
          </div>
        </div>
      </Button>
      <router-link to="/settings/reminders" class="setting-item">
        <Clock :size="24" />
        <span>Reminders</span>
      </router-link>
    </div>

    <div v-if="importStatus" class="import-status">
      {{ importStatus }}
    </div>
    <div v-if="notificationFeedback" class="notification-feedback">
      {{ notificationFeedback }}
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 1rem;/* Adjusted for safe area */
  max-width: 600px;
  margin: 0 auto;
}

.settings-header {
  position: relative;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  padding-top: calc(env(safe-area-inset-top, 20px));
  background: #000;
  z-index: 100;
  border-bottom: 1px solid #222;
}

.settings-header h1 {
  font-size: 1.5rem;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding:1rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  justify-content: flex-start;
  font-size: 1rem;
  color: #ffffff;  /* Add this to ensure white text */
  text-decoration: none;  /* Add this to remove underline from router-link */
}

.import-status {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #4CAF50;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  z-index: 100;
  white-space: pre-wrap;
  text-align: center;
  max-width: 90%;
}

.setting-item-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.setting-text {
  display: flex;
  flex-direction: column;
}

.setting-description {
  font-size: 0.875rem;
  color: #666;
}

.notification-feedback {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  z-index: 100;
}
</style>
