<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseBadge from '../components/common/BaseBadge.vue'
import BaseAlert from '../components/common/BaseAlert.vue'
import BaseButton from '../components/common/BaseButton.vue'
import ReceiptView from '../components/orders/ReceiptView.vue'
import { useCart } from '../composables/useCart'
import { api } from '../services/api'

const route = useRoute()
const router = useRouter()
const { formattedHoldTime, isHoldActive } = useCart()

const activeOrderId = ref(route.params.id || localStorage.getItem('canteena_last_order') || '')
const isLoading = ref(false)
let pollTimer = null

// Order state (connected to GET /orders/:id)
const order = ref(null)

async function fetchOrderDetails() {
  const currentId = activeOrderId.value
  if (!currentId) return

  try {
    const res = await api.get(`/orders/${currentId}`)
    const d = res.data?.order || res.data
    if (d) {
      order.value = {
        id: d.uuid || d.id,
        queueNumber:
          res.data?.queue_number ||
          d.formatted_queue_number ||
          `#${String(d.daily_queue_number || 1).padStart(3, '0')}`,
        status: d.status || 'pending',
        customerName: d.customer_name || 'Customer',
        createdAt: d.created_at
          ? new Date(d.created_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleDateString(),
        paymentMethod: d.payment_record?.method || d.payment?.method || 'gcash',
        referenceNumber:
          d.payment_record?.reference_number || d.payment?.reference_number || '',
        items: (d.order_items || d.items || []).map((it) => ({
          name: it.item_name || it.menu_item?.name || 'Item',
          price: Number(it.unit_price || 0),
          quantity: Number(it.quantity || 1),
          custom_notes: it.custom_notes || '',
        })),
        total: Number(d.total_amount || 0),
      }

      if (['completed', 'cancelled'].includes(order.value.status)) {
        stopPolling()
      }
    }
  } catch (err) {
    console.error('Error fetching order details:', err)
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(fetchOrderDetails, 4000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  isLoading.value = true
  await fetchOrderDetails()
  isLoading.value = false
  if (order.value && !['completed', 'cancelled'].includes(order.value.status)) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="status-view">
    <!-- Empty Tracking State -->
    <div v-if="!activeOrderId || (!order && !isLoading)" class="status-card text-center empty-state" style="text-align: center; padding: 48px 24px;">
      <span class="empty-icon" style="font-size: 44px; display: block; margin-bottom: 12px;" aria-hidden="true">📋</span>
      <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 8px; color: var(--color-text-primary);">No Active Order to Track</h2>
      <p style="font-size: 14px; color: var(--color-text-secondary); max-width: 420px; margin: 0 auto 24px; line-height: 1.5;">
        You don't have an active meal order in progress. Browse today's canteen specials to place an order and track its real-time kitchen preparation!
      </p>
      <BaseButton variant="primary" size="md" @click="router.push('/')">
        Browse Today's Menu
      </BaseButton>
    </div>

    <!-- Active Order Card -->
    <div v-else-if="order" class="status-card">
      <!-- Hold alert if order is pending payment -->
      <BaseAlert
        v-if="order.status === 'pending' && isHoldActive"
        variant="warning"
        title="Payment Hold Active"
      >
        Your meal reservation expires in <strong class="tabular-nums">{{ formattedHoldTime }}</strong>.
      </BaseAlert>

      <!-- Ready for pickup alert if ready -->
      <BaseAlert
        v-if="order.status === 'ready'"
        variant="success"
        title="Ready for Pickup!"
      >
        Your order is ready at the counter. Please show your queue number <strong>{{ order.queueNumber }}</strong>.
      </BaseAlert>

      <div class="queue-badge-container">
        <span class="queue-label">Daily Queue Number</span>
        <h1 class="queue-number tabular-nums">{{ order.queueNumber }}</h1>
        <BaseBadge
          v-if="order.status === 'pending'"
          variant="pending"
          size="md"
        >
          Pending Payment
        </BaseBadge>
        <BaseBadge
          v-else-if="order.status === 'preparing'"
          variant="preparing"
          size="md"
        >
          Preparing in Kitchen
        </BaseBadge>
        <BaseBadge
          v-else-if="order.status === 'ready'"
          variant="ready"
          size="md"
        >
          Ready for Counter Pickup
        </BaseBadge>
        <BaseBadge
          v-else
          variant="completed"
          size="md"
        >
          Completed
        </BaseBadge>
      </div>

      <!-- Step Timeline -->
      <div class="status-timeline" role="progressbar" aria-label="Order status progress">
        <div class="step" :class="{ completed: ['pending', 'preparing', 'ready', 'completed'].includes(order.status) }">
          <div class="step-dot">✓</div>
          <span class="step-text">Placed</span>
        </div>
        <div class="step" :class="{ completed: ['preparing', 'ready', 'completed'].includes(order.status) }">
          <div class="step-dot">✓</div>
          <span class="step-text">Confirmed</span>
        </div>
        <div
          class="step"
          :class="{
            active: order.status === 'preparing',
            completed: ['ready', 'completed'].includes(order.status)
          }"
        >
          <div class="step-dot">🍳</div>
          <span class="step-text">Cooking</span>
        </div>
        <div
          class="step"
          :class="{
            active: order.status === 'ready',
            completed: order.status === 'completed'
          }"
        >
          <div class="step-dot">🍽️</div>
          <span class="step-text">Ready</span>
        </div>
      </div>

      <!-- Printable & Downloadable Digital Thermal Receipt -->
      <ReceiptView :order="order" />

      <div class="back-action-bar">
        <BaseButton variant="ghost" size="md" @click="router.push('/')">
          ← Back to Menu
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-view {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.status-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.queue-badge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.queue-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.queue-number {
  font-size: 52px;
  font-weight: 900;
  color: var(--color-primary-base);
  line-height: 1;
}

.status-timeline {
  display: flex;
  justify-content: space-between;
  margin: var(--space-6) 0;
  position: relative;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: var(--color-bg-subtle);
  border: 2px solid var(--color-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.step.completed .step-dot {
  background-color: var(--status-ready-bg);
  border-color: var(--status-ready-accent);
  color: var(--status-ready-accent);
}

.step.active .step-dot {
  background-color: var(--status-preparing-bg);
  border-color: var(--status-preparing-accent);
  color: var(--status-preparing-accent);
  box-shadow: 0 0 0 4px var(--color-primary-subtle);
}

.step-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.back-action-bar {
  margin-top: var(--space-6);
  display: flex;
  justify-content: center;
}
</style>
