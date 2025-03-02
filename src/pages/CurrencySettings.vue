<script setup lang="ts">
import { currencies, selectedCurrency, setCurrency } from '../stores/useStore'
import Button from '../components/ui/Button.vue'
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleCurrencySelect = (currency: typeof currencies[0]) => {
  setCurrency(currency)
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="currency-settings">
    <div class="header">
      <Button variant="ghost" size="icon" @click="goBack">
        <ChevronLeft :size="24" />
      </Button>
      <h1>Currency</h1>
    </div>

    <div class="currency-list">
      <button
        v-for="currency in currencies"
        :key="currency.code"
        class="currency-item"
        :class="{ active: currency.code === selectedCurrency.code }"
        @click="handleCurrencySelect(currency)"
      >
        <span class="currency-symbol">{{ currency.symbol }}</span>
        <span class="currency-name">{{ currency.name }}</span>
        <span class="currency-code">{{ currency.code }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.currency-settings {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.currency-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.currency-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.currency-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.currency-item:hover::before {
  background-color: rgba(255, 255, 255, 0.05);
}

.currency-item.active {
  background-color: rgba(66, 184, 131, 0.1);
}

.currency-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: #42b883;
  transform-origin: left;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.currency-symbol {
  font-size: 1.25rem;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.currency-name {
  font-size: 1rem;
  position: relative;
  z-index: 1;
}

.currency-code {
  color: #666;
  position: relative;
  z-index: 1;
}

@keyframes slideIn {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

/* Add ripple effect */
.currency-item::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  background-color: rgba(255, 255, 255, 0.1);
}

.currency-item:active::after {
  animation: ripple 0.6s linear;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
</style>
