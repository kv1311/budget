<script setup lang="ts">
import { useNotifications } from '../stores/useNotifications'

const notifications = useNotifications()

const handleTestNotification = async () => {
  await notifications.testNotification()
}
</script>

<template>
  <div class="settings-view">
    <div class="settings-section">
      <h2>Notifications</h2>
      <div class="setting-item">
        <div class="setting-content">
          <div class="setting-title">Test Notifications</div>
          <div class="setting-description">Send a test notification to verify reminders are working</div>
        </div>
        <button 
          @click="handleTestNotification"
          class="test-button"
        >
          Test Notification
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.test-button:hover {
  background: #2563eb;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #222;
}

.setting-content {
  flex: 1;
}

.setting-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.875rem;
  color: #666;
}
</style>