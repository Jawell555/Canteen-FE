<script setup>
import { ref } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseAlert from '../common/BaseAlert.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'verify', 'reject'])

const rejectReason = ref('')
const isRejecting = ref(false)

function handleVerify() {
  if (!props.order) return
  emit('verify', props.order.order_uuid)
  emit('close')
}

function handleStartReject() {
  isRejecting.value = true
}

function handleConfirmReject() {
  if (!props.order) return
  emit('reject', {
    orderUuid: props.order.order_uuid,
    reason: rejectReason.value.trim() || 'Invalid GCash receipt proof',
  })
  isRejecting.value = false
  rejectReason.value = ''
  emit('close')
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="order ? `Verify Payment — ${order.queue_number}` : 'Verify Payment'"
    max-width="540px"
    @close="emit('close')"
  >
    <div v-if="order" class="proof-modal-content">
      <!-- Order Summary Strip -->
      <div class="summary-strip">
        <div>
          <span class="strip-label">Customer</span>
          <span class="strip-val">{{ order.customer_name }}</span>
        </div>
        <div class="text-right">
          <span class="strip-label">Amount to Collect</span>
          <span class="strip-val amount-val tabular-nums">₱{{ Number(order.total_amount).toFixed(2) }}</span>
        </div>
      </div>

      <!-- GCash Reference Number Box -->
      <div class="ref-box">
        <span class="ref-label">Submitted GCash Reference No.</span>
        <span class="ref-number tabular-nums">
          {{ order.payment?.reference_number || 'No Reference Provided' }}
        </span>
      </div>

      <!-- Proof Screenshot Display -->
      <div class="screenshot-container">
        <span class="screenshot-label">Uploaded Screenshot Proof:</span>
        <div v-if="order.payment?.proof_image_url" class="img-wrapper">
          <img
            :src="order.payment.proof_image_url"
            alt="GCash payment proof screenshot"
            class="proof-img"
          />
        </div>
        <div v-else class="no-proof-box">
          <span>⚠️ No proof image was uploaded with this order.</span>
        </div>
      </div>

      <!-- Reject Input Box if active -->
      <div v-if="isRejecting" class="reject-box">
        <BaseAlert variant="danger" title="Reject Payment">
          Please provide a reason. The inventory hold will be released back to the stock pool.
        </BaseAlert>
        <input
          v-model="rejectReason"
          type="text"
          class="reject-input"
          placeholder="e.g., Unclear screenshot / Reference number mismatch"
        />
      </div>
    </div>

    <template #footer>
      <div v-if="isRejecting" class="action-footer-group">
        <BaseButton variant="ghost" size="md" class="touch-target-staff" @click="isRejecting = false">
          Cancel
        </BaseButton>
        <BaseButton variant="danger" size="md" class="touch-target-staff" @click="handleConfirmReject">
          Confirm Rejection
        </BaseButton>
      </div>

      <div v-else class="action-footer-group">
        <BaseButton variant="outline" size="md" class="touch-target-staff" @click="handleStartReject">
          Reject Payment
        </BaseButton>
        <BaseButton variant="primary" size="md" class="touch-target-staff" @click="handleVerify">
          ✓ Confirm Payment & Start Cooking
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.proof-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.summary-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-subtle);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
}

.strip-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.strip-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.amount-val {
  font-size: 18px;
  color: var(--color-primary-base);
}

.text-right {
  text-align: right;
}

.ref-box {
  background-color: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  text-align: center;
}

.ref-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #92400E;
}

.ref-number {
  font-size: 20px;
  font-weight: 900;
  color: #78350F;
  letter-spacing: 0.08em;
}

.screenshot-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.screenshot-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.img-wrapper {
  max-height: 280px;
  overflow-y: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: #000000;
  display: flex;
  justify-content: center;
}

.proof-img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.no-proof-box {
  padding: var(--space-6);
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: 13px;
  color: var(--status-danger-accent);
}

.reject-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.reject-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  font-size: 14px;
  outline: none;
}

.action-footer-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  justify-content: flex-end;
}
</style>

