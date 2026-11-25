<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/common/BaseButton.vue'
import BaseBadge from '../components/common/BaseBadge.vue'
import BaseModal from '../components/common/BaseModal.vue'
import FeedbackModal from '../components/orders/FeedbackModal.vue'
import ReceiptView from '../components/orders/ReceiptView.vue'
import { useCart } from '../composables/useCart'
import { useAuth } from '../composables/useAuth'
import { api } from '../services/api'

const router = useRouter()
const { addItem } = useCart()
const { user } = useAuth()
const isCustomer = computed(() => user.value?.role === 'customer')
const isStaff = computed(() => user.value?.role === 'staff')
const isAdmin = computed(() => user.value?.role === 'admin')

const roleLabel = computed(() => {
  if (isAdmin.value) return 'Administrator'
  if (isStaff.value) return 'Canteen Staff'
  return 'Customer'
})

const profileDescription = computed(() => {
  if (isAdmin.value) {
    return 'Canteen Administrator • Manages and oversees canteen operations'
  }

  if (isStaff.value) {
    return 'Canteen Staff • Handles customer orders and food preparation'
  }

  return 'Campus Customer'
})

const activeTab = ref('history')
const isFeedbackModalOpen = ref(false)
const selectedOrderForFeedback = ref(null)
const isReceiptModalOpen = ref(false)
const selectedOrderForReceipt = ref(null)
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

const favoriteItems = ref([])

onMounted(async () => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('canteena_order_history') || '[]')
    if (savedHistory.length > 0) {
      pastOrders.value = savedHistory
    }
  } catch {
    // fallback
  }

  const token = localStorage.getItem('canteena_token')
  if (token) {
    try {
      const ordersRes = await api.get('/customer/orders')
      const backendOrders = ordersRes.data?.orders || []
      if (backendOrders.length > 0) {
        pastOrders.value = backendOrders.map((bo) => ({
          order_uuid: bo.order_uuid || bo.uuid,
          queue_number: bo.queue_number,
          date: bo.date,
          created_at: bo.created_at,
          customer_name: bo.customer_name,
          status: bo.status,
          total: Number(bo.total || bo.total_amount || 0),
          payment_method: bo.payment_method,
          payment: bo.payment,
          has_feedback: Boolean(bo.has_feedback),
          items: (bo.items || []).map((it) => ({
            id: it.id,
            name: it.name,
            price: Number(it.price || it.unit_price || 0),
            quantity: Number(it.quantity || 1),
            custom_notes: it.custom_notes || '',
          })),
        }))
      }
    } catch {
      // fallback to localStorage
    }

    try {
      const favRes = await api.get('/customer/favorites')
      const favs = favRes.data?.favorites || favRes.data?.items || []
      favoriteItems.value = favs.map((it) => ({
        id: it.id || it.menu_item_id,
        name: it.name,
        emoji: it.emoji || '🍽️',
        price: Number(it.price),
        category: it.category_name || it.category || 'Meals',
        desc: it.desc || it.description || '',
        isSoldOut: Boolean(it.is_sold_out || it.isSoldOut),
      }))
    } catch {
      favoriteItems.value = []
    }
  } else {
    favoriteItems.value = []
  }
})

async function handleRemoveFavorite(fav) {
  const prevList = [...favoriteItems.value]
  favoriteItems.value = favoriteItems.value.filter((item) => item.id !== fav.id)

  reorderSuccessMsg.value = `Removed ${fav.name} from favorites`
  setTimeout(() => {
    reorderSuccessMsg.value = ''
  }, 2000)

  try {
    await api.post('/customer/favorites/toggle', {
      menu_item_id: fav.id,
    })
  } catch (err) {
    favoriteItems.value = prevList
    console.error('Failed to remove favorite:', err)
  }
}

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

function openReceiptModal(order) {
  selectedOrderForReceipt.value = order
  isReceiptModalOpen.value = true
}

const formattedOrderForReceipt = computed(() => {
  if (!selectedOrderForReceipt.value) return null
  const o = selectedOrderForReceipt.value
  const isGcash = (o.payment_method || o.paymentMethod || '').toLowerCase().includes('gcash')
  return {
    id: o.order_uuid || o.uuid || o.id,
    queueNumber: o.queue_number || o.queueNumber || '#001',
    createdAt:
      o.date ||
      (o.created_at
        ? new Date(o.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleString()),
    customerName: o.customer_name || user.value?.name || 'Customer',
    paymentMethod: isGcash ? 'gcash' : 'cash',
    referenceNumber:
      o.payment?.reference_number ||
      o.referenceNumber ||
      (isGcash ? '902148192031' : ''),
    total: Number(o.total || o.total_amount || 0),
    items: (o.items || []).map((it) => ({
      name: it.name,
      price: Number(it.price || it.unit_price || 0),
      quantity: Number(it.quantity || 1),
      custom_notes: it.custom_notes || '',
    })),
  }
})

function openFeedbackModal(order) {
  selectedOrderForFeedback.value = order
  isFeedbackModalOpen.value = true
}

async function handleFeedbackSubmitted({ orderUuid, rating, comments }) {
  try {
    await api.post('/feedback', {
      order_id: orderUuid,
      rating,
      comments,
      user_id: user.value?.id,
    })
  } catch (err) {
    console.error('Failed to submit feedback to server:', err)
  }

  const o = pastOrders.value.find((x) => x.order_uuid === orderUuid)
  if (o) {
    o.has_feedback = true
  }

  try {
    const saved = JSON.parse(localStorage.getItem('canteena_order_history') || '[]')
    const match = saved.find((x) => x.order_uuid === orderUuid)
    if (match) {
      match.has_feedback = true
      localStorage.setItem('canteena_order_history', JSON.stringify(saved))
    }
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="profile-view">
    <!-- Profile Card Header -->
    <!-- Profile Card Header -->
<header class="profile-header-card">
  <div class="avatar-circle" aria-hidden="true">
    👤
  </div>

  <div class="profile-info">
    <h1 class="profile-name">
      {{ user?.name || 'User' }}
    </h1>

    <div class="profile-role">
      <span
        class="role-badge"
        :class="user?.role"
      >
        {{ roleLabel }}
      </span>

      <p class="profile-sub">
        {{ user?.email || 'No email available' }}
      </p>
    </div>

    <p class="profile-description">
      {{ profileDescription }}
    </p>
  </div>

  <!-- Customer-only order statistics -->
  <div v-if="isCustomer" class="profile-stat-box">
    <span class="stat-number tabular-nums">
      {{ pastOrders.length }}
    </span>
    <span class="stat-label">Orders Completed</span>
  </div>
</header>

<!-- General Information for Staff and Admin -->
<section v-if="!isCustomer" class="general-info-section">

  <div class="section-heading">
    <h2>General Information</h2>
    <p>Your account details and system role</p>
  </div>

  <div class="general-info-card">

    <div class="info-row">
      <div class="info-icon">👤</div>
      <div class="info-content">
        <span class="info-label">Full Name</span>
        <strong>{{ user?.name || 'Not available' }}</strong>
      </div>
    </div>

    <div class="info-row">
      <div class="info-icon">✉️</div>
      <div class="info-content">
        <span class="info-label">Email Address</span>
        <strong>{{ user?.email || 'Not available' }}</strong>
      </div>
    </div>

    <div class="info-row">
      <div class="info-icon">🛡️</div>
      <div class="info-content">
        <span class="info-label">Account Role</span>
        <strong>{{ roleLabel }}</strong>
      </div>
    </div>

    <div class="info-row">
      <div class="info-icon">📱</div>
      <div class="info-content">
        <span class="info-label">Phone Number</span>
        <strong>{{ user?.phone_number || 'Not provided' }}</strong>
      </div>
    </div>

    <div class="info-row">
      <div class="info-icon">🏢</div>
      <div class="info-content">
        <span class="info-label">Account Type</span>
        <strong>
          {{ isAdmin ? 'System Administrator' : 'Canteen Staff Account' }}
        </strong>
      </div>
    </div>

  </div>
</section>

    <!-- Notification Toast -->
    <Transition name="fade">
      <div v-if="reorderSuccessMsg" class="reorder-toast">
        ✓ {{ reorderSuccessMsg }}
      </div>
    </Transition>

    <!-- Tabs Navigation -->
    <nav
  v-if="isCustomer"
  class="profile-tabs"
  role="tablist"
  aria-label="Customer Profile Navigation"
>
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
                variant="outline"
                size="sm"
                @click="openReceiptModal(order)"
              >
                🧾 Receipt
              </BaseButton>

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
      <div v-if="favoriteItems.length === 0" class="empty-favorites-box">
        <span class="empty-fav-icon" aria-hidden="true">❤️</span>
        <h3 class="empty-fav-title">No Favorite Meals Yet</h3>
        <p class="empty-fav-sub">Heart your favorite canteen dishes on the menu to quickly find and order them here anytime!</p>
        <BaseButton variant="primary" size="md" @click="router.push('/')">
          Explore Menu
        </BaseButton>
      </div>

      <div v-else class="favorites-grid">
        <article
          v-for="fav in favoriteItems"
          :key="fav.id"
          class="favorite-card"
        >
          <button
            type="button"
            class="unheart-btn"
            title="Remove from favorites"
            aria-label="Remove from favorites"
            @click="handleRemoveFavorite(fav)"
          >
            ❤️
          </button>
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

    <!-- Digital Receipt Inspection Modal -->
    <BaseModal
      :is-open="isReceiptModalOpen"
      :title="`Order Receipt — ${selectedOrderForReceipt?.queue_number || ''}`"
      max-width="480px"
      @close="isReceiptModalOpen = false"
    >
      <ReceiptView
        v-if="formattedOrderForReceipt"
        :order="formattedOrderForReceipt"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
/* PROFILE ROLE */
.profile-role {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge.customer {
  background-color: #dcfce7;
  color: #15803d;
}

.role-badge.staff {
  background-color: #e0f2fe;
  color: #0369a1;
}

.role-badge.admin {
  background-color: #fee2e2;
  color: #991b1b;
}

.profile-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

/* GENERAL INFORMATION */
.general-info-section {
  margin-top: var(--space-6);
}

.section-heading {
  margin-bottom: var(--space-4);
}

.section-heading h2 {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.section-heading p {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.general-info-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-subtle);
  padding: var(--space-4) var(--space-6);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  font-size: 18px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
}

.info-content strong {
  font-size: 14px;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

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
  flex-wrap: wrap;
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
  position: relative;
}

.unheart-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: transform 0.15s ease;
  line-height: 1;
}

.unheart-btn:hover {
  transform: scale(1.2);
}

.empty-favorites-box {
  background-color: var(--color-bg-surface);
  border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-10) var(--space-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.empty-fav-icon {
  font-size: 40px;
}

.empty-fav-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.empty-fav-sub {
  font-size: 14px;
  color: var(--color-text-secondary);
  max-width: 400px;
  margin: 0 0 var(--space-2) 0;
  line-height: 1.5;
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

