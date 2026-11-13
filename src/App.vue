<script setup>
import AppNavbar from './components/common/AppNavbar.vue'
import { useCart } from './composables/useCart'

const { itemCount } = useCart()

function handleToggleCart() {
  // Toggle cart drawer or navigate to checkout
}
</script>

<template>
  <div class="app-layout">
    <AppNavbar :cart-count="itemCount" @toggle-cart="handleToggleCart" />

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
