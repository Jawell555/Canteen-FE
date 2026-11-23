<script setup>
import BaseBadge from '../common/BaseBadge.vue'
import BaseButton from '../common/BaseButton.vue'

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['advance-status', 'view-proof'])

function handleNextStep() {
  if (props.order.status === 'pending') {
    emit('advance-status', { orderUuid: props.order.order_uuid, nextStatus: 'preparing' })
  } else if (props.order.status === 'preparing') {
    emit('advance-status', { orderUuid: props.order.order_uuid, nextStatus: 'ready' })
  } else if (props.order.status === 'ready') {
    emit('advance-status', { orderUuid: props.order.order_uuid, nextStatus: 'completed' })
  }
}
</script>

<template>
  <article class="order-queue-card">
    <!-- Queue Card Header -->
    <header class="queue-card-top">
      <div class="queue-no-group">
        <span class="queue-no tabular-nums">{{ order.queue_number }}</span>
        <time class="order-time tabular-nums">{{ order.created_at }}</time>
      </div>

      <BaseBadge
        v-if="order.status === 'pending'"
        variant="pending"
        size="md"
      >
        Hold ({{ Math.floor(order.hold_seconds_remaining / 60) }}:{{ String(order.hold_seconds_remaining % 60).padStart(2, '0') }})
      </BaseBadge>
      <BaseBadge
        v-else-if="order.status === 'preparing'"
        variant="preparing"
        size="md"
      >
        Cooking
      </BaseBadge>
      <BaseBadge
        v-else-if="order.status === 'ready'"
        variant="ready"
        size="md"
      >
        Ready at Counter
      </BaseBadge>
    </header>

    <!-- Customer & Payment Details -->
    <div class="customer-info-row">
      <span class="customer-name">{{ order.customer_name }}</span>
      <span class="order-total tabular-nums">₱{{ Number(order.total_amount).toFixed(2) }}</span>
    </div>

    <!-- Items List with Highlighted Notes -->
    <div class="items-list">
      <div
        v-for="(item, idx) in order.items"
        :key="idx"
        class="order-item-line"
      >
        <div class="item-name-qty">
          <span class="item-qty tabular-nums">{{ item.quantity }}x</span>
          <span class="item-name">{{ item.name }}</span>
        </div>
        <div v-if="item.custom_notes" class="order-note-alert">
          ⚠️ Note: "{{ item.custom_notes }}"
        </div>
      </div>
    </div>

    <!-- Payment Status Meta -->
    <div class="payment-meta-tag">
      <span v-if="order.payment?.method === 'gcash'" class="payment-method-chip gcash">
        📱 GCash: {{ order.payment.status === 'verified' ? 'Verified' : 'Unverified' }}
      </span>
      <span v-else class="payment-method-chip cash">
        💵 Cash at Counter
      </span>
    </div>

    <!-- Operational Touch Actions (>= 48px height) -->
    <div class="card-actions">
      <!-- Pending stage actions -->
      <template v-if="order.status === 'pending'">
        <BaseButton
          v-if="order.payment?.method === 'gcash'"
          variant="outline"
          size="md"
          class="touch-target-staff"
          @click="$emit('view-proof', order)"
        >
          Inspect Proof
        </BaseButton>
        <BaseButton
          variant="primary"
          size="md"
          class="touch-target-staff flex-1"
          @click="handleNextStep"
        >
          Confirm & Cook →
        </BaseButton>
      </template>

      <!-- Preparing stage actions -->
      <template v-else-if="order.status === 'preparing'">
        <BaseButton
          variant="primary"
          size="lg"
          block
          class="touch-target-staff ready-action-btn"
          @click="handleNextStep"
        >
          ✓ Mark Ready for Pickup
        </BaseButton>
      </template>

      <!-- Ready stage actions -->
      <template v-else-if="order.status === 'ready'">
        <BaseButton
          variant="primary"
          size="lg"
          block
          class="touch-target-staff handover-action-btn"
          @click="handleNextStep"
        >
          🎉 Complete Handover
        </BaseButton>
      </template>
    </div>
  </article>
</template>

<style scoped>
.order-queue-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-4);
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: box-shadow 0.15s ease;
}

.order-queue-card:hover {
  box-shadow: var(--shadow-card);
}

.queue-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.queue-no-group {
  display: flex;
  flex-direction: column;
}

.queue-no {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-primary-base);
  line-height: 1;
}

.order-time {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 3px;
}

.customer-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
}

.customer-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.order-total {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.order-item-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name-qty {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.item-qty {
  font-weight: 800;
  color: var(--color-primary-base);
  font-size: 14px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.order-note-alert {
  font-size: 12px;
  font-weight: 700;
  color: #B45309;
  background-color: #FEF3C7;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  margin-top: 2px;
}

.payment-meta-tag {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.payment-method-chip {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.payment-method-chip.gcash {
  background-color: #EFF6FF;
  color: #1D4ED8;
}

.payment-method-chip.cash {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}

.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.flex-1 {
  flex: 1;
}

.ready-action-btn {
  background-color: var(--status-preparing-accent);
}
.ready-action-btn:hover {
  background-color: #C2410C;
}

.handover-action-btn {
  background-color: var(--status-ready-accent);
}
.handover-action-btn:hover {
  background-color: #166534;
}
</style>

