<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import Button from './ui/Button.vue'
import { addReminder } from '../stores/useStore'
import type { Reminder } from '../stores/useStore'

const emit = defineEmits<{
  close: []
}>()

const formData = ref({
  description: '',
  amount: '',
  account: '',
  category: '',
  datetime: '',
  frequency: 'once'
})

const handleSubmit = () => {
  if (!formData.value.description || !formData.value.amount || 
      !formData.value.account || !formData.value.datetime) {
    return
  }

  addReminder({
    description: formData.value.description,
    amount: parseFloat(formData.value.amount),
    account: formData.value.account,
    category: formData.value.category,
    datetime: formData.value.datetime,
    frequency: formData.value.frequency
  })

  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Add Reminder</h3>
        <Button variant="ghost" size="icon" class="close-button" @click="emit('close')">
          <X :size="20" />
        </Button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <input
              v-model="formData.description"
              type="text"
              placeholder="Description"
              required
            />
            <input
              v-model="formData.amount"
              type="number"
              step="0.01"
              placeholder="Amount"
              required
            />
            <input
              v-model="formData.account"
              type="text"
              placeholder="Account"
              required
            />
            <input
              v-model="formData.category"
              type="text"
              placeholder="Category"
            />
            <input
              v-model="formData.datetime"
              type="datetime-local"
              required
            />
            <select v-model="formData.frequency">
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <Button type="submit">Add Reminder</Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end; /* Change from center to flex-end */
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: #1a1a1a;
  border-radius: 18px 18px 0 0;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh; /* Increase max height */
  overflow-y: auto; /* Enable scrolling */
  margin-bottom: env(safe-area-inset-bottom, 0);
}

.modal-body {
  padding-bottom: 60vh; /* Add extra padding at bottom for keyboard */
}

/* Add smooth scrolling */
.modal-content {
  scroll-behavior: smooth;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

input, select {
  width: 100%;
  padding: 0.75rem;
  background: #000;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
}

input:focus, select:focus {
  outline: none;
  border-color: #42b883;
}
</style>
