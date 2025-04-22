<!-- filepath: d:\Code\react\budget\src\pages\Signup.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/useAuth'
import Button from '../components/ui/Button.vue'

const router = useRouter()
const auth = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')

const handleSignup = async () => {
  validationError.value = ''
  
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match'
    return
  }
  
  if (password.value.length < 6) {
    validationError.value = 'Password must be at least 6 characters'
    return
  }

  const { error } = await auth.signUp(email.value, password.value)
  if (!error) {
    router.push('/login')
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>Create Account</h1>
      <form @submit.prevent="handleSignup" class="auth-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="Enter your email"
          >
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Enter your password"
          >
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Confirm your password"
          >
        </div>
        <div v-if="validationError || auth.error" class="error-message">
          {{ validationError || auth.error }}
        </div>
        <Button 
          type="submit" 
          :disabled="auth.loading"
          class="submit-button"
        >
          {{ auth.loading ? 'Creating account...' : 'Sign Up' }}
        </Button>
      </form>
      <div class="auth-links">
        Already have an account? 
        <router-link to="/login">Login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.auth-container {
  background: #111;
  padding: 2rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  border: 1px solid #222;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.875rem;
  color: #888;
}

input {
  padding: 0.75rem;
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #42b883;
}

.submit-button {
  width: 100%;
  margin-top: 1rem;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
}

.auth-links {
  margin-top: 1.5rem;
  text-align: center;
  color: #888;
  font-size: 0.875rem;
}

.auth-links a {
  color: #42b883;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}
</style>