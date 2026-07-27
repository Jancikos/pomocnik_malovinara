import { createRouter, createWebHistory } from 'vue-router'
import CellarView from '@/views/CellarView.vue'
import LoginView from '@/views/LoginView.vue'
import BatchDetailView from '@/views/BatchDetailView.vue'
import MeasurementsView from '@/views/MeasurementsView.vue'
import HistoryView from '@/views/HistoryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/prihlasenie', name: 'login', component: LoginView },
    { path: '/', name: 'cellar', component: CellarView, meta: { requiresAuth: true } },
    { path: '/sarza/:id', name: 'batch', component: BatchDetailView, meta: { requiresAuth: true } },
    {
      path: '/merania',
      name: 'measurements',
      component: MeasurementsView,
      meta: { requiresAuth: true },
    },
    { path: '/historia', name: 'history', component: HistoryView, meta: { requiresAuth: true } },
  ],
})

router.beforeEach((to) => {
  const signedIn = localStorage.getItem('vinarsky-pomocnik-session') === 'user-oskar'
  if (to.meta.requiresAuth && !signedIn) return { name: 'login' }
  if (to.name === 'login' && signedIn) return { name: 'cellar' }
  return true
})

export default router
