import { ref, computed } from 'vue'
import { api } from '../services/api'

const GUEST_CART_KEY = 'canteena_cart_guest'
const GUEST_HOLD_KEY = 'canteena_hold_expires_at_guest'

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount || 0))
}

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
    const raw = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function readGuestHold() {
  const raw = localStorage.getItem(GUEST_HOLD_KEY)
  return raw ? Number(raw) : null
}

// Shared module-level reactive singletons
const items = ref(hasCustomerSession() ? [] : readGuestCart())
const holdExpiresAt = ref(readGuestHold())
const secondsRemaining = ref(0)
const isCartSyncing = ref(false)
const lastCartError = ref('')

let timerInterval = null
let errorResetTimer = null
let mutationQueue = Promise.resolve()
let pendingOps = 0
let cartRevision = 0
const latestQtyRevisionByKey = new Map()

const itemCount = computed(() =>
  items.value.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
)

const subtotal = computed(() => {
  const cents = items.value.reduce(
    (totalCents, item) =>
      totalCents + Math.round(Number(item.price || 0) * 100) * (Number(item.quantity) || 0),
    0,
  )
  return Math.round(cents) / 100
})

const formattedSubtotal = computed(() => formatCurrency(subtotal.value))

const isEmpty = computed(() => items.value.length === 0)
const isHoldActive = computed(() => secondsRemaining.value > 0)

const formattedHoldTime = computed(() => {
  const minutes = Math.floor(secondsRemaining.value / 60)
  const seconds = secondsRemaining.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function setCartError(message) {
  lastCartError.value = message || ''
  if (errorResetTimer) clearTimeout(errorResetTimer)
  if (lastCartError.value) {
    errorResetTimer = setTimeout(() => {
      lastCartError.value = ''
    }, 4000)
  }
}

function clearCartError() {
  lastCartError.value = ''
  if (errorResetTimer) {
    clearTimeout(errorResetTimer)
    errorResetTimer = null
  }
}

function saveGuestCart() {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items.value))
}

function getItemKey(item) {
  return `${item.menu_item_id}::${(item.custom_notes || '').trim()}`
}

function normalizeServerItems(serverItems) {
  return serverItems.map((it) => ({
    ...it,
    price: Number(it.price || 0),
    quantity: Number(it.quantity || 1),
    custom_notes: it.custom_notes || '',
    image_url: it.image_url || '',
    emoji: it.emoji || '',
    current_stock: it.current_stock !== undefined ? Number(it.current_stock) : undefined,
  }))
}

/**
 * Reconcile real numeric database IDs onto optimistic local items while mutations are still in-flight,
 * and replace the full array only once all pending queued mutations have settled.
 */
function applyServerCart(data, { forceReplace = false } = {}) {
  if (!data || !Array.isArray(data.items)) return
  const normalized = normalizeServerItems(data.items)

  if (forceReplace || pendingOps === 0) {
    items.value = normalized
    return
  }

  const serverByKey = new Map(normalized.map((it) => [getItemKey(it), it]))
  for (const localItem of items.value) {
    const match = serverByKey.get(getItemKey(localItem))
    if (match) {
      localItem.id = match.id
      localItem.cart_item_id = match.cart_item_id
      if (match.current_stock !== undefined) {
        localItem.current_stock = match.current_stock
      }
    }
  }
}

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

async function fetchServerCart({ force = false } = {}) {
  if (!hasCustomerSession()) return
  if (!force && pendingOps > 0) return

  const startRevision = cartRevision
  isCartSyncing.value = true
  try {
    const res = await api.get('/customer/cart', { skipDedup: force })
    if (pendingOps === 0 && (force || cartRevision === startRevision)) {
      applyServerCart(res.data, { forceReplace: true })
    }
  } catch {
    // Keep current state if backend unreachable
  } finally {
    if (pendingOps === 0) {
      isCartSyncing.value = false
    }
  }
}

function enqueueServerMutation(taskFn) {
  pendingOps += 1
  isCartSyncing.value = true

  const run = mutationQueue.then(async () => {
    try {
      return await taskFn()
    } finally {
      pendingOps = Math.max(0, pendingOps - 1)
      if (pendingOps === 0) {
        isCartSyncing.value = false
      }
    }
  })

  // Keep the shared queue alive even if one operation rejects
  mutationQueue = run.catch(() => {})
  return run
}

async function recoverCartFromServer() {
  if (pendingOps === 0 && hasCustomerSession()) {
    try {
      const res = await api.get('/customer/cart', { skipDedup: true })
      if (pendingOps === 0) {
        applyServerCart(res.data, { forceReplace: true })
      }
    } catch {
      // Ignore recovery failure when offline
    }
  }
}

async function syncCartOnLogin() {
  if (!hasCustomerSession()) return
  const guestItems = readGuestCart()
  const guestHold = readGuestHold()

  return enqueueServerMutation(async () => {
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
        const res = await api.get('/customer/cart', { skipDedup: true })
        applyServerCart(res.data)
      }
    } catch {
      // Fallback gracefully if network fails
    } finally {
      syncHoldTimer()
    }
  })
}

function resetToGuestCart() {
  cartRevision += 1
  latestQtyRevisionByKey.clear()
  clearCartError()
  items.value = readGuestCart()
  holdExpiresAt.value = readGuestHold()
  syncHoldTimer()
}

async function addItem(menuItem, quantity = 1, customNotes = '') {
  clearCartError()
  const cleanNotes = (customNotes || '').trim()
  const qty = Math.max(1, Number(quantity) || 1)
  const menuStock = menuItem.stock ?? menuItem.current_stock

  if (menuStock !== undefined && menuStock !== null) {
    const totalInCartForMenu = items.value
      .filter((i) => i.menu_item_id === menuItem.id)
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
    const remaining = Math.max(0, Number(menuStock) - totalInCartForMenu)
    if (qty > remaining) {
      const msg =
        remaining > 0
          ? `Only ${remaining} more available in stock for '${menuItem.name}'.`
          : `Only ${menuStock} remaining in stock for '${menuItem.name}'.`
      setCartError(msg)
      throw new Error(msg)
    }
  }

  cartRevision += 1
  const existingIndex = items.value.findIndex(
    (i) => i.menu_item_id === menuItem.id && (i.custom_notes || '').trim() === cleanNotes,
  )

  if (existingIndex > -1) {
    items.value[existingIndex].quantity += qty
    if (menuStock !== undefined && menuStock !== null) {
      items.value[existingIndex].current_stock = Number(menuStock)
    }
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
      category_name: menuItem.category?.name || menuItem.category_name || '',
      current_stock: menuStock !== undefined && menuStock !== null ? Number(menuStock) : undefined,
    })
  }

  if (!hasCustomerSession()) {
    saveGuestCart()
    return
  }

  return enqueueServerMutation(async () => {
    try {
      const res = await api.post('/customer/cart/items', {
        menu_item_id: menuItem.id,
        quantity: qty,
        custom_notes: cleanNotes,
      })
      applyServerCart(res.data)
    } catch (err) {
      setCartError(err.message || `Could not add '${menuItem.name}' to cart.`)
      await recoverCartFromServer()
      throw err
    }
  })
}

async function updateQuantity(cartItemId, newQuantity) {
  clearCartError()
  const qty = Number(newQuantity)
  if (qty <= 0) {
    await removeItem(cartItemId)
    return
  }

  const item = items.value.find((i) => i.id === cartItemId)
  if (!item) return

  if (item.current_stock !== undefined && item.current_stock !== null) {
    const otherQty = items.value
      .filter((i) => i.menu_item_id === item.menu_item_id && i.id !== item.id)
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
    const maxForLine = Math.max(0, Number(item.current_stock) - otherQty)
    if (qty > maxForLine) {
      setCartError(`Only ${maxForLine} available in stock for '${item.name}'.`)
      return
    }
  }

  item.quantity = qty
  cartRevision += 1

  if (!hasCustomerSession()) {
    saveGuestCart()
    return
  }

  const itemKey = getItemKey(item)
  const capturedMenuId = item.menu_item_id
  const capturedNotes = (item.custom_notes || '').trim()
  const capturedRev = cartRevision
  latestQtyRevisionByKey.set(itemKey, capturedRev)

  return enqueueServerMutation(async () => {
    // Coalesce rapid +/- clicks: only send network PATCH for the latest revision of this item
    if (latestQtyRevisionByKey.get(itemKey) !== capturedRev) {
      return
    }

    const current =
      items.value.find((i) => i.id === cartItemId) ||
      items.value.find(
        (i) => i.menu_item_id === capturedMenuId && (i.custom_notes || '').trim() === capturedNotes,
      )

    if (!current || typeof current.id !== 'number') {
      await recoverCartFromServer()
      return
    }

    try {
      const res = await api.patch(`/customer/cart/items/${current.id}`, { quantity: current.quantity })
      applyServerCart(res.data)
    } catch (err) {
      setCartError(err.message || 'Could not update item quantity.')
      await recoverCartFromServer()
    }
  })
}

async function updateNotes(cartItemId, newNotes) {
  clearCartError()
  const item = items.value.find((i) => i.id === cartItemId)
  if (!item) return

  const prevNotes = (item.custom_notes || '').trim()
  const cleanNotes = (newNotes || '').trim()
  const capturedMenuId = item.menu_item_id
  item.custom_notes = cleanNotes
  cartRevision += 1

  if (!hasCustomerSession()) {
    saveGuestCart()
    return
  }

  return enqueueServerMutation(async () => {
    const current =
      items.value.find((i) => i.id === cartItemId) ||
      items.value.find(
        (i) => i.menu_item_id === capturedMenuId && (i.custom_notes || '').trim() === cleanNotes,
      ) ||
      items.value.find(
        (i) => i.menu_item_id === capturedMenuId && (i.custom_notes || '').trim() === prevNotes,
      )

    if (!current || typeof current.id !== 'number') {
      await recoverCartFromServer()
      return
    }

    try {
      const res = await api.patch(`/customer/cart/items/${current.id}`, {
        custom_notes: cleanNotes,
      })
      applyServerCart(res.data)
    } catch (err) {
      setCartError(err.message || 'Could not update item notes.')
      await recoverCartFromServer()
    }
  })
}

async function removeItem(cartItemId) {
  clearCartError()
  const target = items.value.find((i) => i.id === cartItemId)
  if (!target) return

  const capturedMenuId = target.menu_item_id
  const capturedNotes = (target.custom_notes || '').trim()
  const itemKey = getItemKey(target)
  latestQtyRevisionByKey.delete(itemKey)

  items.value = items.value.filter((i) => i.id !== cartItemId)
  cartRevision += 1

  if (items.value.length === 0) {
    clearHold()
  }

  if (!hasCustomerSession()) {
    saveGuestCart()
    return
  }

  return enqueueServerMutation(async () => {
    let targetId = typeof cartItemId === 'number' ? cartItemId : null

    if (targetId === null) {
      try {
        const latestRes = await api.get('/customer/cart', { skipDedup: true })
        const match = (latestRes.data?.items || []).find(
          (i) => i.menu_item_id === capturedMenuId && (i.custom_notes || '').trim() === capturedNotes,
        )
        targetId = match?.id ?? null
      } catch {
        targetId = null
      }
    }

    if (typeof targetId !== 'number') {
      await recoverCartFromServer()
      return
    }

    try {
      const res = await api.delete(`/customer/cart/items/${targetId}`)
      applyServerCart(res.data)
    } catch (err) {
      if (err?.status === 404) {
        await recoverCartFromServer()
        return
      }
      setCartError(err.message || 'Could not remove item.')
      await recoverCartFromServer()
    }
  })
}

async function clearCart() {
  clearCartError()
  latestQtyRevisionByKey.clear()
  items.value = []
  cartRevision += 1
  clearHold()

  if (!hasCustomerSession()) {
    localStorage.removeItem(GUEST_CART_KEY)
    return
  }

  return enqueueServerMutation(async () => {
    try {
      await api.delete('/customer/cart')
    } catch {
      // Already cleared locally
    }
  })
}

function getCheckoutItems() {
  return items.value.map((item) => ({
    menu_item_id: item.menu_item_id,
    name: item.name,
    price: Number(item.price || 0),
    quantity: item.quantity,
    custom_notes: item.custom_notes || '',
  }))
}

export function useCart() {
  return {
    items,
    itemCount,
    subtotal,
    formattedSubtotal,
    isEmpty,
    isCartSyncing,
    lastCartError,
    clearCartError,
    formatCurrency,
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
