<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../../services/api'
import BaseButton from '../common/BaseButton.vue'
import BaseModal from '../common/BaseModal.vue'

const props = defineProps({
  readOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['sold-out-toggled'])

const DEFAULT_CATEGORIES = ['Meals', 'Snacks', 'Drinks', 'Others']

const items = ref([])
const isLoading = ref(true)

// Top view navbar: 'all' | 'today'
const menuScopeTab = ref('all')
const activeCategory = ref('All')
const searchQuery = ref('')
const statusFilter = ref('all')

// Feedback toast
const toastMessage = ref('')
const toastTone = ref('success')
let toastTimer = null

// Modal & form state
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const formError = ref('')
const fieldErrors = ref({})

const imageFile = ref(null)
const imagePreviewUrl = ref('')
const removeExistingImage = ref(false)
const fileInputRef = ref(null)

const formData = ref({
  name: '',
  category: 'Meals',
  price: 60,
  quantity: 50,
  description: '',
  is_active: true,
})

function showToast(message, tone = 'success') {
  toastMessage.value = message
  toastTone.value = tone
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2600)
}

function isImageUrl(value) {
  return /^(https?:\/\/|\/|data:image\/|blob:)/i.test(value || '')
}

function isActiveToday(item) {
  return Boolean(item.is_active)
}

function isAvailableForToday(item) {
  return isActiveToday(item) && !item.is_sold_out && Number(item.current_stock) > 0
}

function selectScopeTab(tab) {
  menuScopeTab.value = tab
  if (tab === 'today' && ['inactive', 'sold_out'].includes(statusFilter.value)) {
    statusFilter.value = 'all'
  }
}

function normalizeItem(item) {
  const currentStock = Number(item.quantity ?? item.current_stock ?? item.stock ?? 0)
  const orderedCount = Number(item.ordered_count ?? 0)
  return {
    ...item,
    category: item.category_name || item.category || 'Meals',
    desc: item.desc || item.description || '',
    price: Number(item.price ?? 0),
    current_stock: currentStock,
    quantity: currentStock,
    ordered_count: orderedCount,
    is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
    is_sold_out: Boolean(item.is_sold_out || item.isSoldOut),
    emoji: item.emoji || '🍽️',
  }
}

async function fetchAdminMenu() {
  isLoading.value = true
  try {
    const endpoint = props.readOnly ? '/menu/items' : '/admin/menu'
    const res = await api.get(endpoint, { skipDedup: true })
    if (Array.isArray(res.data?.items)) {
      items.value = res.data.items.map(normalizeItem)
    }
  } catch {
    // Keep existing items if offline
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAdminMenu()
})

onUnmounted(() => {
  revokeObjectPreview()
  if (toastTimer) clearTimeout(toastTimer)
})

function revokeObjectPreview() {
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
}

const scopedItems = computed(() => {
  if (menuScopeTab.value === 'today') {
    return items.value.filter(isAvailableForToday)
  }
  return items.value
})

const todayMenuCount = computed(() => items.value.filter(isAvailableForToday).length)

const categoryTabs = computed(() => {
  const counts = new Map()
  for (const cat of DEFAULT_CATEGORIES) {
    counts.set(cat, 0)
  }
  for (const item of scopedItems.value) {
    const cat = item.category || 'Others'
    counts.set(cat, (counts.get(cat) || 0) + 1)
  }
  return [
    { name: 'All', count: scopedItems.value.length },
    ...Array.from(counts.entries())
      .filter(([name, count]) => count > 0 || DEFAULT_CATEGORIES.includes(name))
      .map(([name, count]) => ({ name, count })),
  ]
})

const filteredAndSortedItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  const list = scopedItems.value.filter((item) => {
    if (activeCategory.value !== 'All' && item.category !== activeCategory.value) {
      return false
    }

    if (statusFilter.value === 'active' && !isActiveToday(item)) return false
    if (statusFilter.value === 'inactive' && isActiveToday(item)) return false
    if (statusFilter.value === 'sold_out' && !item.is_sold_out) return false
    if (statusFilter.value === 'low_stock' && (item.is_sold_out || item.current_stock > 10)) {
      return false
    }

    if (q) {
      const hay = `${item.name} ${item.desc} ${item.category}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    return true
  })

  return [...list].sort((a, b) => a.name.localeCompare(b.name))
})

const categorySections = computed(() => {
  if (activeCategory.value !== 'All') {
    return filteredAndSortedItems.value.length > 0
      ? [{ name: activeCategory.value, items: filteredAndSortedItems.value }]
      : []
  }

  const grouped = new Map()
  for (const item of filteredAndSortedItems.value) {
    const key = item.category || 'Others'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(item)
  }

  const orderedNames = [
    ...DEFAULT_CATEGORIES.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !DEFAULT_CATEGORIES.includes(c)),
  ]

  return orderedNames.map((name) => ({
    name,
    items: grouped.get(name),
  }))
})

function getStockBarPercent(item) {
  const total = item.current_stock + item.ordered_count
  if (item.is_sold_out || item.current_stock <= 0) return 0
  if (total <= 0) return 100
  return Math.max(4, Math.min(100, Math.round((item.current_stock / total) * 100)))
}

function getStockTone(item) {
  if (!isActiveToday(item)) return 'muted'
  if (item.is_sold_out || item.current_stock <= 0) return 'danger'
  if (item.current_stock <= 10) return 'warning'
  return 'healthy'
}

function getStatusPill(item) {
  if (!isActiveToday(item)) return { label: 'Inactive', tone: 'inactive' }
  if (item.is_sold_out || item.current_stock <= 0) return { label: 'Sold Out', tone: 'danger' }
  return { label: 'Active', tone: 'active' }
}

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = 'All'
  statusFilter.value = 'all'
}

function openCreateModal() {
  if (props.readOnly) return
  isEditing.value = false
  editingId.value = null
  formError.value = ''
  fieldErrors.value = {}
  revokeObjectPreview()
  imageFile.value = null
  imagePreviewUrl.value = ''
  removeExistingImage.value = false

  formData.value = {
    name: '',
    category: activeCategory.value !== 'All' ? activeCategory.value : 'Meals',
    price: 60,
    quantity: 50,
    description: '',
    is_active: true,
  }
  isModalOpen.value = true
}

function openEditModal(item, focusMessage = '') {
  if (props.readOnly) return
  isEditing.value = true
  editingId.value = item.id
  formError.value = focusMessage
  fieldErrors.value = {}
  revokeObjectPreview()
  imageFile.value = null
  imagePreviewUrl.value = isImageUrl(item.image_url) ? item.image_url : ''
  removeExistingImage.value = false

  formData.value = {
    name: item.name,
    category: item.category,
    price: item.price,
    quantity: item.current_stock,
    description: item.desc || '',
    is_active: isActiveToday(item),
  }
  isModalOpen.value = true
}

function handleFileSelect(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  applySelectedFile(file)
}

function handleFileDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) {
    fieldErrors.value.image = 'Please drop a valid image file (JPG, PNG, WEBP, GIF).'
    return
  }
  applySelectedFile(file)
}

function applySelectedFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    fieldErrors.value.image = 'Unsupported format. Use JPG, PNG, WEBP, or GIF.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    fieldErrors.value.image = 'Image must be 5 MB or smaller.'
    return
  }
  delete fieldErrors.value.image
  formError.value = ''
  revokeObjectPreview()
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
  removeExistingImage.value = false
}

function clearSelectedImage() {
  revokeObjectPreview()
  imageFile.value = null
  imagePreviewUrl.value = ''
  removeExistingImage.value = true
  delete fieldErrors.value.image
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function validateForm() {
  const errors = {}
  const trimmedName = formData.value.name.trim()

  if (!trimmedName) {
    errors.name = 'Item name is required.'
  } else if (trimmedName.length < 2) {
    errors.name = 'Must be at least 2 characters.'
  } else if (trimmedName.length > 120) {
    errors.name = 'Must be 120 characters or fewer.'
  } else {
    const duplicate = items.value.find(
      (i) => i.id !== editingId.value && i.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    )
    if (duplicate) {
      errors.name = 'A menu item with this name already exists.'
    }
  }

  const price = Number(formData.value.price)
  if (Number.isNaN(price) || price < 0 || price > 99999) {
    errors.price = 'Enter a valid price between ₱0 and ₱99,999.'
  }

  const qtyRaw = Number(formData.value.quantity)
  if (!Number.isInteger(qtyRaw) || qtyRaw < 0 || qtyRaw > 9999) {
    errors.quantity = 'Enter a whole number between 0 and 9,999.'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSaveItem() {
  if (props.readOnly || isSaving.value) return
  if (!validateForm()) return

  formError.value = ''
  isSaving.value = true

  const qtyVal = Math.max(0, Math.floor(Number(formData.value.quantity) || 0))
  const payload = new FormData()
  payload.append('name', formData.value.name.trim())
  payload.append('category', formData.value.category)
  payload.append('price', String(Number(formData.value.price)))
  payload.append('quantity', String(qtyVal))
  payload.append('description', formData.value.description.trim())
  payload.append('is_active', formData.value.is_active ? '1' : '0')
  if (isEditing.value && qtyVal > 0) {
    payload.append('is_sold_out', '0')
  }

  if (imageFile.value) {
    payload.append('image', imageFile.value)
  } else if (isEditing.value && removeExistingImage.value) {
    payload.append('remove_image', '1')
  }

  try {
    if (isEditing.value) {
      const res = await api.upload(`/admin/menu/${editingId.value}`, payload)
      if (res.data?.id) {
        const idx = items.value.findIndex((i) => i.id === editingId.value)
        if (idx > -1) {
          items.value[idx] = normalizeItem(res.data)
        }
      }
      showToast(`Updated "${formData.value.name.trim()}"`)
    } else {
      const res = await api.upload('/admin/menu', payload)
      if (res.data?.id) {
        items.value.push(normalizeItem(res.data))
      }
      showToast(`Added "${formData.value.name.trim()}"`)
    }

    isModalOpen.value = false
    revokeObjectPreview()
  } catch (err) {
    formError.value = err.message || 'Could not save menu item.'
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(item) {
  if (props.readOnly) return
  const willActivate = !isActiveToday(item)

  if (willActivate && Number(item.current_stock) <= 0) {
    openEditModal(item, 'Add Quantity above 0 to activate on Today\'s Menu.')
    return
  }

  const prevActive = item.is_active
  const prevSoldOut = item.is_sold_out

  item.is_active = willActivate
  if (willActivate && item.is_sold_out && Number(item.current_stock) > 0) {
    item.is_sold_out = false
  }

  try {
    const res = await api.patch(`/admin/menu/${item.id}/toggle-active`, {
      is_active: willActivate,
    })
    if (willActivate && prevSoldOut) {
      await api.patch(`/staff/menu/${item.id}/toggle-sold-out`, { is_sold_out: false }).catch(() => {})
    }
    if (res.data?.is_active !== undefined) {
      item.is_active = Boolean(res.data.is_active)
    }
    showToast(
      item.is_active
        ? `"${item.name}" added to Today's Menu`
        : `"${item.name}" removed from Today's Menu`,
    )
  } catch {
    item.is_active = prevActive
    item.is_sold_out = prevSoldOut
    showToast('Failed to update menu status', 'warning')
  }
}

async function toggleSoldOut(item) {
  if (item.is_sold_out && item.current_stock <= 0) {
    openEditModal(item, 'Update Quantity above 0 to mark this item Available.')
    return
  }

  const prev = item.is_sold_out
  item.is_sold_out = !prev
  emit('sold-out-toggled', { id: item.id, is_sold_out: item.is_sold_out })

  try {
    await api.patch(`/staff/menu/${item.id}/toggle-sold-out`, {
      is_sold_out: item.is_sold_out,
    })
    showToast(
      item.is_sold_out ? `"${item.name}" marked Sold Out` : `"${item.name}" marked Available`,
      item.is_sold_out ? 'warning' : 'success',
    )
  } catch {
    item.is_sold_out = prev
  }
}

async function handleDeleteItem() {
  if (props.readOnly || !editingId.value) return
  if (!confirm('Permanently delete this menu item?')) return

  const targetId = editingId.value
  const deletedName = formData.value.name
  items.value = items.value.filter((i) => i.id !== targetId)
  isModalOpen.value = false

  try {
    await api.delete(`/admin/menu/${targetId}`)
    showToast(`Deleted "${deletedName}"`)
  } catch {
    fetchAdminMenu()
  }
}
</script>

<template>
  <div class="menu-manager">
    <!-- Page Title Header -->
    <header class="page-top-header">
      <h1 class="page-heading">
        {{ readOnly ? 'Canteen Menu & Availability' : 'Menu Management' }}
      </h1>

      <BaseButton v-if="!readOnly" variant="primary" size="md" @click="openCreateModal">
        <span class="btn-with-icon">
          <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Menu Item
        </span>
      </BaseButton>
    </header>

    <!-- Top Menu Scope Navbar + Compact Search & Filter under Add Menu Item -->
    <div class="scope-navbar">
      <div class="scope-left">
        <nav class="scope-tabs" role="tablist" aria-label="Menu scope">
          <button
            type="button"
            role="tab"
            :aria-selected="menuScopeTab === 'all'"
            class="scope-tab"
            :class="{ active: menuScopeTab === 'all' }"
            @click="selectScopeTab('all')"
          >
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>All Items</span>
            <span class="scope-badge tabular-nums">{{ items.length }}</span>
          </button>

          <button
            type="button"
            role="tab"
            :aria-selected="menuScopeTab === 'today'"
            class="scope-tab"
            :class="{ active: menuScopeTab === 'today' }"
            @click="selectScopeTab('today')"
          >
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <span>Today's Menu</span>
            <span class="scope-badge tabular-nums">{{ todayMenuCount }}</span>
          </button>
        </nav>
      </div>

      <div class="scope-controls">
        <div class="search-box">
          <svg class="search-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="Search menu..."
            aria-label="Search menu items"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            &times;
          </button>
        </div>

        <div class="select-wrap">
          <svg class="select-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <select v-model="statusFilter" class="filter-select" aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option v-if="menuScopeTab === 'all'" value="inactive">Inactive</option>
            <option v-if="menuScopeTab === 'all'" value="sold_out">Sold Out</option>
            <option value="low_stock">Low Qty (≤ 10)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Action Toast -->
    <Transition name="toast-pop">
      <div v-if="toastMessage" class="action-toast" :class="`tone-${toastTone}`" role="status">
        <svg v-if="toastTone === 'success'" class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <svg v-else class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Modern Underline Category Tabs -->
    <div class="category-tabs-bar" role="tablist" aria-label="Menu categories">
      <button
        v-for="tab in categoryTabs"
        :key="tab.name"
        type="button"
        role="tab"
        :aria-selected="activeCategory === tab.name"
        class="cat-tab"
        :class="{ active: activeCategory === tab.name }"
        @click="activeCategory = tab.name"
      >
        <span>{{ tab.name }}</span>
        <span class="cat-count tabular-nums">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Loading Skeleton Grid (3 per row) -->
    <div v-if="isLoading" class="cards-grid" aria-busy="true" aria-label="Loading menu cards">
      <div v-for="n in 6" :key="'sk-' + n" class="menu-card skeleton-card">
        <div class="skeleton-media shimmer"></div>
        <div class="card-body">
          <div class="skeleton-line w-60 shimmer"></div>
          <div class="skeleton-line w-85 shimmer"></div>
          <div class="skeleton-line w-45 shimmer"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="categorySections.length === 0" class="empty-state">
      <div class="empty-icon-circle" aria-hidden="true">
        <svg class="empty-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      </div>
      <p class="empty-title">
        {{
          menuScopeTab === 'today' && todayMenuCount === 0
            ? 'No active meals on Today\'s Menu'
            : 'No menu items found'
        }}
      </p>
      <BaseButton
        v-if="menuScopeTab === 'today' && todayMenuCount === 0"
        variant="primary"
        size="sm"
        @click="menuScopeTab = 'all'"
      >
        Browse All Items
      </BaseButton>
      <BaseButton v-else variant="outline" size="sm" @click="resetFilters">
        Reset Filters
      </BaseButton>
    </div>

    <!-- Category Sections (3 Cards per Row) -->
    <div v-else class="sections-stack">
      <section
        v-for="section in categorySections"
        :key="section.name"
        class="category-section"
      >
        <div class="category-section-header">
          <h3 class="category-section-title">{{ section.name }}</h3>
          <span class="category-section-count tabular-nums">{{ section.items.length }}</span>
        </div>

        <TransitionGroup name="card-grid" tag="div" class="cards-grid">
          <article
            v-for="item in section.items"
            :key="item.id"
            class="menu-card"
            :class="{
              'is-inactive': !isActiveToday(item),
              'is-sold-out': item.is_sold_out,
            }"
          >
            <!-- Tall Card Photo Holder -->
            <div class="card-media">
              <img
                v-if="isImageUrl(item.image_url)"
                :src="item.image_url"
                :alt="item.name"
                class="card-media-img"
                loading="lazy"
              />
              <div v-else class="card-media-placeholder">
                <div class="placeholder-frame">
                  <span class="placeholder-emoji" aria-hidden="true">{{ item.emoji }}</span>
                  <span class="placeholder-tag">
                    <svg class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    No photo
                  </span>
                </div>
              </div>

              <span class="status-pill" :class="`tone-${getStatusPill(item).tone}`">
                <span class="status-dot"></span>
                {{ getStatusPill(item).label }}
              </span>

              <button
                v-if="!readOnly"
                type="button"
                class="card-edit-fab"
                aria-label="Edit item"
                title="Edit item"
                @click="openEditModal(item)"
              >
                <svg class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>

            <!-- Card Content -->
            <div class="card-body">
              <div class="card-title-row">
                <h4 class="card-title">{{ item.name }}</h4>
                <span class="card-price tabular-nums">₱{{ item.price.toFixed(2) }}</span>
              </div>

              <p v-if="item.desc" class="card-desc">{{ item.desc }}</p>

              <!-- Quantity & Orders Telemetry -->
              <div class="qty-panel">
                <div class="qty-metrics">
                  <span class="qty-remaining tabular-nums">
                    <svg class="ui-icon-xs metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                    </svg>
                    <strong>{{ item.current_stock }}</strong> left
                  </span>
                  <span class="qty-ordered tabular-nums">
                    <svg class="ui-icon-xs metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    {{ item.ordered_count }} ordered
                  </span>
                </div>
                <div class="qty-track" aria-hidden="true">
                  <div
                    class="qty-fill"
                    :class="`tone-${getStockTone(item)}`"
                    :style="{ width: `${getStockBarPercent(item)}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Card Action Controls -->
            <footer class="card-actions">
              <button
                type="button"
                class="action-btn soldout-toggle"
                :class="{ active: item.is_sold_out }"
                @click="toggleSoldOut(item)"
              >
                <svg v-if="item.is_sold_out" class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <svg v-else class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
                <span>{{ item.is_sold_out ? 'Available' : 'Sold Out' }}</span>
              </button>

              <button
                v-if="!readOnly"
                type="button"
                class="action-btn day-toggle"
                :class="isActiveToday(item) ? 'deactivate' : 'activate'"
                @click="toggleActive(item)"
              >
                <svg v-if="isActiveToday(item)" class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
                <svg v-else class="ui-icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
                </svg>
                <span>{{ isActiveToday(item) ? 'Deactivate' : 'Activate' }}</span>
              </button>
            </footer>
          </article>
        </TransitionGroup>
      </section>
    </div>

    <!-- Create / Edit Menu Modal -->
    <BaseModal
      v-if="!readOnly"
      :is-open="isModalOpen"
      :title="isEditing ? 'Edit Menu Item' : 'Add Menu Item'"
      max-width="520px"
      @close="isModalOpen = false"
    >
      <form class="menu-form" novalidate @submit.prevent="handleSaveItem">
        <div v-if="formError" class="form-error-banner" role="alert">
          {{ formError }}
        </div>

        <!-- Tall Photo Upload Field -->
        <div class="form-group">
          <label class="form-label">Menu Photo</label>
          <div
            class="photo-dropzone"
            :class="{ 'has-error': fieldErrors.image }"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
            @click="fileInputRef?.click()"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="sr-only-input"
              @change="handleFileSelect"
            />
            <template v-if="imagePreviewUrl">
              <img :src="imagePreviewUrl" alt="Menu item preview" class="upload-preview-img" />
              <div class="upload-overlay-actions" @click.stop>
                <button type="button" class="photo-chip-btn" @click="fileInputRef?.click()">
                  Change
                </button>
                <button type="button" class="photo-chip-btn danger" @click="clearSelectedImage">
                  Remove
                </button>
              </div>
            </template>
            <div v-else class="dropzone-empty">
              <svg class="dropzone-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <span class="dropzone-title">Upload meal photo</span>
              <span class="dropzone-hint">JPG, PNG, WEBP up to 5MB</span>
            </div>
          </div>
          <span v-if="fieldErrors.image" class="field-error">{{ fieldErrors.image }}</span>
        </div>

        <div class="form-group">
          <label for="itemName" class="form-label">Item Name *</label>
          <input
            id="itemName"
            v-model="formData.name"
            type="text"
            class="form-input"
            :class="{ invalid: fieldErrors.name }"
            placeholder="e.g., Beef Caldereta"
            maxlength="120"
            required
          />
          <span v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</span>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label for="itemCategory" class="form-label">Category *</label>
            <select
              id="itemCategory"
              v-model="formData.category"
              class="form-select"
            >
              <option value="Meals">Meals</option>
              <option value="Snacks">Snacks</option>
              <option value="Drinks">Drinks</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label for="itemPrice" class="form-label">Price (₱) *</label>
            <input
              id="itemPrice"
              v-model.number="formData.price"
              type="number"
              step="0.5"
              min="0"
              max="99999"
              class="form-input tabular-nums"
              :class="{ invalid: fieldErrors.price }"
              required
            />
            <span v-if="fieldErrors.price" class="field-error">{{ fieldErrors.price }}</span>
          </div>

          <div class="form-group flex-1">
            <label for="itemQuantity" class="form-label">Quantity *</label>
            <input
              id="itemQuantity"
              v-model.number="formData.quantity"
              type="number"
              min="0"
              max="9999"
              step="1"
              class="form-input tabular-nums"
              :class="{ invalid: fieldErrors.quantity }"
              required
            />
            <span v-if="fieldErrors.quantity" class="field-error">{{ fieldErrors.quantity }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="itemDesc" class="form-label">Description</label>
          <textarea
            id="itemDesc"
            v-model="formData.description"
            class="form-textarea"
            rows="2"
            maxlength="500"
            placeholder="Ingredients or serving note..."
          ></textarea>
        </div>

        <label class="active-checkbox-row">
          <input v-model="formData.is_active" type="checkbox" />
          <span>Active on Today's Menu</span>
        </label>
      </form>

      <template #footer>
        <div class="modal-footer-split">
          <button
            v-if="isEditing"
            type="button"
            class="modal-delete-link"
            @click="handleDeleteItem"
          >
            Delete Item
          </button>
          <span v-else></span>

          <div class="modal-footer-right">
            <BaseButton variant="ghost" size="md" @click="isModalOpen = false">
              Cancel
            </BaseButton>
            <BaseButton variant="primary" size="md" :loading="isSaving" @click="handleSaveItem">
              {{ isEditing ? 'Save Changes' : 'Create Item' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.menu-manager {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.page-heading {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

/* Icons */
.ui-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.ui-icon-sm {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.ui-icon-xs {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.btn-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Top Scope Navbar */
.scope-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.scope-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.scope-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.scope-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: var(--color-bg-subtle);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
}

.scope-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.scope-tab:hover:not(.active) {
  color: var(--color-text-primary);
  background-color: rgba(255, 255, 255, 0.55);
}

.scope-tab:active {
  transform: scale(0.97);
}

.scope-tab.active {
  background-color: var(--color-bg-surface);
  color: var(--color-primary-base);
  box-shadow: var(--shadow-subtle);
}

.scope-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 5px;
  background-color: rgba(28, 25, 23, 0.08);
  color: var(--color-text-secondary);
}

.scope-tab.active .scope-badge {
  background-color: var(--color-primary-subtle);
  color: var(--color-primary-base);
}

/* Action Toast */
.action-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-end;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  box-shadow: var(--shadow-card);
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 80;
}

.action-toast.tone-success {
  background-color: var(--status-ready-bg);
  color: var(--status-ready-text);
  border: 1px solid var(--status-ready-accent);
}

.action-toast.tone-warning {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text);
  border: 1px solid var(--status-pending-accent);
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* Compact Search & Filter under Add Menu Item */
.search-box {
  position: relative;
  width: 210px;
  display: flex;
  align-items: center;
}

.search-svg {
  position: absolute;
  left: 11px;
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 28px 7px 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-surface);
  font-size: 13px;
  color: var(--color-text-primary);
  outline: none;
  min-height: 38px;
  box-shadow: var(--shadow-subtle);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input:focus {
  border-color: var(--color-primary-base);
  box-shadow: 0 0 0 3px var(--color-primary-focus);
}

.search-clear {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  font-size: 17px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 2px 5px;
}

.select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.select-svg {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.filter-select {
  padding: 7px 12px 7px 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  min-height: 38px;
  box-shadow: var(--shadow-subtle);
  transition: border-color 0.15s ease;
}

.filter-select:focus {
  border-color: var(--color-primary-base);
}

/* Modern Architectural Underline Category Tabs */
.category-tabs-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 4px;
  overflow: visible;
  border-bottom: 1.5px solid var(--color-border-default);
}

.cat-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 160ms ease, background-color 160ms ease;
}

.cat-tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1.5px;
  height: 2.5px;
  background-color: var(--color-primary-base);
  border-radius: 2px 2px 0 0;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-tab:hover:not(.active) {
  color: var(--color-text-primary);
  background-color: var(--color-bg-subtle);
}

.cat-tab.active {
  color: var(--color-primary-base);
  font-weight: 700;
  background-color: rgba(194, 65, 12, 0.05);
}

.cat-tab.active::after {
  transform: scaleX(1);
}

.cat-count {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 5px;
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  transition: background-color 160ms ease, color 160ms ease;
}

.cat-tab.active .cat-count {
  background-color: var(--color-primary-subtle);
  color: var(--color-primary-base);
}

/* Category Sections */
.sections-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.category-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-default);
}

.category-section-title {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-primary);
}

.category-section-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-subtle);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

/* 3 Cards Per Row Grid + Transitions */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  position: relative;
}

.card-grid-move,
.card-grid-enter-active,
.card-grid-leave-active {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}

.card-grid-enter-from,
.card-grid-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

.card-grid-leave-active {
  position: absolute;
}

.menu-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease, opacity 180ms ease;
}

.menu-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card);
}

.menu-card.is-inactive {
  opacity: 0.72;
  background-color: #FAF9F6;
}

.menu-card.is-inactive .card-media-img,
.menu-card.is-inactive .card-media-placeholder {
  filter: grayscale(0.65);
}

/* Tall Photo Holder */
.card-media {
  position: relative;
  height: 216px;
  background-color: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  overflow: hidden;
}

.card-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-card:hover .card-media-img {
  transform: scale(1.04);
}

.card-media-placeholder {
  width: 100%;
  height: 100%;
  padding: var(--space-4);
  background: radial-gradient(circle at 50% 45%, #FDFBF7 0%, #EFEAE0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-frame {
  width: 100%;
  height: 100%;
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: border-color 200ms ease, transform 240ms ease;
}

.menu-card:hover .placeholder-frame {
  border-color: var(--color-primary-base);
}

.placeholder-emoji {
  font-size: 52px;
  line-height: 1;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-card:hover .placeholder-emoji {
  transform: scale(1.08);
}

.placeholder-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pill {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.status-pill.tone-active {
  background-color: var(--status-ready-bg);
  color: var(--status-ready-text);
  border: 1px solid rgba(21, 128, 61, 0.25);
}

.status-pill.tone-danger {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.status-pill.tone-inactive {
  background-color: var(--status-completed-bg);
  color: var(--status-completed-text);
  border: 1px solid rgba(75, 85, 99, 0.25);
}

.card-edit-fab {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: rgba(255, 255, 255, 0.95);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-full);
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-subtle);
  transition: transform 140ms ease, background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

.card-edit-fab:hover {
  background-color: var(--color-primary-base);
  border-color: var(--color-primary-base);
  color: var(--color-text-inverse);
}

.card-edit-fab:active {
  transform: scale(0.95);
}

/* Card Body */
.card-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
}

.card-title {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.card-price {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-primary-base);
  white-space: nowrap;
}

.card-desc {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Quantity Telemetry Panel */
.qty-panel {
  margin-top: auto;
  background-color: var(--color-bg-canvas);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.qty-metrics {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.qty-remaining,
.qty-ordered {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.qty-remaining {
  color: var(--color-text-primary);
}

.qty-ordered {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.metric-icon {
  color: var(--color-text-muted);
}

.qty-track {
  height: 5px;
  border-radius: var(--radius-full);
  background-color: var(--color-border-default);
  overflow: hidden;
}

.qty-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.qty-fill.tone-healthy {
  background-color: var(--status-ready-accent);
}

.qty-fill.tone-warning {
  background-color: var(--status-pending-accent);
}

.qty-fill.tone-danger {
  background-color: var(--status-danger-accent);
}

.qty-fill.tone-muted {
  background-color: var(--color-text-muted);
}

/* Card Footer Actions */
.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-4) var(--space-4);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  min-height: 38px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  transition: transform 140ms ease, background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.action-btn:active {
  transform: scale(0.96);
}

.soldout-toggle:hover {
  border-color: var(--status-danger-accent);
  color: var(--status-danger-text);
  background-color: var(--status-danger-bg);
}

.soldout-toggle.active {
  background-color: var(--status-danger-bg);
  border-color: rgba(220, 38, 38, 0.35);
  color: var(--status-danger-text);
}

.soldout-toggle.active:hover {
  background-color: var(--status-ready-bg);
  border-color: rgba(21, 128, 61, 0.35);
  color: var(--status-ready-text);
}

.day-toggle.deactivate:hover {
  background-color: var(--color-bg-subtle);
  border-color: var(--color-border-strong);
}

.day-toggle.activate {
  background-color: var(--color-primary-base);
  border-color: var(--color-primary-base);
  color: var(--color-text-inverse);
}

.day-toggle.activate:hover {
  background-color: var(--color-primary-hover);
}

/* Empty & Skeleton States */
.empty-state {
  background-color: var(--color-bg-surface);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.empty-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--color-bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.empty-svg {
  width: 26px;
  height: 26px;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.skeleton-card {
  pointer-events: none;
}

.skeleton-media {
  height: 216px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
}

.w-60 { width: 60%; }
.w-85 { width: 85%; }
.w-45 { width: 45%; }

.shimmer {
  background: linear-gradient(90deg, #e5e0d8 0%, #f5f2eb 50%, #e5e0d8 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Modal Form & Upload Dropzone */
.menu-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-error-banner {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
}

.photo-dropzone {
  position: relative;
  height: 200px;
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.photo-dropzone:hover {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-subtle);
}

.photo-dropzone.has-error {
  border-color: var(--status-danger-accent);
}

.sr-only-input {
  display: none;
}

.upload-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upload-overlay-actions {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}

.photo-chip-btn {
  background-color: rgba(28, 25, 23, 0.78);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-full);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.photo-chip-btn.danger {
  background-color: rgba(185, 28, 28, 0.88);
}

.dropzone-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.dropzone-svg {
  width: 30px;
  height: 30px;
  color: var(--color-primary-base);
}

.dropzone-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.dropzone-hint {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row {
  display: flex;
  gap: var(--space-3);
}

.flex-1 {
  flex: 1;
}

.form-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.form-input,
.form-select,
.form-textarea {
  padding: 9px 11px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}

.form-input.invalid {
  border-color: var(--status-danger-accent);
}

.field-error {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--status-danger-text);
}

.active-checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
}

.modal-footer-split {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.modal-footer-right {
  display: flex;
  gap: var(--space-2);
}

.modal-delete-link {
  background: transparent;
  border: none;
  color: var(--status-danger-accent);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
}

.modal-delete-link:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .scope-controls,
  .search-box {
    width: 100%;
  }

  .form-row {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-card,
  .card-media-img,
  .placeholder-emoji,
  .qty-fill,
  .card-grid-move,
  .card-grid-enter-active,
  .card-grid-leave-active,
  .toast-pop-enter-active,
  .toast-pop-leave-active {
    transition: none !important;
    animation: none !important;
  }
}
</style>
