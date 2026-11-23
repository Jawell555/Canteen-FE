import { ref, computed } from 'vue'

const CART_STORAGE_KEY = 'canteena_cart'
const HOLD_STORAGE_KEY = 'canteena_hold_expires_at'

// Shared module-level reactive state
const items = ref(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]'))
const holdExpiresAt = ref(localStorage.getItem(HOLD_STORAGE_KEY) ? Number(localStorage.getItem(HOLD_STORAGE_KEY)) : null)
let timerInterval = null

export function useCart() {
  const itemCount = computed(() =>
    items.value.reduce((total, item) => total + (item.quantity || 0), 0)
  )

  const subtotal = computed(() =>
    items.value.reduce((total, item) => total + (Number(item.price || 0) * (item.quantity || 0)), 0)
  )

  const formattedSubtotal = computed(() => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(subtotal.value)
  })

  const isEmpty = computed(() => items.value.length === 0)

  /**
   * Persist items array to localStorage
   */
  function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.value))
  }

  /**
   * Add a menu item to the cart with optional customization notes
   */
  function addItem(menuItem, quantity = 1, customNotes = '') {
    const cleanNotes = (customNotes || '').trim()

    // Find if the exact same item with the same customization note already exists
    const existingIndex = items.value.findIndex(
      (i) => i.menu_item_id === menuItem.id && (i.custom_notes || '').trim() === cleanNotes
    )

    if (existingIndex > -1) {
      items.value[existingIndex].quantity += quantity
    } else {
      items.value.push({
        id: `${menuItem.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: Math.max(1, quantity),
        custom_notes: cleanNotes,
        image_url: menuItem.image_url || '',
        category_name: menuItem.category?.name || '',
      })
    }

    saveCart()
  }

  /**
   * Update quantity of a cart item
   */
  function updateQuantity(cartItemId, newQuantity) {
    const qty = Number(newQuantity)
    if (qty <= 0) {
      removeItem(cartItemId)
      return
    }

    const item = items.value.find((i) => i.id === cartItemId)
    if (item) {
      item.quantity = qty
      saveCart()
    }
  }

  /**
   * Update customization notes for an existing cart item
   */
  function updateNotes(cartItemId, newNotes) {
    const item = items.value.find((i) => i.id === cartItemId)
    if (item) {
      item.custom_notes = (newNotes || '').trim()
      saveCart()
    }
  }

  /**
   * Remove a single item from the cart
   */
  function removeItem(cartItemId) {
    items.value = items.value.filter((i) => i.id !== cartItemId)
    saveCart()

    if (items.value.length === 0) {
      clearHold()
    }
  }

  /**
   * Empty the entire cart
   */
  function clearCart() {
    items.value = []
    saveCart()
    clearHold()
  }

  /**
   * Format items array into backend API contract shape
   */
  function getCheckoutItems() {
    return items.value.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      custom_notes: item.custom_notes || '',
    }))
  }

  // --- 10-Minute Hold Timer Logic ---

  const secondsRemaining = ref(0)

  function updateSecondsRemaining() {
    if (!holdExpiresAt.value) {
      secondsRemaining.value = 0
      return
    }
    const diff = Math.max(0, Math.floor((holdExpiresAt.value - Date.now()) / 1000))
    secondsRemaining.value = diff

    if (diff === 0 && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  const isHoldActive = computed(() => secondsRemaining.value > 0)

  const formattedHoldTime = computed(() => {
    const minutes = Math.floor(secondsRemaining.value / 60)
    const seconds = secondsRemaining.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  function startHold(minutes = 10) {
    const expires = Date.now() + minutes * 60 * 1000
    holdExpiresAt.value = expires
    localStorage.setItem(HOLD_STORAGE_KEY, String(expires))
    updateSecondsRemaining()

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(updateSecondsRemaining, 1000)
  }

  function clearHold() {
    holdExpiresAt.value = null
    secondsRemaining.value = 0
    localStorage.removeItem(HOLD_STORAGE_KEY)
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  // Initialize countdown if an active hold exists in storage
  if (holdExpiresAt.value && !timerInterval) {
    updateSecondsRemaining()
    if (secondsRemaining.value > 0) {
      timerInterval = setInterval(updateSecondsRemaining, 1000)
    } else {
      clearHold()
    }
  }

  return {
    items,
    itemCount,
    subtotal,
    formattedSubtotal,
    isEmpty,
    addItem,
    updateQuantity,
    updateNotes,
    removeItem,
    clearCart,
    getCheckoutItems,

    // Hold Timer
    holdExpiresAt,
    secondsRemaining,
    isHoldActive,
    formattedHoldTime,
    startHold,
    clearHold,
  }
}

export default useCart

