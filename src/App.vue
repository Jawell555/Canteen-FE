<script setup>
import { ref, onMounted } from 'vue'
import AppNavbar from './components/common/AppNavbar.vue'
import CartDrawer from './components/common/CartDrawer.vue'
import { useCart } from './composables/useCart'
import { useAuth } from './composables/useAuth'

const { itemCount, fetchServerCart } = useCart()
const { isAuthenticated, isCustomer, fetchUser } = useAuth()
const isCartDrawerOpen = ref(false)

function handleToggleCart() {
  isCartDrawerOpen.value = !isCartDrawerOpen.value
}

onMounted(async () => {
  if (isAuthenticated.value) {
    await fetchUser()
  }
  if (isAuthenticated.value && isCustomer.value) {
    fetchServerCart()
  }
})
</script>

<template>
  <div class="app-layout">
    <AppNavbar :cart-count="itemCount" @toggle-cart="handleToggleCart" />
    <CartDrawer :is-open="isCartDrawerOpen" @close="isCartDrawerOpen = false" />

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-canvas);
}

.main-content {
  flex: 1;
}
</style>
