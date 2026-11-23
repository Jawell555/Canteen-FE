<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseBadge from '../components/common/BaseBadge.vue'
import BaseAlert from '../components/common/BaseAlert.vue'
import BaseButton from '../components/common/BaseButton.vue'
import ReceiptView from '../components/orders/ReceiptView.vue'
import { useCart } from '../composables/useCart'

const route = useRoute()
const router = useRouter()
const { formattedHoldTime, isHoldActive } = useCart()

const orderId = route.params.id || '42'

// Mock order state (will connect to GET /orders/:id in backend integration)
const order = ref({
  id: orderId,
  queueNumber: '#042',
  status: 'preparing', // pending, preparing, ready, completed
  customerName: 'Juan Dela Cruz',
  createdAt: 'Nov 13, 2026 • 12:15 PM',
  paymentMethod: 'gcash',
  referenceNumber: '902148192031',
  items: [
    {
      name: 'Chicken Adobo with Rice',
      price: 85,
      quantity: 1,
      custom_notes: 'Penge sabaw sa hiwalay na cup',
    },
  ],
  total: 85,
})
</script>

<template>
  <div class="status-view">
    <div class="status-card">
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
