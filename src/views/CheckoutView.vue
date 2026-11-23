<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseAlert from '../components/common/BaseAlert.vue'
import BaseButton from '../components/common/BaseButton.vue'
import { useCart } from '../composables/useCart'
import { useAuth } from '../composables/useAuth'
import { api } from '../services/api'

const router = useRouter()
const { user } = useAuth()
const {
  items,
  isEmpty,
  formattedSubtotal,
  updateQuantity,
  removeItem,
  isHoldActive,
  formattedHoldTime,
  startHold,
  clearCart,
  clearHold,
  getCheckoutItems,
} = useCart()

const customerName = ref('')
const customerPhone = ref('')
const paymentMethod = ref('gcash')
const gcashRef = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

onMounted(() => {
  if (user.value) {
    if (!customerName.value && user.value.name) customerName.value = user.value.name
    if (!customerPhone.value && user.value.phone_number) customerPhone.value = user.value.phone_number
  }

  if (!isHoldActive.value && !isEmpty.value) {
    startHold(10)
  }
})

async function handlePlaceOrder() {
  errorMessage.value = ''
  if (!customerName.value.trim()) {
    errorMessage.value = 'Please enter your name for pickup callout.'
    return
  }
  if (paymentMethod.value === 'gcash' && !gcashRef.value.trim()) {
    errorMessage.value = 'Please enter your GCash reference number.'
    return
  }

  isSubmitting.value = true

  try {
    const rawItems = getCheckoutItems()
    const checkoutItems = rawItems.map((it) => ({
      menu_item_id: it.menu_item_id || it.id,
      quantity: it.quantity,
      custom_notes: it.custom_notes || '',
    }))

    const payload = {
      customer_name: customerName.value.trim(),
      customer_phone: customerPhone.value.trim() || null,
      payment_method: paymentMethod.value,
      reference_number: paymentMethod.value === 'gcash' ? gcashRef.value.trim() : null,
      items: checkoutItems,
    }

    const response = await api.post('/orders/checkout', payload)
    const orderData = response.data?.order || response.data
    const orderUuid = response.data?.order_uuid || orderData?.uuid || orderData?.id
    const queueNumber = response.data?.queue_number || orderData?.formatted_queue_number || '#001'

    // Save to user's local order history and last active order
    localStorage.setItem('canteena_last_order', orderUuid)
    try {
      const history = JSON.parse(localStorage.getItem('canteena_order_history') || '[]')
      history.unshift({
        order_uuid: orderUuid,
        queue_number: queueNumber,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: orderData?.status || 'pending',
        total: Number(orderData?.total_amount || 0),
        payment_method: paymentMethod.value === 'gcash' ? 'GCash' : 'Cash at Counter',
        has_feedback: false,
        items: rawItems.map((it) => ({
          id: it.menu_item_id || it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          custom_notes: it.custom_notes || '',
        })),
      })
      localStorage.setItem('canteena_order_history', JSON.stringify(history.slice(0, 25)))
    } catch {
      // Ignore local storage quota errors
    }

    clearCart()
    clearHold()

    router.push(`/orders/${orderUuid}`)
  } catch (err) {
    errorMessage.value = err.message || 'Checkout failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="checkout-view">
    <div class="checkout-container">
      <h1 class="page-title">Checkout</h1>

      <!-- Empty Cart State -->
      <div v-if="isEmpty" class="empty-cart-card">
        <span class="empty-cart-icon" aria-hidden="true">🛒</span>
        <h2 class="empty-title">Your cart is empty</h2>
        <p class="empty-sub">Explore our menu and add some delicious canteen food.</p>
        <BaseButton variant="primary" class="mt-4" @click="router.push('/')">
          Browse Today's Menu
        </BaseButton>
      </div>

      <!-- Active Checkout Flow -->
      <div v-else>
        <!-- 10-Minute Reservation Alert banner -->
        <BaseAlert variant="warning" title="10-Minute Stock Reservation Active">
          Your items are temporarily reserved for <strong class="tabular-nums">{{ formattedHoldTime }}</strong>. Please finalize your checkout before the timer expires to secure your meal.
        </BaseAlert>

        <BaseAlert
          v-if="errorMessage"
          variant="danger"
          class="mt-4 mb-4"
          :dismissible="true"
          @dismiss="errorMessage = ''"
        >
          {{ errorMessage }}
        </BaseAlert>

        <form class="checkout-grid" @submit.prevent="handlePlaceOrder">
          <section class="checkout-form-card">
            <h2 class="section-title">Customer Details</h2>
            <div class="form-group">
              <label for="customerName" class="form-label">Full Name / Order Tag *</label>
              <input
                id="customerName"
                v-model="customerName"
                type="text"
                class="form-input"
                placeholder="e.g., Juan Dela Cruz"
                required
              />
            </div>

            <div class="form-group mt-4">
              <label for="customerPhone" class="form-label">Mobile Number (Optional)</label>
              <input
                id="customerPhone"
                v-model="customerPhone"
                type="tel"
                class="form-input"
                placeholder="e.g., 09171234567"
              />
            </div>

            <h2 class="section-title mt-6">Payment Method</h2>
            <div class="payment-options">
              <label class="payment-card" :class="{ active: paymentMethod === 'gcash' }">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  name="paymentMethod"
                  value="gcash"
                />
                <div class="payment-info">
                  <span class="payment-title">GCash / E-Wallet</span>
                  <span class="payment-sub">Scan QR code, submit reference number and screenshot proof</span>
                </div>
              </label>

              <!-- GCash Fields -->
              <div v-if="paymentMethod === 'gcash'" class="gcash-fields">
                <div class="form-group">
                  <label for="gcashRef" class="form-label">GCash Reference Number *</label>
                  <input
                    id="gcashRef"
                    v-model="gcashRef"
                    type="text"
                    class="form-input tabular-nums"
                    placeholder="e.g., 902148192031"
                    required
                  />
                </div>
              </div>

              <label class="payment-card" :class="{ active: paymentMethod === 'counter_cash' }">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  name="paymentMethod"
                  value="counter_cash"
                />
                <div class="payment-info">
                  <span class="payment-title">Pay Cash at Counter</span>
                  <span class="payment-sub">Pay physical currency at the canteen counter upon queue call</span>
                </div>
              </label>
            </div>
          </section>

          <aside class="order-summary-card">
            <h2 class="section-title">Order Items</h2>
            <div class="summary-items">
              <div v-for="item in items" :key="item.id" class="summary-row">
                <div class="item-title-group">
                  <span class="item-name">{{ item.name }}</span>
                  <span v-if="item.custom_notes" class="item-note">"{{ item.custom_notes }}"</span>
                </div>
                <div class="item-controls">
                  <div class="qty-stepper">
                    <button
                      type="button"
                      class="qty-btn"
                      @click="updateQuantity(item.id, item.quantity - 1)"
                    >
                      -
                    </button>
                    <span class="qty-val tabular-nums">{{ item.quantity }}</span>
                    <button
                      type="button"
                      class="qty-btn"
                      @click="updateQuantity(item.id, item.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                  <span class="item-line-total tabular-nums">₱{{ (item.price * item.quantity).toFixed(2) }}</span>
                  <button
                    type="button"
                    class="remove-btn"
                    aria-label="Remove item"
                    @click="removeItem(item.id)"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-total-row">
              <span>Total Amount</span>
              <span class="total-price tabular-nums">{{ formattedSubtotal }}</span>
            </div>

            <BaseButton
              type="submit"
              variant="primary"
              block
              size="lg"
              :loading="isSubmitting"
              class="mt-6"
            >
              Place Order & Get Queue Number
            </BaseButton>
          </aside>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.empty-cart-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-12) var(--space-6);
  text-align: center;
  box-shadow: var(--shadow-subtle);
}

.empty-cart-icon {
  font-size: 56px;
  display: block;
  margin-bottom: var(--space-4);
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
}

.empty-sub {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.checkout-form-card,
.order-summary-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  box-shadow: var(--shadow-subtle);
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.mt-4 {
  margin-top: var(--space-4);
}

.mt-6 {
  margin-top: var(--space-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  font-size: 15px;
  outline: none;
  background-color: var(--color-bg-subtle);
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.payment-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  cursor: pointer;
  transition: all 0.15s ease;
}

.payment-card.active {
  border-color: var(--color-primary-base);
  background-color: var(--color-primary-subtle);
}

.payment-title {
  font-weight: 700;
  font-size: 15px;
  color: var(--color-text-primary);
  display: block;
}

.payment-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.gcash-fields {
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  margin-left: 24px;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.item-title-group {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.item-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
}

.item-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-subtle);
}

.qty-btn {
  background: transparent;
  border: none;
  padding: 2px 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
}

.qty-val {
  padding: 0 4px;
  font-weight: 600;
  font-size: 13px;
}

.item-line-total {
  font-weight: 700;
  min-width: 60px;
  text-align: right;
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--status-danger-accent);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.summary-divider {
  height: 1px;
  background-color: var(--color-border-subtle);
  margin: var(--space-4) 0;
}

.summary-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  font-size: 16px;
  color: var(--color-text-primary);
}

.total-price {
  font-size: 22px;
  color: var(--color-primary-base);
}

@media (max-width: 768px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
