import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'menu',
    component: () => import('../views/CustomerMenuView.vue'),
    meta: { title: 'Menu — Canteena' },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('../views/CheckoutView.vue'),
    meta: { title: 'Checkout — Canteena' },
  },
  {
    path: '/orders/:id?',
    name: 'orders',
    component: () => import('../views/OrderStatusView.vue'),
    meta: { title: 'Order Status — Canteena' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/CustomerProfileView.vue'),
    meta: { title: 'My Profile & History — Canteena' },
  },
  {
    path: '/staff',
    name: 'staff',
    component: () => import('../views/StaffDashboardView.vue'),
    meta: { title: 'Kitchen Queue — Canteena Staff', requiresAuth: true, role: 'staff' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { title: 'Management — Canteena Admin', requiresAuth: true, role: 'admin' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Sign In — Canteena' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
})

export default router
