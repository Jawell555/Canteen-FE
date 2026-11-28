<script setup>
import { watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from './BaseButton.vue'
import BaseAlert from './BaseAlert.vue'
import { useCart, formatCurrency } from '../../composables/useCart'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const router = useRouter()
const route = useRoute()
const {
  items,
  itemCount,
  isEmpty,
  formattedSubtotal,
  isHoldActive,
  formattedHoldTime,
  lastCartError,
  clearCartError,
  updateQuantity,
  removeItem,
  clearCart,
} = useCart()

function getMenuQtyInCart(menuItemId) {
  return items.value
    .filter((i) => i.menu_item_id === menuItemId)
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
}

function isAtStockLimit(item) {
  if (item.current_stock === undefined || item.current_stock === null) return false
  return getMenuQtyInCart(item.menu_item_id) >= Number(item.current_stock)
}

function getLineTotalFormatted(item) {
  const cents = Math.round(Number(item.price || 0) * 100) * (Number(item.quantity) || 0)
  return formatCurrency(cents / 100)
}

function handleClose() {
  emit('close')
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

function handleBrowseMenu() {
  handleClose()
  if (route.path !== '/') {
    router.push('/')
  }
}

function handleGoToCheckout() {
  handleClose()
  router.push('/checkout')
}

function isImageUrl(value) {
  return /^(https?:\/\/|\/|data:image\/)/i.test(value || '')
}

function getItemEmoji(item) {
  if (item.emoji && item.emoji !== '🍽️') return item.emoji
  if (item.image_url && !isImageUrl(item.image_url)) return item.image_url
  const name = (item.name || '').toLowerCase()
  if (name.includes('adobo')) return '🍛'
  if (name.includes('sinigang')) return '🍲'
  if (name.includes('inasal')) return '🍗'
  if (name.includes('tapsilog')) return '🍳'
  if (name.includes('shanghai') || name.includes('lumpia')) return '🥢'
  if (name.includes('turon')) return '🍌'
  if (name.includes('ham') || name.includes('cheese') || name.includes('sandwich')) return '🥪'
  if (name.includes('calamansi') || name.includes('juice')) return '🧃'
  if (name.includes('gulaman') || name.includes('sago')) return '🥤'
  return '🍽️'
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else if (!document.querySelector('.modal-backdrop, .drawer-backdrop')) {
      document.body.style.overflow = ''
    }
  },
)

watch(
  () => route.fullPath,
  () => {
    if (props.isOpen) {
      handleClose()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (!document.querySelector('.modal-backdrop, .drawer-backdrop')) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cart-drawer">
      <div
        v-if="isOpen"
        class="cart-drawer-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartDrawerTitle"
        @click.self="handleClose"
      >
        <aside class="cart-drawer-panel">
          <header class="cart-drawer-header">
            <div class="cart-header-title-group">
              <span class="cart-header-icon" aria-hidden="true">🛒</span>
              <h2 id="cartDrawerTitle" class="cart-header-title">Your Cart</h2>
              <span v-if="itemCount > 0" class="cart-header-count tabular-nums">
                {{ itemCount }}
              </span>
            </div>
            <button
              type="button"
              class="cart-close-btn"
              aria-label="Close cart sidebar"
              @click="handleClose"
            >
              &times;
            </button>
          </header>

          <div v-if="isHoldActive && !isEmpty" class="cart-hold-banner">
            <span>⏱ Stock hold active:</span>
            <strong class="tabular-nums">{{ formattedHoldTime }}</strong>
          </div>

          <div class="cart-drawer-body">
            <BaseAlert
              v-if="lastCartError"
              variant="warning"
              class="mb-3"
              :dismissible="true"
              @dismiss="clearCartError"
            >
              {{ lastCartError }}
            </BaseAlert>

            <!-- Empty Cart State -->
            <div v-if="isEmpty" class="cart-empty-state">
              <span class="cart-empty-icon" aria-hidden="true">🛒</span>
              <h3 class="cart-empty-title">Your cart is empty</h3>
              <p class="cart-empty-sub">
                Add meals, snacks, or drinks from the menu to start your order.
              </p>
              <BaseButton variant="primary" size="md" @click="handleBrowseMenu">
                Browse Today's Menu
              </BaseButton>
            </div>

            <!-- Added Items List -->
            <ul v-else class="cart-items-list">
              <li v-for="item in items" :key="item.id" class="cart-item-card">
                <div class="cart-item-top">
                  <div class="cart-item-thumb">
                    <img
                      v-if="isImageUrl(item.image_url)"
                      :src="item.image_url"
                      :alt="item.name"
                      class="cart-item-img"
                    />
                    <span v-else class="cart-item-emoji" aria-hidden="true">
                      {{ getItemEmoji(item) }}
                    </span>
                  </div>

                  <div class="cart-item-info">
                    <div class="cart-item-header">
                      <h3 class="cart-item-name">{{ item.name }}</h3>
                      <button
                        type="button"
                        class="cart-remove-btn"
                        :aria-label="`Remove ${item.name} from cart`"
                        @click="removeItem(item.id)"
                      >
                        &times;
                      </button>
                    </div>
                    <span class="cart-item-unit tabular-nums">
                      ₱{{ Number(item.price || 0).toFixed(2) }}
                    </span>
                    <p v-if="item.custom_notes" class="cart-item-notes">
                      "{{ item.custom_notes }}"
                    </p>
                  </div>
                </div>

                <div class="cart-item-bottom">
                  <div class="cart-qty-stepper" role="group" :aria-label="`Quantity for ${item.name}`">
                    <button
                      type="button"
                      class="stepper-btn"
                      aria-label="Decrease quantity"
                      @click="updateQuantity(item.id, item.quantity - 1)"
                    >
                      −
                    </button>
                    <span class="stepper-qty tabular-nums">{{ item.quantity }}</span>
                    <button
                      type="button"
                      class="stepper-btn"
                      :disabled="isAtStockLimit(item)"
                      aria-label="Increase quantity"
                      @click="updateQuantity(item.id, item.quantity + 1)"
                    >
                      +
                    </button>
                  </div>

                  <span class="cart-item-subtotal tabular-nums">
                    {{ getLineTotalFormatted(item) }}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <footer v-if="!isEmpty" class="cart-drawer-footer">
            <div class="cart-subtotal-row">
              <span class="cart-subtotal-label">Subtotal</span>
              <span class="cart-subtotal-value tabular-nums">{{ formattedSubtotal }}</span>
            </div>

            <div class="cart-footer-actions">
              <BaseButton
                variant="primary"
                size="lg"
                block
                @click="handleGoToCheckout"
              >
                Proceed to Checkout →
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                block
                @click="clearCart"
              >
                Clear Cart
              </BaseButton>
            </div>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cart-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(28, 25, 23, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}

.cart-drawer-panel {
  width: 380px;
  max-width: 90vw;
  height: 100dvh;
  background-color: var(--color-bg-canvas);
  border-left: 1px solid var(--color-border-strong);
  box-shadow: var(--shadow-elevated);
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.cart-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
}

.cart-header-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cart-header-icon {
  font-size: 20px;
}

.cart-header-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.cart-header-count {
  background-color: var(--color-primary-subtle);
  color: var(--color-primary-base);
  font-size: 12px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.cart-close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease;
  touch-action: manipulation;
  user-select: none;
}

.cart-close-btn:active {
  transform: scale(0.92);
}

@media (hover: hover) and (pointer: fine) {
  .cart-close-btn:hover {
    background-color: var(--color-bg-subtle);
    color: var(--color-text-primary);
  }
}

.cart-hold-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-5);
  background-color: var(--status-pending-bg);
  border-bottom: 1px solid rgba(217, 119, 6, 0.25);
  color: var(--status-pending-text);
  font-size: 13px;
}

.cart-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
}

.cart-empty-state {
  height: 100%;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-2);
}

.cart-empty-icon {
  font-size: 48px;
}

.cart-empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.cart-empty-sub {
  font-size: 14px;
  color: var(--color-text-secondary);
  max-width: 260px;
  line-height: 1.5;
  margin-bottom: var(--space-2);
}

.cart-items-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cart-item-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cart-item-top {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.cart-item-thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cart-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cart-item-emoji {
  font-size: 36px;
  line-height: 1;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cart-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-item-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.cart-item-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.cart-item-notes {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.cart-remove-btn {
  background: transparent;
  border: none;
  color: var(--status-danger-accent);
  font-size: 20px;
  line-height: 1;
  min-width: 44px;
  min-height: 44px;
  margin: -8px -10px 0 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 140ms ease;
  touch-action: manipulation;
  user-select: none;
}

.cart-remove-btn:active {
  transform: scale(0.9);
}

@media (hover: hover) and (pointer: fine) {
  .cart-remove-btn:hover {
    background-color: var(--status-danger-bg);
  }
}

.cart-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
}

.cart-qty-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-subtle);
  overflow: hidden;
}

.stepper-btn {
  background: transparent;
  border: none;
  min-width: 44px;
  min-height: 44px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 120ms ease, background-color 140ms ease;
  touch-action: manipulation;
  user-select: none;
}

.stepper-btn:active:not(:disabled) {
  transform: scale(0.92);
  background-color: var(--color-border-default);
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .stepper-btn:hover:not(:disabled) {
    background-color: var(--color-border-subtle);
  }
}

.stepper-qty {
  min-width: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.cart-item-subtotal {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-primary-base);
}

.cart-drawer-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cart-subtotal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-subtotal-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.cart-subtotal-value {
  font-size: 20px;
  font-weight: 900;
  color: var(--color-primary-base);
}

.cart-footer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Transitions (< 300ms, GPU-composited only) */
.cart-drawer-enter-active,
.cart-drawer-leave-active {
  transition: opacity 220ms ease-out;
}

.cart-drawer-enter-from,
.cart-drawer-leave-to {
  opacity: 0;
}

.cart-drawer-enter-active .cart-drawer-panel,
.cart-drawer-leave-active .cart-drawer-panel {
  transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
}

.cart-drawer-enter-from .cart-drawer-panel,
.cart-drawer-leave-to .cart-drawer-panel {
  transform: translateX(100%);
}
</style>
