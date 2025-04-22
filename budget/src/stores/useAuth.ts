import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)  // Start with loading true
  const error = ref<string | null>(null)

  async function signUp(email: string, password: string) {
    try {
      loading.value = true
      error.value = null
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })
      if (signUpError) throw signUpError
      return { data, error: null }
    } catch (err: any) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    try {
      loading.value = true
      error.value = null
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) throw signInError
      user.value = data.user
      return { data, error: null }
    } catch (err: any) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      loading.value = true
      error.value = null
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      user.value = null
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Initialize user on store creation
  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null
    } finally {
      loading.value = false
    }
  }

  // Call init immediately
  init()

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_, session) => {
    user.value = session?.user ?? null
  })

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut
  }
})