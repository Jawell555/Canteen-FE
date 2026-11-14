<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/common/BaseButton.vue'
import BaseBadge from '../components/common/BaseBadge.vue'
import FeedbackModal from '../components/orders/FeedbackModal.vue'
import { useCart } from '../composables/useCart'
import { useAuth } from '../composables/useAuth'
import { api } from '../services/api'

const router = useRouter()
const { addItem } = useCart()
const { user } = useAuth()

const activeTab = ref('history')
const isFeedbackModalOpen = ref(false)
const selectedOrderForFeedback = ref(null)
const reorderSuccessMsg = ref('')

const pastOrders = ref([
  {
    order_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    queue_number: '#042',
    date: 'Nov 13, 2026 • 12:15 PM',
    status: 'completed',
    total: 85.0,
    payment_method: 'GCash',
    has_feedback: false,
    items: [
      { id: 1, name: 'Chicken Adobo with Rice', price: 85, quantity: 1, custom_notes: 'Penge sabaw' },
    ],
  },
])

const favoriteItems = ref([
  {
    id: 1,
    name: 'Chicken Adobo with Rice',
    emoji: '🍛',
    price: 85.0,
    category: 'Meals',
    desc: 'Classic savory chicken braised in vinegar and soy sauce.',
  },
  {
    id: 8,
    name: 'Chilled Calamansi Juice',
    emoji: '🧃',
    price: 25.0,
    category: 'Drinks',
    desc: 'Native citrus juice freshly squeezed and chilled with honey.',
  },
])

onMounted(async () => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('canteena_order_history') || '[]')
    if (savedHistory.length > 0) {
      pastOrders.value = savedHistory
    }
  } catch {
    // fallback
  }

  try {
    const res = await api.get('/menu/items')
    const items = res.data?.items || []
    if (items.length > 0) {
      favoriteItems.value = items.slice(0, 4).map((it) => ({
        id: it.id,
        name: it.name,
        emoji: it.emoji || '🍽️',
        price: Number(it.price),
        category: it.category_name || it.category || 'Meals',
        desc: it.desc || it.description || '',
      }))
    }
  } catch {
    // fallback
  }
})

function handleReorder(order) {
  order.items.forEach((item) => {
    addItem(item, item.quantity, item.custom_notes)
  })

  reorderSuccessMsg.value = `Added items from ${order.queue_number} to your cart!`
  setTimeout(() => {
    reorderSuccessMsg.value = ''
    router.push('/checkout')
  }, 800)
}

function handleAddFavoriteToCart(item) {
  addItem(item, 1)
  reorderSuccessMsg.value = `Added ${item.name} to cart!`
  setTimeout(() => {
    reorderSuccessMsg.value = ''
  }, 2000)
}

function openFeedbackModal(order) {
  selectedOrderForFeedback.value = order
  isFeedbackModalOpen.value = true
}

function handleFeedbackSubmitted({ orderUuid }) {
  const o = pastOrders.value.find((x) => x.order_uuid === orderUuid)
  if (o) {
    o.has_feedback = true
  }
}
</script>

<template>
  <div class="profile-view">
    <!-- Profile Card Header -->
    <header class="profile-header-card">
      <div class="avatar-circle" aria-hidden="true">
        👤
      </div>
      <div class="profile-info">
        <h1 class="profile-name">{{ user?.name || 'Juan Dela Cruz' }}</h1>
        <p class="profile-sub">{{ user?.email || 'juan.delacruz@campus.edu.ph' }} • Campus Customer</p>
      </div>
      <div class="profile-stat-box">
        <span class="stat-number tabular-nums">{{ pastOrders.length }}</span>
        <span class="stat-label">Orders Completed</span>
      </div>
    </header>

    <!-- Notification Toast -->
    <Transition name="fade">
      <div v-if="reorderSuccessMsg" class="reorder-toast">
        ✓ {{ reorderSuccessMsg }}
      </div>
    </Transition>

    <!-- Tabs Navigation -->
    <nav class="profile-tabs" role="tablist" aria-label="Customer Profile Navigation">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'history'"
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        📋 Order History
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'favorites'"
        class="tab-btn"
        :class="{ active: activeTab === 'favorites' }"
        @click="activeTab = 'favorites'"
      >
        ❤️ Favorite Meals
      </button>
    </nav>

    <!-- Section A: Order History -->
    <section v-if="activeTab === 'history'" class="tab-content">
      <div v-if="pastOrders.length === 0" class="empty-state">
        <p>No past orders yet. Head to the menu to place your first meal!</p>
      </div>

      <div class="orders-list">
        <article
          v-for="order in pastOrders"
          :key="order.order_uuid"
          class="order-history-card"
        >
          <header class="order-card-header">
            <div>
              <span class="order-queue-badge tabular-nums">{{ order.queue_number }}</span>
              <time class="order-date-text tabular-nums">{{ order.date }}</time>
            </div>
            <BaseBadge variant="completed" size="md">Completed</BaseBadge>
          </header>

          <div class="order-items-summary">
            <div
              v-for="(item, idx) in order.items"
              :key="idx"
              class="item-line"
            >
              <span>{{ item.quantity }}x {{ item.name }}</span>
              <span v-if="item.custom_notes" class="item-note">({{ item.custom_notes }})</span>
            </div>
          </div>

          <footer class="order-card-footer">
            <div class="order-cost-info">
              <span class="cost-label">Total:</span>
              <span class="cost-value tabular-nums">₱{{ order.total.toFixed(2) }}</span>
              <span class="payment-method-text">({{ order.payment_method }})</span>
            </div>

            <div class="card-action-btns">
              <BaseButton
                v-if="!order.has_feedback"
                variant="outline"
                size="sm"
                @click="openFeedbackModal(order)"
              >
                ★ Rate Meal
              </BaseButton>
              <BaseBadge v-else variant="ready" size="sm">
                ✓ Reviewed
              </BaseBadge>

              <BaseButton
                variant="primary"
                size="sm"
                @click="handleReorder(order)"
              >
                ↻ 1-Click Reorder
              </BaseButton>
            </div>
          </footer>
        </article>
      </div>
    </section>

    <!-- Section B: Favorites -->
    <section v-else-if="activeTab === 'favorites'" class="tab-content">
      <div class="favorites-grid">
        <article
          v-for="fav in favoriteItems"
          :key="fav.id"
          class="favorite-card"
        >
          <span class="fav-emoji" aria-hidden="true">{{ fav.emoji }}</span>
          <div class="fav-info">
            <h3 class="fav-name">{{ fav.name }}</h3>
            <p class="fav-desc">{{ fav.desc }}</p>
            <span class="fav-price tabular-nums">₱{{ fav.price.toFixed(2) }}</span>
          </div>
          <BaseButton
            variant="primary"
            size="sm"
            @click="handleAddFavoriteToCart(fav)"
          >
            + Add to Cart
          </BaseButton>
        </article>
      </div>
    </section>

    <!-- Feedback Rating Modal -->
    <FeedbackModal
      :is-open="isFeedbackModalOpen"
      :order-uuid="selectedOrderForFeedback?.order_uuid"
      :queue-number="selectedOrderForFeedback?.queue_number"
      @close="isFeedbackModalOpen = false"
      @submitted="handleFeedbackSubmitted"
    />
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.profile-header-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  box-shadow: var(--shadow-subtle);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--color-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.profile-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.profile-stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--color-bg-subtle);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
}

.stat-number {
  font-size: 24px;
  font-weight: 900;
  color: var(--color-primary-base);
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.reorder-toast {
  background-color: var(--status-ready-bg);
  border: 1px solid var(--status-ready-accent);
  color: var(--status-ready-text);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 14px;
  margin-bottom: var(--space-4);
}

.profile-tabs {
  display: inline-flex;
  background-color: var(--color-bg-subtle);
  padding: 4px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  margin-bottom: var(--space-6);
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.tab-btn.active {
  background-color: var(--color-bg-surface);
  color: var(--color-primary-base);
  box-shadow: var(--shadow-subtle);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-history-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-4) var(--space-6);
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.order-queue-badge {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-primary-base);
  margin-right: 8px;
}

.order-date-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

.order-items-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-line {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.item-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-left: 6px;
}

.order-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.order-cost-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cost-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.cost-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.payment-method-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

.card-action-btns {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.favorite-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-4);
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.fav-emoji {
  font-size: 36px;
}

.fav-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.fav-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.fav-price {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-primary-base);
}

.empty-state {
  text-align: center;
  padding: var(--space-12) var(--space-4);
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>

