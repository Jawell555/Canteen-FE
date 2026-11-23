import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../services/api'

// Initial realistic orders matching staff.contract.md
const mockInitialOrders = [
  {
    order_uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    queue_number: '#043',
    customer_name: 'Maria Santos',
    status: 'pending',
    created_at: new Date(Date.now() - 3 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hold_seconds_remaining: 420,
    total_amount: 140.0,
    payment: {
      method: 'gcash',
      status: 'unverified',
      reference_number: '902148192031',
      proof_image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=80',
    },
    items: [
      { name: 'Pork Sinigang with Rice', quantity: 1, custom_notes: 'Extra sour sabaw please' },
      { name: 'Toasted Ham & Cheese', quantity: 1, custom_notes: '' },
    ],
  },
  {
    order_uuid: 'a89c201b-1234-4567-890a-bcdef1234567',
    queue_number: '#042',
    customer_name: 'Juan Dela Cruz',
    status: 'preparing',
    created_at: new Date(Date.now() - 7 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hold_seconds_remaining: 0,
    total_amount: 85.0,
    payment: {
      method: 'gcash',
      status: 'verified',
      reference_number: '1002938475618',
      proof_image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=80',
    },
    items: [
      { name: 'Chicken Adobo with Rice', quantity: 1, custom_notes: 'Penge sabaw sa hiwalay na cup' },
    ],
  },
  {
    order_uuid: 'c56d789e-5678-1234-90ab-cdef98765432',
    queue_number: '#041',
    customer_name: 'Pedro Reyes',
    status: 'ready',
    created_at: new Date(Date.now() - 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hold_seconds_remaining: 0,
    total_amount: 90.0,
    payment: {
      method: 'counter_cash',
      status: 'verified',
      reference_number: null,
      proof_image_url: null,
    },
    items: [
      { name: 'Toasted Ham & Cheese', quantity: 2, custom_notes: 'Toasted crispy' },
    ],
  },
]

// Mock menu items for rush hour Sold-Out toggling
const mockMenuItems = [
  { id: 101, name: 'Chicken Adobo with Rice', emoji: '🍗', stock: 24, isSoldOut: false },
  { id: 102, name: 'Pork Sinigang with Rice', emoji: '🍲', stock: 15, isSoldOut: false },
  { id: 103, name: 'Toasted Ham & Cheese', emoji: '🥪', stock: 12, isSoldOut: false },
  { id: 104, name: 'Iced Calamansi Juice', emoji: '🧃', stock: 0, isSoldOut: true },
]

export function useStaffQueue() {
  const orders = ref([...mockInitialOrders])
  const menuItems = ref([...mockMenuItems])
  const isLoading = ref(false)
  const isPolling = ref(true)
  let pollTimer = null

  const pendingOrders = computed(() => orders.value.filter((o) => o.status === 'pending'))
  const preparingOrders = computed(() => orders.value.filter((o) => o.status === 'preparing'))
  const readyOrders = computed(() => orders.value.filter((o) => o.status === 'ready'))

  const counts = computed(() => ({
    pending: pendingOrders.value.length,
    preparing: preparingOrders.value.length,
    ready: readyOrders.value.length,
  }))

  /**
   * Fetch active queue from backend (or keep mock updated)
   */
  async function fetchOrders() {
    try {
      const response = await api.get('/staff/orders')
      if (response.data?.orders) {
        orders.value = response.data.orders
      }
    } catch {
      // Gracefully continue with local state if backend is offline
    }
  }

  /**
   * Advance order to next status: pending -> preparing -> ready -> completed
   */
  async function advanceOrderStatus(orderUuid, nextStatus) {
    const order = orders.value.find((o) => o.order_uuid === orderUuid)
    if (!order) return

    order.status = nextStatus

    try {
      await api.patch(`/staff/orders/${orderUuid}/status`, { status: nextStatus })
    } catch {
      // Keep optimistic UI update
    }
  }

  /**
   * Confirm GCash or Cash at counter payment and start cooking
   */
  async function confirmPayment(orderUuid) {
    const order = orders.value.find((o) => o.order_uuid === orderUuid)
    if (!order) return

    order.payment.status = 'verified'
    order.status = 'preparing'

    try {
      await api.post(`/staff/orders/${orderUuid}/verify-payment`, {
        action: 'verify',
        payment_method: order.payment.method,
      })
    } catch {
      // Optimistic local update
    }
  }

  /**
   * Reject invalid GCash proof or void order with reason
   */
  async function rejectPayment(orderUuid, reason = 'Invalid payment proof') {
    const order = orders.value.find((o) => o.order_uuid === orderUuid)
    if (!order) return

    orders.value = orders.value.filter((o) => o.order_uuid !== orderUuid)

    try {
      await api.post(`/staff/orders/${orderUuid}/verify-payment`, {
        action: 'reject',
        reason,
      })
    } catch {
      // Optimistic local update
    }
  }

  /**
   * Quick toggle sold-out status of a menu item during peak rush
   */
  async function toggleSoldOut(itemId) {
    const item = menuItems.value.find((i) => i.id === itemId)
    if (!item) return

    item.isSoldOut = !item.isSoldOut

    try {
      await api.patch(`/staff/menu/${itemId}/toggle-sold-out`, {
        is_sold_out: item.isSoldOut,
      })
    } catch {
      // Optimistic local update
    }
  }

  function startPolling(intervalMs = 5000) {
    stopPolling()
    isPolling.value = true
    pollTimer = setInterval(fetchOrders, intervalMs)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    isPolling.value = false
  }

  onMounted(() => {
    startPolling(5000)
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    orders,
    menuItems,
    isLoading,
    isPolling,
    pendingOrders,
    preparingOrders,
    readyOrders,
    counts,
    fetchOrders,
    advanceOrderStatus,
    confirmPayment,
    rejectPayment,
    toggleSoldOut,
    startPolling,
    stopPolling,
  }
}

export default useStaffQueue

