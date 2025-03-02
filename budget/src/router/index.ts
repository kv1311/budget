import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Settings from '../pages/Settings.vue'
import AccountsView from '../views/AccountsView.vue'
import CurrencySettings from '../pages/CurrencySettings.vue'
import DeletedTransactionsView from '@/views/DeletedTransactionsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/settings',
      component: Settings
    },
    {
      path: '/settings/:section',
      component: Settings
    },
    {
      path: '/settings/accounts',
      component: AccountsView
    },
    {
      path: '/settings/currency',
      name: 'currency-settings',
      component: CurrencySettings
    },
    {
      path: '/settings/deleted',
      name: 'deleted-transactions',
      component :DeletedTransactionsView
    },
  ],
})

export default router
