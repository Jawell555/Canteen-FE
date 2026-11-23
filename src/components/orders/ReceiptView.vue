<script setup>
import { ref } from 'vue'
import BaseButton from '../common/BaseButton.vue'

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
})

const isDownloading = ref(false)

/**
 * Native Canvas 2D PNG receipt generator (Dependency-free & anti-bloat)
 */
function downloadReceiptPng() {
  isDownloading.value = true

  try {
    const o = props.order
    const items = o.items || []

    // Calculate dynamic canvas height
    const baseHeight = 360
    const itemsHeight = items.length * 48
    const totalHeight = baseHeight + itemsHeight

    const canvas = document.createElement('canvas')
    const scale = 2 // Retina high-DPI scaling
    const width = 420
    const height = totalHeight

    canvas.width = width * scale
    canvas.height = height * scale

    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    // Background
    ctx.fillStyle = '#FDFBF7'
    ctx.fillRect(0, 0, width, height)

    // Outer Border
    ctx.strokeStyle = '#D6CFC4'
    ctx.lineWidth = 1.5
    ctx.strokeRect(12, 12, width - 24, height - 24)

    // Header: Canteena Branding
    ctx.fillStyle = '#C2410C'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CANTEENA', width / 2, 48)

    ctx.fillStyle = '#78716C'
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.fillText('CAMPUS BITES & COMMISSARY', width / 2, 66)

    // Dashed divider
    ctx.strokeStyle = '#E5E0D8'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(24, 80)
    ctx.lineTo(width - 24, 80)
    ctx.stroke()

    // Queue Number
    ctx.fillStyle = '#1C1917'
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.fillText('DAILY QUEUE NUMBER', width / 2, 102)

    ctx.fillStyle = '#C2410C'
    ctx.font = '900 42px system-ui, sans-serif'
    ctx.fillText(o.queueNumber || '#001', width / 2, 146)

    // Order Details & Date
    ctx.fillStyle = '#57534E'
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillText(o.createdAt || new Date().toLocaleString(), width / 2, 170)

    ctx.fillStyle = '#1C1917'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillText(`Customer: ${o.customerName || 'Guest'}`, width / 2, 190)

    // Second divider
    ctx.beginPath()
    ctx.moveTo(24, 206)
    ctx.lineTo(width - 24, 206)
    ctx.stroke()
    ctx.setLineDash([]) // Reset line dash

    // Items List
    let currentY = 230
    ctx.textAlign = 'left'

    items.forEach((item) => {
      ctx.fillStyle = '#1C1917'
      ctx.font = '600 13px system-ui, sans-serif'
      const itemTitle = `${item.quantity}x ${item.name}`
      ctx.fillText(itemTitle, 28, currentY)

      // Item Price
      ctx.textAlign = 'right'
      ctx.font = 'bold 13px system-ui, sans-serif'
      const linePrice = `₱${(Number(item.price) * item.quantity).toFixed(2)}`
      ctx.fillText(linePrice, width - 28, currentY)
      ctx.textAlign = 'left'

      // Custom Note if present
      if (item.custom_notes) {
        currentY += 16
        ctx.fillStyle = '#78716C'
        ctx.font = 'italic 11px system-ui, sans-serif'
        ctx.fillText(`Note: "${item.custom_notes}"`, 36, currentY)
      }

      currentY += 28
    })

    // Third divider
    ctx.strokeStyle = '#D6CFC4'
    ctx.beginPath()
    ctx.moveTo(24, currentY + 6)
    ctx.lineTo(width - 24, currentY + 6)
    ctx.stroke()

    // Total Amount
    currentY += 34
    ctx.fillStyle = '#1C1917'
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.fillText('TOTAL PAID', 28, currentY)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#C2410C'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.fillText(`₱${Number(o.total || 0).toFixed(2)}`, width - 28, currentY)

    // Payment details
    currentY += 26
    ctx.fillStyle = '#78716C'
    ctx.font = '12px system-ui, sans-serif'
    const paymentLabel = o.paymentMethod === 'gcash'
      ? `Payment: GCash (Ref: ${o.referenceNumber || 'N/A'})`
      : 'Payment: Cash at Counter'
    ctx.fillText(paymentLabel, width - 28, currentY)

    // Footer instruction
    ctx.textAlign = 'center'
    ctx.fillStyle = '#A8A29E'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('Please present this receipt when claiming food.', width / 2, height - 32)
    ctx.fillText('Salamat sa pagtangkilik!', width / 2, height - 18)

    // Export PNG
    const link = document.createElement('a')
    const queueClean = (o.queueNumber || '001').replace('#', '')
    link.download = `canteena-receipt-${queueClean}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="receipt-container">
    <div class="thermal-receipt" aria-label="Digital thermal receipt">
      <!-- Receipt Header -->
      <header class="receipt-top">
        <h3 class="receipt-brand">CANTEENA</h3>
        <p class="receipt-tagline">CAMPUS BITES & COMMISSARY</p>
        <div class="receipt-divider-dashed"></div>

        <span class="queue-meta-title">DAILY QUEUE NUMBER</span>
        <div class="queue-number-display tabular-nums">
          {{ order.queueNumber }}
        </div>
        <time class="order-date-text tabular-nums">{{ order.createdAt }}</time>
        <div class="customer-tag">Customer: <strong>{{ order.customerName }}</strong></div>
      </header>

      <div class="receipt-divider-dashed"></div>

      <!-- Receipt Line Items -->
      <section class="receipt-items-list" aria-label="Ordered food items">
        <div
          v-for="(item, idx) in order.items"
          :key="idx"
          class="receipt-line-item"
        >
          <div class="item-title-block">
            <span class="item-qty-name">{{ item.quantity }}x {{ item.name }}</span>
            <span v-if="item.custom_notes" class="item-note-text">
              Note: "{{ item.custom_notes }}"
            </span>
          </div>
          <span class="item-price-text tabular-nums">
            ₱{{ (Number(item.price) * item.quantity).toFixed(2) }}
          </span>
        </div>
      </section>

      <div class="receipt-divider-solid"></div>

      <!-- Receipt Summary -->
      <footer class="receipt-summary-block">
        <div class="summary-line total-line">
          <span>TOTAL PAID</span>
          <span class="total-amount-text tabular-nums">₱{{ Number(order.total).toFixed(2) }}</span>
        </div>
        <div class="payment-method-text">
          <span v-if="order.paymentMethod === 'gcash'">
            GCash Ref: <strong class="tabular-nums">{{ order.referenceNumber || '902148192031' }}</strong>
          </span>
          <span v-else>
            Payment: <strong>Cash at Counter</strong>
          </span>
        </div>

        <div class="receipt-footer-notes">
          <p>Please present this queue voucher upon pickup.</p>
          <p class="greeting-note">Salamat sa pagtangkilik!</p>
        </div>
      </footer>
    </div>

    <!-- Download Trigger -->
    <div class="download-bar">
      <BaseButton
        variant="primary"
        block
        size="lg"
        :loading="isDownloading"
        @click="downloadReceiptPng"
      >
        📥 Download Digital Receipt (PNG)
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.receipt-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
}

.thermal-receipt {
  width: 100%;
  max-width: 420px;
  background-color: var(--color-bg-canvas);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
  position: relative;
  text-align: left;
}

.receipt-top {
  text-align: center;
}

.receipt-brand {
  font-size: 22px;
  font-weight: 900;
  color: var(--color-primary-base);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.receipt-tagline {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  font-weight: 700;
}

.queue-meta-title {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
}

.queue-number-display {
  font-size: 44px;
  font-weight: 900;
  color: var(--color-primary-base);
  line-height: 1.1;
  margin: 4px 0;
}

.order-date-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: block;
}

.customer-tag {
  font-size: 13px;
  color: var(--color-text-primary);
  margin-top: 4px;
}

.receipt-divider-dashed {
  border-top: 1px dashed var(--color-border-strong);
  margin: var(--space-3) 0;
}

.receipt-divider-solid {
  border-top: 1px solid var(--color-border-strong);
  margin: var(--space-4) 0;
}

.receipt-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.receipt-line-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.item-title-block {
  display: flex;
  flex-direction: column;
}

.item-qty-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-note-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 2px;
}

.item-price-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.receipt-summary-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  font-size: 15px;
  color: var(--color-text-primary);
}

.total-amount-text {
  font-size: 22px;
  color: var(--color-primary-base);
}

.payment-method-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
}

.receipt-footer-notes {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border-subtle);
}

.greeting-note {
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.download-bar {
  width: 100%;
  max-width: 420px;
}
</style>

