import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/useAuth'
import HomeView from '../views/HomeView.vue'
import Settings from '../pages/Settings.vue'
import AccountsView from '../views/AccountsView.vue'
import CurrencySettings from '../pages/CurrencySettings.vue'
import DeletedTransactionsView from '@/views/DeletedTransactionsView.vue'
import AllTransactionsView from '@/views/AllTransactionsView.vue'
import ReminderView from '@/views/ReminderView.vue'
import Login from '../pages/Login.vue'
import Signup from '../pages/Signup.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: Signup,
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      component: Settings,
      meta: { requiresAuth: true }
    },
    {
      path: '/all-transactions',
      component: AllTransactionsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/:section',
      component: Settings,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/accounts',
      component: AccountsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/currency',
      name: 'currency-settings',
      component: CurrencySettings,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/deleted',
      name: 'deleted-transactions',
      component: DeletedTransactionsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/reminders',
      name: 'reminders',
      component: ReminderView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings/analysis',
      name: 'analysis',
      component: () => import('../views/AnalysisView.vue'),
      meta: { requiresAuth: true }
    },
  ],
})

// Updated navigation guard
router.beforeEach(async (to) => {
  const auth = useAuth()
  
  // Wait for initial auth state to be determined
  if (auth.loading) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (to.meta.requiresAuth && !auth.user) {
    return { path: '/login' }
  }

  if (to.meta.requiresGuest && auth.user) {
    return { path: '/' }
  }

  return true
})

export default router
