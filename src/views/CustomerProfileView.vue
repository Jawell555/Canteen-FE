<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
const { items: cartItems, addItem, isHoldActive, startHold } = useCart()
const { user, token, isAuthenticated } = useAuth()
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
const toastMessage = ref('')
const toastVariant = ref('success')
const isLoadingProfile = ref(false)
let toastTimer = null
let redirectTimer = null

const pastOrders = ref([])
const favoriteItems = ref([])
const liveMenuItems = ref([])

const liveMenuMap = computed(() => {
  const map = new Map()
  for (const item of liveMenuItems.value) {
    map.set(item.id, item)
  }
  return map
})

const cartQtyMap = computed(() => {
  const map = new Map()
  for (const item of cartItems.value) {
    map.set(item.menu_item_id, (map.get(item.menu_item_id) || 0) + (item.quantity || 0))
  }
  return map
})

const completedOrdersCount = computed(
  () => pastOrders.value.filter((o) => o.status === 'completed').length,
)

function showToast(message, variant = 'success', durationMs = 2500) {
  toastMessage.value = message
  toastVariant.value = variant
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, durationMs)
}

function getOrderStatusMeta(status) {
  switch (status) {
    case 'pending':
      return { variant: 'pending', label: 'Pending' }
    case 'preparing':
      return { variant: 'preparing', label: 'Preparing' }
    case 'ready':
      return { variant: 'ready', label: 'Ready for Pickup' }
    case 'cancelled':
      return { variant: 'danger', label: 'Cancelled' }
    case 'completed':
    default:
      return { variant: 'completed', label: 'Completed' }
  }
}

function getLiveItemStock(item) {
  const menuId = item.menu_item_id || item.id
  const live = liveMenuMap.value.get(menuId)
  const rawStock = live ? (live.stock ?? live.current_stock ?? 0) : (item.current_stock ?? item.stock ?? 0)
  const stock = Number(rawStock)
  const isSoldOut = live
    ? Boolean(live.is_sold_out || live.isSoldOut || stock <= 0)
    : Boolean(item.is_sold_out || item.isSoldOut || stock <= 0)
  const inCart = cartQtyMap.value.get(menuId) || 0
  const remaining = isSoldOut ? 0 : Math.max(0, stock - inCart)
  const price = live ? Number(live.price) : Number(item.price || item.unit_price || 0)

  return {
    menuId,
    stock,
    isSoldOut,
    remaining,
    price,
  }
}

function getOrderStockSummary(order) {
  const orderItems = order.items || []
  let availableCount = 0
  const unavailableNames = []
  const cappedNames = []

  for (const item of orderItems) {
    const info = getLiveItemStock(item)
    if (info.remaining <= 0) {
      unavailableNames.push(item.name)
    } else {
      availableCount += 1
      if (info.remaining < item.quantity) {
        cappedNames.push(`${item.name} (${info.remaining} left)`)
      }
    }
  }

  return {
    canReorder: availableCount > 0,
    allAvailable: unavailableNames.length === 0 && cappedNames.length === 0,
    unavailableNames,
    cappedNames,
  }
}

async function fetchCustomerData() {
  if (!token.value || !isCustomer.value) {
    pastOrders.value = []
    favoriteItems.value = []
    return
  }

  isLoadingProfile.value = true
  try {
    const [ordersRes, favRes, menuRes] = await Promise.all([
      api.get('/customer/orders').catch(() => null),
      api.get('/customer/favorites').catch(() => null),
      api.get('/menu/items').catch(() => null),
    ])

    if (menuRes?.data?.items) {
      liveMenuItems.value = menuRes.data.items
    }

    if (ordersRes?.data?.orders) {
      pastOrders.value = ordersRes.data.orders.map((bo) => ({
        order_uuid: bo.order_uuid || bo.uuid,
        queue_number: bo.queue_number,
        date: bo.date,
        created_at: bo.created_at,
        customer_name: bo.customer_name,
        status: bo.status || 'pending',
        total: Number(bo.total || bo.total_amount || 0),
        payment_method: bo.payment_method,
        payment: bo.payment,
        has_feedback: Boolean(bo.has_feedback),
        items: (bo.items || []).map((it) => ({
          id: it.menu_item_id || it.id,
          menu_item_id: it.menu_item_id || it.id,
          name: it.name,
          price: Number(it.price || it.unit_price || 0),
          quantity: Number(it.quantity || 1),
          custom_notes: it.custom_notes || '',
          current_stock: Number(it.current_stock ?? 0),
          is_sold_out: Boolean(it.is_sold_out),
          is_available: Boolean(it.is_available),
        })),
      }))
    }

    if (favRes?.data?.favorites || favRes?.data?.items) {
      const favs = favRes.data.favorites || favRes.data.items || []
      favoriteItems.value = favs.map((it) => ({
        id: it.id || it.menu_item_id,
        menu_item_id: it.menu_item_id || it.id,
        name: it.name,
        emoji: it.emoji || '🍽️',
        price: Number(it.price),
        category: it.category_name || it.category || 'Meals',
        desc: it.desc || it.description || '',
        stock: Number(it.stock ?? it.current_stock ?? 0),
        current_stock: Number(it.current_stock ?? it.stock ?? 0),
        isSoldOut: Boolean(it.is_sold_out || it.isSoldOut),
      }))
    } else {
      favoriteItems.value = []
    }
  } finally {
    isLoadingProfile.value = false
  }
}

watch(
  () => [user.value?.id, user.value?.role],
  () => {
    fetchCustomerData()
  },
)

onMounted(() => {
  fetchCustomerData()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (redirectTimer) clearTimeout(redirectTimer)
})

async function handleRemoveFavorite(fav) {
  const prevList = [...favoriteItems.value]
  favoriteItems.value = favoriteItems.value.filter((item) => item.id !== fav.id)

  showToast(`Removed ${fav.name} from favorites`)

  try {
    await api.post('/customer/favorites/toggle', {
      menu_item_id: fav.id,
    })
  } catch (err) {
    favoriteItems.value = prevList
    console.error('Failed to remove favorite:', err)
  }
}

async function handleReorder(order) {
  // Refresh live menu stock before adding items so we never oversell
  try {
    const menuRes = await api.get('/menu/items')
    if (menuRes?.data?.items) {
      liveMenuItems.value = menuRes.data.items
    }
  } catch {
    // Proceed with latest fetched stock snapshot
  }

  let addedUnits = 0
  const skippedItems = []
  const cappedItems = []

  for (const item of order.items || []) {
    const info = getLiveItemStock(item)
    if (!info.menuId || info.remaining <= 0) {
      skippedItems.push(item.name)
      continue
    }

    const qtyToAdd = Math.min(item.quantity, info.remaining)
    if (qtyToAdd < item.quantity) {
      cappedItems.push(`${item.name} (${qtyToAdd} of ${item.quantity})`)
    }

    try {
      await addItem(
        {
          id: info.menuId,
          name: item.name,
          price: info.price,
          stock: info.stock,
        },
        qtyToAdd,
        item.custom_notes,
      )
      addedUnits += qtyToAdd
    } catch {
      skippedItems.push(item.name)
    }
  }

  if (addedUnits === 0) {
    showToast(`Sorry, all items in ${order.queue_number} are currently out of stock.`, 'warning', 3200)
    return
  }

  if (!isHoldActive.value) {
    startHold(10)
  }

  if (skippedItems.length > 0 || cappedItems.length > 0) {
    const notes = []
    if (skippedItems.length > 0) notes.push(`Out of stock: ${skippedItems.join(', ')}`)
    if (cappedItems.length > 0) notes.push(`Adjusted stock: ${cappedItems.join(', ')}`)
    showToast(`Added available items from ${order.queue_number}. ${notes.join(' • ')}`, 'warning', 3500)
  } else {
    showToast(`Added items from ${order.queue_number} to your cart!`, 'success', 1500)
  }

  if (redirectTimer) clearTimeout(redirectTimer)
  redirectTimer = setTimeout(() => {
    router.push('/checkout')
  }, 850)
}

async function handleAddFavoriteToCart(fav) {
  const info = getLiveItemStock(fav)
  if (info.remaining <= 0) {
    showToast(`${fav.name} has no available stock remaining.`, 'warning')
    return
  }

  try {
    await addItem(
      {
        id: info.menuId,
        name: fav.name,
        price: info.price,
        emoji: fav.emoji,
        stock: info.stock,
      },
      1,
    )
    if (!isHoldActive.value) {
      startHold(10)
    }
    showToast(`Added ${fav.name} to cart!`)
  } catch (err) {
    showToast(err.message || `Could not add ${fav.name} to cart.`, 'warning')
  }
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
      {{ completedOrdersCount }}
    </span>
    <span class="stat-label">Orders Completed</span>
  </div>
</header>

<!-- Unauthenticated Guest Notice -->
<section v-if="!isAuthenticated" class="empty-favorites-box">
  <span class="empty-fav-icon" aria-hidden="true">🔐</span>
  <h2 class="empty-fav-title">Sign in to view your profile</h2>
  <p class="empty-fav-sub">Log in as a customer to see your saved favorite meals and order history.</p>
  <BaseButton variant="primary" size="md" @click="router.push('/')">
    Browse Today's Menu
  </BaseButton>
</section>

<!-- General Information for Staff and Admin -->
<section v-else-if="!isCustomer" class="general-info-section">

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

    <template v-if="isCustomer">
      <!-- Notification Toast -->
      <Transition name="fade">
        <div
          v-if="toastMessage"
          class="reorder-toast"
          :class="{ warning: toastVariant === 'warning' }"
          role="status"
          aria-live="polite"
        >
          {{ toastVariant === 'warning' ? '⚠️' : '✓' }} {{ toastMessage }}
        </div>
      </Transition>

      <!-- Tabs Navigation -->
      <nav
        class="profile-tabs"
        role="tablist"
        aria-label="Customer Profile Navigation"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'history'"
          class="tab-btn"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          📋 Order History ({{ pastOrders.length }})
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'favorites'"
          class="tab-btn"
          :class="{ active: activeTab === 'favorites' }"
          @click="activeTab = 'favorites'"
        >
          ❤️ Favorite Meals ({{ favoriteItems.length }})
        </button>
      </nav>

      <!-- Section A: Order History -->
      <section v-if="activeTab === 'history'" class="tab-content">
        <div v-if="isLoadingProfile" class="empty-state">
          <p>Loading your order history...</p>
        </div>

        <div v-else-if="pastOrders.length === 0" class="empty-favorites-box">
          <span class="empty-fav-icon" aria-hidden="true">🧾</span>
          <h3 class="empty-fav-title">No Orders Yet</h3>
          <p class="empty-fav-sub">Your canteen orders will appear here once you place an order while signed in.</p>
          <BaseButton variant="primary" size="md" @click="router.push('/')">
            Browse Today's Menu
          </BaseButton>
        </div>

        <div v-else class="orders-list">
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
              <BaseBadge :variant="getOrderStatusMeta(order.status).variant" size="md">
                {{ getOrderStatusMeta(order.status).label }}
              </BaseBadge>
            </header>

            <div class="order-items-summary">
              <div
                v-for="(item, idx) in order.items"
                :key="idx"
                class="item-line"
              >
                <span>{{ item.quantity }}x {{ item.name }}</span>
                <span v-if="item.custom_notes" class="item-note">({{ item.custom_notes }})</span>
                <span
                  v-if="getLiveItemStock(item).remaining <= 0"
                  class="item-stock-tag sold-out"
                >
                  Out of stock
                </span>
                <span
                  v-else-if="getLiveItemStock(item).remaining < item.quantity"
                  class="item-stock-tag low-stock tabular-nums"
                >
                  Only {{ getLiveItemStock(item).remaining }} left
                </span>
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
                  v-if="order.status === 'completed' && !order.has_feedback"
                  variant="outline"
                  size="sm"
                  @click="openFeedbackModal(order)"
                >
                  ★ Rate Meal
                </BaseButton>
                <BaseBadge v-else-if="order.has_feedback" variant="ready" size="sm">
                  ✓ Reviewed
                </BaseBadge>

                <BaseButton
                  variant="primary"
                  size="sm"
                  :disabled="!getOrderStockSummary(order).canReorder"
                  @click="handleReorder(order)"
                >
                  {{ getOrderStockSummary(order).canReorder ? '↻ Buy Again' : 'Out of Stock' }}
                </BaseButton>
              </div>
            </footer>
          </article>
        </div>
      </section>

      <!-- Section B: Favorites -->
      <section v-else-if="activeTab === 'favorites'" class="tab-content">
        <div v-if="isLoadingProfile" class="empty-state">
          <p>Loading your favorite meals...</p>
        </div>

        <div v-else-if="favoriteItems.length === 0" class="empty-favorites-box">
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
            :class="{ 'sold-out': getLiveItemStock(fav).remaining <= 0 }"
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
            <div class="fav-top-row">
              <span class="fav-emoji" aria-hidden="true">{{ fav.emoji }}</span>
              <BaseBadge
                v-if="getLiveItemStock(fav).isSoldOut"
                variant="danger"
                size="sm"
              >
                Sold Out
              </BaseBadge>
              <BaseBadge
                v-else
                variant="ready"
                size="sm"
              >
                {{ getLiveItemStock(fav).remaining }} left
              </BaseBadge>
            </div>
            <div class="fav-info">
              <h3 class="fav-name">{{ fav.name }}</h3>
              <p class="fav-desc">{{ fav.desc }}</p>
              <span class="fav-price tabular-nums">₱{{ getLiveItemStock(fav).price.toFixed(2) }}</span>
            </div>
            <BaseButton
              variant="primary"
              size="sm"
              :disabled="getLiveItemStock(fav).remaining <= 0"
              @click="handleAddFavoriteToCart(fav)"
            >
              {{
                getLiveItemStock(fav).isSoldOut
                  ? 'Sold Out'
                  : getLiveItemStock(fav).remaining <= 0
                    ? 'Max in Cart'
                    : '+ Add to Cart'
              }}
            </BaseButton>
          </article>
        </div>
      </section>
    </template>

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

.reorder-toast.warning {
  background-color: var(--status-pending-bg);
  border-color: var(--status-pending-accent);
  color: var(--status-pending-text);
}

.profile-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
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
  min-height: 44px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background-color 180ms cubic-bezier(0.23, 1, 0.32, 1), color 180ms ease, transform 120ms ease;
  touch-action: manipulation;
  user-select: none;
}

.tab-btn:active {
  transform: scale(0.97);
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.item-stock-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.item-stock-tag.sold-out {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
}

.item-stock-tag.low-stock {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text);
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

.favorite-card.sold-out {
  opacity: 0.78;
}

.fav-top-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: 44px;
}

.unheart-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
  line-height: 1;
  touch-action: manipulation;
  user-select: none;
}

.unheart-btn:active {
  transform: scale(0.9);
}

@media (hover: hover) and (pointer: fine) {
  .unheart-btn:hover {
    transform: scale(1.15);
  }
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

