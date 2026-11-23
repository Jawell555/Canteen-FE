<script setup>
import { ref } from 'vue'
import OrderQueueCard from '../components/staff/OrderQueueCard.vue'
import PaymentProofModal from '../components/staff/PaymentProofModal.vue'
import { useStaffQueue } from '../composables/useStaffQueue'

const {
  menuItems,
  isPolling,
  pendingOrders,
  preparingOrders,
  readyOrders,
  counts,
  advanceOrderStatus,
  confirmPayment,
  rejectPayment,
  toggleSoldOut,
  startPolling,
  stopPolling,
} = useStaffQueue()

const selectedProofOrder = ref(null)
const isProofModalOpen = ref(false)

function handleViewProof(order) {
  selectedProofOrder.value = order
  isProofModalOpen.value = true
}

function handleCloseProofModal() {
  isProofModalOpen.value = false
  selectedProofOrder.value = null
}

function handleAdvanceStatus({ orderUuid, nextStatus }) {
  advanceOrderStatus(orderUuid, nextStatus)
}

function handleVerifyPayment(orderUuid) {
  confirmPayment(orderUuid)
}

function handleRejectPayment({ orderUuid, reason }) {
  rejectPayment(orderUuid, reason)
}

function togglePolling() {
  if (isPolling.value) {
    stopPolling()
  } else {
    startPolling(5000)
  }
}
</script>

<template>
  <div class="staff-dashboard">
    <!-- Operational Header (Touchscreen Friendly) -->
    <header class="staff-header">
      <div class="header-left">
        <h1 class="staff-title">Kitchen & Counter Queue</h1>
        <div class="queue-meta">
          <span class="active-pulse" :class="{ paused: !isPolling }"></span>
          <span class="meta-status">
            {{ isPolling ? 'Live Polling (5s interval)' : 'Polling Paused' }}
          </span>
          <button
            type="button"
            class="toggle-polling-btn"
            @click="togglePolling"
          >
            {{ isPolling ? 'Pause' : 'Resume' }}
          </button>
        </div>
      </div>

      <!-- Quick Sold-Out Strip for Rush Hours -->
      <div class="sold-out-strip" aria-label="Rush hour quick sold-out toggles">
        <span class="strip-label">⚡ Rush Sold-Out:</span>
        <button
          v-for="item in menuItems"
          :key="item.id"
          type="button"
          class="quick-toggle touch-target-staff"
          :class="{ 'sold-out': item.isSoldOut }"
          @click="toggleSoldOut(item.id)"
        >
          {{ item.emoji }} {{ item.name }}
          <span class="stock-sub tabular-nums">({{ item.isSoldOut ? 'Sold Out' : item.stock }})</span>
        </button>
      </div>
    </header>

    <!-- 3-Column Kanban Board (Operate Mode: 1024px+ Tablet Landscape) -->
    <main class="kanban-grid">
      <!-- Column 1: Pending Payment & Hold Verification -->
      <section class="kanban-col">
        <header class="col-header pending-header">
          <span class="col-title">1. Pending Payment</span>
          <span class="col-count tabular-nums">{{ counts.pending }}</span>
        </header>

        <div class="cards-list">
          <div v-if="pendingOrders.length === 0" class="empty-column-state">
            <span>✨ No pending orders</span>
          </div>
          <OrderQueueCard
            v-for="order in pendingOrders"
            :key="order.order_uuid"
            :order="order"
            @advance-status="handleAdvanceStatus"
            @view-proof="handleViewProof"
          />
        </div>
      </section>

      <!-- Column 2: Preparing / Cooking -->
      <section class="kanban-col">
        <header class="col-header preparing-header">
          <span class="col-title">2. Cooking in Kitchen</span>
          <span class="col-count tabular-nums">{{ counts.preparing }}</span>
        </header>

        <div class="cards-list">
          <div v-if="preparingOrders.length === 0" class="empty-column-state">
            <span>🍳 Kitchen queue clear</span>
          </div>
          <OrderQueueCard
            v-for="order in preparingOrders"
            :key="order.order_uuid"
            :order="order"
            @advance-status="handleAdvanceStatus"
          />
        </div>
      </section>

      <!-- Column 3: Ready for Pickup -->
      <section class="kanban-col">
        <header class="col-header ready-header">
          <span class="col-title">3. Ready for Counter Pickup</span>
          <span class="col-count tabular-nums">{{ counts.ready }}</span>
        </header>

        <div class="cards-list">
          <div v-if="readyOrders.length === 0" class="empty-column-state">
            <span>🍽️ No items waiting at counter</span>
          </div>
          <OrderQueueCard
            v-for="order in readyOrders"
            :key="order.order_uuid"
            :order="order"
            @advance-status="handleAdvanceStatus"
          />
        </div>
      </section>
    </main>

    <!-- GCash Payment Proof Inspection Modal -->
    <PaymentProofModal
      :is-open="isProofModalOpen"
      :order="selectedProofOrder"
      @close="handleCloseProofModal"
      @verify="handleVerifyPayment"
      @reject="handleRejectPayment"
    />
  </div>
</template>

<style scoped>
.staff-dashboard {
  padding: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
}

.staff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-4);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.staff-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.queue-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.active-pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--status-ready-accent);
  box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.25);
}

.active-pulse.paused {
  background-color: var(--color-text-muted);
  box-shadow: none;
}

.toggle-polling-btn {
  background: transparent;
  border: 1px solid var(--color-border-default);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.toggle-polling-btn:hover {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.sold-out-strip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background-color: var(--color-bg-surface);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  flex-wrap: wrap;
}

.strip-label {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.quick-toggle {
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.quick-toggle:hover {
  border-color: var(--color-primary-base);
}

.quick-toggle.sold-out {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
  border-color: rgba(220, 38, 38, 0.4);
}

.stock-sub {
  font-size: 11px;
  opacity: 0.75;
}

.kanban-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.kanban-col {
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 620px;
}

.col-header {
  padding: var(--space-4);
  font-weight: 800;
  font-size: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pending-header {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text);
  border-bottom: 2px solid var(--status-pending-accent);
}

.preparing-header {
  background-color: var(--status-preparing-bg);
  color: var(--status-preparing-text);
  border-bottom: 2px solid var(--status-preparing-accent);
}

.ready-header {
  background-color: var(--status-ready-bg);
  color: var(--status-ready-text);
  border-bottom: 2px solid var(--status-ready-accent);
}

.col-count {
  background-color: var(--color-bg-surface);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 800;
}

.cards-list {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.empty-column-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-4);
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .kanban-grid {
    grid-template-columns: 1fr;
  }
}
</style>
