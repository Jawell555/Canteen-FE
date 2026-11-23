<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import MenuCatalog from '../components/menu/MenuCatalog.vue'
import ItemCustomizerModal from '../components/menu/ItemCustomizerModal.vue'
import { useCart } from '../composables/useCart'

const router = useRouter()
const { addItem, itemCount, formattedSubtotal } = useCart()

const activeCategory = ref('all')
const selectedItemForModal = ref(null)
const isCustomizerOpen = ref(false)

const categories = [
  { id: 'all', name: 'All Items' },
  { id: 'meals', name: 'Meals' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'drinks', name: 'Drinks' },
]

const menuItems = ref([
  {
    id: 101,
    name: 'Chicken Adobo with Rice',
    desc: 'Classic Filipino savory chicken braised in vinegar and soy sauce with garlic.',
    price: 85,
    emoji: '🍛',
    stock: 24,
    category: 'meals',
    isSoldOut: false,
  },
  {
    id: 102,
    name: 'Pork Sinigang with Rice',
    desc: 'Tamarind-soured broth with tender pork ribs, water spinach, and radish.',
    price: 95,
    emoji: '🍲',
    stock: 15,
    category: 'meals',
    isSoldOut: false,
  },
  {
    id: 103,
    name: 'Toasted Ham & Cheese',
    desc: 'Golden crisp bread with smoked ham and melted cheddar cheese.',
    price: 45,
    emoji: '🥪',
    stock: 12,
    category: 'snacks',
    isSoldOut: false,
  },
  {
    id: 104,
    name: 'Iced Calamansi Juice',
    desc: 'Chilled native citrus juice freshly squeezed with pure honey.',
    price: 25,
    emoji: '🧃',
    stock: 0,
    category: 'drinks',
    isSoldOut: true,
  },
])

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return menuItems.value
  return menuItems.value.filter((item) => item.category === activeCategory.value)
})

function handleOpenCustomizer(item) {
  selectedItemForModal.value = item
  isCustomizerOpen.value = true
}

function handleCloseCustomizer() {
  isCustomizerOpen.value = false
  selectedItemForModal.value = null
}

function handleAddToCartFromModal({ item, quantity, customNotes }) {
  addItem(item, quantity, customNotes)
}

function goToCheckout() {
  router.push('/checkout')
}
</script>

<template>
  <div class="menu-view">
    <header class="menu-header">
      <h1 class="page-title">Today's Menu</h1>
      <p class="page-subtitle">Select fresh canteen meals, snacks, and drinks</p>
    </header>

    <!-- Menu Catalog Component -->
    <MenuCatalog
      :categories="categories"
      :items="filteredItems"
      :active-category="activeCategory"
      @select-category="activeCategory = $event"
      @customize-item="handleOpenCustomizer"
    />

    <!-- Item Customizer Modal -->
    <ItemCustomizerModal
      :is-open="isCustomizerOpen"
      :item="selectedItemForModal"
      @close="handleCloseCustomizer"
      @add-to-cart="handleAddToCartFromModal"
    />

    <!-- Floating Sticky Cart Pill (Experience mode) -->
    <Transition name="slide-up">
      <aside v-if="itemCount > 0" class="floating-cart-pill" aria-label="Cart Quick Summary">
        <div class="cart-info">
          <span class="cart-count tabular-nums">{{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}</span>
          <span class="cart-divider">•</span>
          <span class="cart-total tabular-nums">{{ formattedSubtotal }}</span>
        </div>
        <button type="button" class="checkout-btn" @click="goToCheckout">
          Checkout →
        </button>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.menu-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) calc(var(--space-12) + 60px);
  position: relative;
}

.menu-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* Floating Sticky Cart Pill */
.floating-cart-pill {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  background-color: var(--color-text-primary);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 10px 18px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-elevated);
  width: calc(100% - 32px);
  max-width: 480px;
}

.cart-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.cart-divider {
  opacity: 0.4;
}

.cart-total {
  color: #FDBA74;
  font-weight: 800;
}

.checkout-btn {
  background-color: var(--color-primary-base);
  color: var(--color-text-inverse);
  border: none;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.checkout-btn:hover {
  background-color: var(--color-primary-hover);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
