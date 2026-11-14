<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MenuCatalog from '../components/menu/MenuCatalog.vue'
import ItemCustomizerModal from '../components/menu/ItemCustomizerModal.vue'
import { useCart } from '../composables/useCart'
import { api } from '../services/api'

const router = useRouter()
const { addItem, itemCount, formattedSubtotal } = useCart()

const activeCategory = ref('all')
const selectedItemForModal = ref(null)
const isCustomizerOpen = ref(false)
const isLoading = ref(true)

// Categories initialized dynamically from database
const categories = ref([
  { id: 'all', name: 'All Items' },
  { id: 'meals', name: 'Meals' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'drinks', name: 'Drinks' },
])

// Zero hardcoded items — dynamically populated exclusively from Neon database
const menuItems = ref([])

function getItemEmoji(item) {
  if (item.emoji && item.emoji !== '🍽️') return item.emoji
  const name = (item.name || '').toLowerCase()
  if (name.includes('adobo')) return '🍛'
  if (name.includes('sinigang')) return '🍲'
  if (name.includes('inasal')) return '🍗'
  if (name.includes('tapsilog')) return '🍳'
  if (name.includes('shanghai') || name.includes('lumpia')) return '🥢'
  if (name.includes('turon')) return '🍌'
  if (name.includes('ham') || name.includes('cheese') || name.includes('sandwich')) return '🥪'
  if (name.includes('calamansi') || name.includes('juice')) return '🧃'
  if (name.includes('gulaman') || name.includes('sago')) return '🥤'
  return '🍽️'
}

async function fetchMenuData() {
  isLoading.value = true
  try {
    const [catRes, itemRes] = await Promise.all([
      api.get('/menu/categories').catch(() => null),
      api.get('/menu/items').catch(() => null),
    ])

    if (catRes?.data?.categories && catRes.data.categories.length > 0) {
      categories.value = [
        { id: 'all', name: 'All Items' },
        ...catRes.data.categories.map((c) => ({
          id: c.slug,
          name: c.name,
        })),
      ]
    }

    if (itemRes?.data?.items) {
      menuItems.value = itemRes.data.items.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.desc || item.description || '',
        price: Number(item.price),
        emoji: getItemEmoji(item),
        stock: item.stock ?? item.current_stock ?? 0,
        category: item.category || 'meals',
        isSoldOut: Boolean(item.is_sold_out || item.isSoldOut),
      }))
    }
  } catch (err) {
    console.error('Failed to load menu data from database:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchMenuData()
})

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
    <div class="menu-container">
      <header class="menu-header">
        <h1 class="page-title">Today's Menu</h1>
        <p class="page-subtitle">Select fresh canteen meals, snacks, and drinks</p>
      </header>

      <!-- Menu Catalog Component with Skeleton Loader -->
      <MenuCatalog
        :categories="categories"
        :items="filteredItems"
        :active-category="activeCategory"
        :loading="isLoading"
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
    </div>

    <!-- Sticky Bottom Cart Summary Bar with ample clear space -->
    <Transition name="slide-up">
      <aside v-if="itemCount > 0" class="floating-cart-bar" aria-label="Order summary bar">
        <div class="cart-bar-content">
          <div class="cart-bar-info">
            <span class="cart-bar-count">{{ itemCount }} {{ itemCount === 1 ? 'ITEM' : 'ITEMS' }}</span>
            <span class="cart-bar-total">{{ formattedSubtotal }}</span>
          </div>
          <button type="button" class="checkout-btn" @click="goToCheckout">
            Checkout →
          </button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.menu-view {
  min-height: calc(100vh - 120px);
  padding-bottom: 140px; /* Generous bottom padding so floating cart bar NEVER overlaps cards */
}

.menu-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) 0 var(--space-4);
}

.menu-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.page-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
}

/* Floating Bottom Cart Bar */
.floating-cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-bg-surface);
  border-top: 1px solid var(--color-border-subtle);
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.1);
  padding: var(--space-3) var(--space-6);
  z-index: 50;
  backdrop-filter: blur(8px);
}

.cart-bar-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-bar-info {
  display: flex;
  flex-direction: column;
}

.cart-bar-count {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.cart-bar-total {
  font-size: 22px;
  font-weight: 900;
  color: var(--color-primary-base);
  line-height: 1.2;
}

.checkout-btn {
  background-color: var(--color-primary-base);
  color: var(--color-primary-contrast);
  padding: 12px 28px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 15px;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, background-color 0.15s ease;
  min-height: 44px;
}

.checkout-btn:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
}

/* Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
