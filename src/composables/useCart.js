import { ref, computed } from 'vue'
import { api } from '../services/api'

const GUEST_CART_KEY = 'canteena_cart_guest'
const GUEST_HOLD_KEY = 'canteena_hold_expires_at_guest'

function hasCustomerSession() {
  try {
    const token = localStorage.getItem('canteena_token')
    const user = JSON.parse(localStorage.getItem('canteena_user') || 'null')
    return Boolean(token && user?.role === 'customer')
  } catch {
    return false
  }
}

function readGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
  } catch {
    return []
  }
}

function readGuestHold() {
  const raw = localStorage.getItem(GUEST_HOLD_KEY)
  return raw ? Number(raw) : null
}

// Shared module-level reactive state
const items = ref(hasCustomerSession() ? [] : readGuestCart())
const holdExpiresAt = ref(readGuestHold())
const isCartSyncing = ref(false)
let timerInterval = null

export function useCart() {
  const itemCount = computed(() =>
    items.value.reduce((total, item) => total + (item.quantity || 0), 0),
  )

  const subtotal = computed(() =>
    items.value.reduce(
      (total, item) => total + Number(item.price || 0) * (item.quantity || 0),
      0,
    ),
  )

  const formattedSubtotal = computed(() => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(subtotal.value)
  })

  const isEmpty = computed(() => items.value.length === 0)

  function saveGuestCart() {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items.value))
  }

  function applyServerCart(data) {
    if (!data || !Array.isArray(data.items)) return
    items.value = data.items.map((it) => ({
      ...it,
      price: Number(it.price || 0),
      quantity: Number(it.quantity || 1),
      custom_notes: it.custom_notes || '',
      image_url: it.image_url || '',
      emoji: it.emoji || '',
    }))
  }

  /**
   * Fetch persisted cart for the authenticated customer
   */
  async function fetchServerCart() {
    if (!hasCustomerSession()) return
    isCartSyncing.value = true
    try {
      const res = await api.get('/customer/cart')
      applyServerCart(res.data)
    } catch {
      // Keep current state if backend unreachable
    } finally {
      isCartSyncing.value = false
    }
  }

  /**
   * Merge guest items (if any) and hydrate authenticated customer's server cart
   */
  async function syncCartOnLogin() {
    if (!hasCustomerSession()) return
    const guestItems = readGuestCart()
    const guestHold = readGuestHold()

    isCartSyncing.value = true
    try {
      if (guestItems.length > 0) {
        const res = await api.post('/customer/cart/merge', {
          items: guestItems.map((i) => ({
            menu_item_id: i.menu_item_id,
            quantity: i.quantity,
            custom_notes: i.custom_notes || '',
          })),
        })
        localStorage.removeItem(GUEST_CART_KEY)
        localStorage.removeItem(GUEST_HOLD_KEY)
        applyServerCart(res.data)

        if (!holdExpiresAt.value && guestHold && guestHold > Date.now()) {
          holdExpiresAt.value = guestHold
        }
      } else {
        const res = await api.get('/customer/cart')
        applyServerCart(res.data)
      }
    } catch {
      // Fallback gracefully if network fails
    } finally {
      isCartSyncing.value = false
      syncHoldTimer()
    }
  }

  /**
   * Switch back to the guest cart on logout without erasing the customer's server cart
   */
  function resetToGuestCart() {
    items.value = readGuestCart()
    holdExpiresAt.value = readGuestHold()
    syncHoldTimer()
  }

  /**
   * Add a menu item to the cart with optional customization notes
   */
  async function addItem(menuItem, quantity = 1, customNotes = '') {
    const cleanNotes = (customNotes || '').trim()
    const qty = Math.max(1, Number(quantity) || 1)
    const prevItems = items.value.map((i) => ({ ...i }))

    const existingIndex = items.value.findIndex(
      (i) => i.menu_item_id === menuItem.id && (i.custom_notes || '').trim() === cleanNotes,
    )

    if (existingIndex > -1) {
      items.value[existingIndex].quantity += qty
    } else {
      items.value.push({
        id: `${menuItem.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: qty,
        custom_notes: cleanNotes,
        image_url: menuItem.image_url || '',
        emoji: menuItem.emoji || '',
        category_name: menuItem.category?.name || '',
      })
    }

    if (!hasCustomerSession()) {
      saveGuestCart()
      return
    }

    try {
      const res = await api.post('/customer/cart/items', {
        menu_item_id: menuItem.id,
        quantity: qty,
        custom_notes: cleanNotes,
      })
      applyServerCart(res.data)
    } catch (err) {
      items.value = prevItems
      throw err
    }
  }

  /**
   * Update quantity of a cart item
   */
  async function updateQuantity(cartItemId, newQuantity) {
    const qty = Number(newQuantity)
    if (qty <= 0) {
      await removeItem(cartItemId)
      return
    }

    const prevItems = items.value.map((i) => ({ ...i }))
    const item = items.value.find((i) => i.id === cartItemId)
    if (!item) return

    item.quantity = qty

    if (!hasCustomerSession()) {
      saveGuestCart()
      return
    }

    if (typeof cartItemId !== 'number') {
      await fetchServerCart()
      return
    }

    try {
      const res = await api.patch(`/customer/cart/items/${cartItemId}`, { quantity: qty })
      applyServerCart(res.data)
    } catch {
      items.value = prevItems
    }
  }

  /**
   * Update customization notes for an existing cart item
   */
  async function updateNotes(cartItemId, newNotes) {
    const prevItems = items.value.map((i) => ({ ...i }))
    const item = items.value.find((i) => i.id === cartItemId)
    if (!item) return

    const cleanNotes = (newNotes || '').trim()
    item.custom_notes = cleanNotes

    if (!hasCustomerSession()) {
      saveGuestCart()
      return
    }

    if (typeof cartItemId !== 'number') {
      await fetchServerCart()
      return
    }

    try {
      const res = await api.patch(`/customer/cart/items/${cartItemId}`, {
        custom_notes: cleanNotes,
      })
      applyServerCart(res.data)
    } catch {
      items.value = prevItems
    }
  }

  /**
   * Remove a single item from the cart
   */
  async function removeItem(cartItemId) {
    const prevItems = items.value.map((i) => ({ ...i }))
    items.value = items.value.filter((i) => i.id !== cartItemId)

    if (items.value.length === 0) {
      clearHold()
    }

    if (!hasCustomerSession()) {
      saveGuestCart()
      return
    }

    if (typeof cartItemId !== 'number') {
      await fetchServerCart()
      return
    }

    try {
      const res = await api.delete(`/customer/cart/items/${cartItemId}`)
      applyServerCart(res.data)
    } catch {
      items.value = prevItems
    }
  }

  /**
   * Empty the active cart
   */
  async function clearCart() {
    items.value = []
    clearHold()

    if (!hasCustomerSession()) {
      localStorage.removeItem(GUEST_CART_KEY)
      return
    }

    try {
      await api.delete('/customer/cart')
    } catch {
      // Already cleared locally
    }
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
    if (!hasCustomerSession()) {
      localStorage.setItem(GUEST_HOLD_KEY, String(expires))
    }
    updateSecondsRemaining()

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(updateSecondsRemaining, 1000)
  }

  function clearHold() {
    holdExpiresAt.value = null
    secondsRemaining.value = 0
    localStorage.removeItem(GUEST_HOLD_KEY)
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function syncHoldTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    if (!holdExpiresAt.value) {
      secondsRemaining.value = 0
      return
    }
    updateSecondsRemaining()
    if (secondsRemaining.value > 0) {
      timerInterval = setInterval(updateSecondsRemaining, 1000)
    } else {
      clearHold()
    }
  }

  if (holdExpiresAt.value && !timerInterval) {
    syncHoldTimer()
  }

  return {
    items,
    itemCount,
    subtotal,
    formattedSubtotal,
    isEmpty,
    isCartSyncing,
    addItem,
    updateQuantity,
    updateNotes,
    removeItem,
    clearCart,
    getCheckoutItems,
    fetchServerCart,
    syncCartOnLogin,
    resetToGuestCart,

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
