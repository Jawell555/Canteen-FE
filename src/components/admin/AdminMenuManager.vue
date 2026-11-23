<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../services/api'
import BaseButton from '../common/BaseButton.vue'
import BaseBadge from '../common/BaseBadge.vue'
import BaseModal from '../common/BaseModal.vue'

const items = ref([
  {
    id: 101,
    name: 'Chicken Adobo with Rice',
    category: 'Meals',
    price: 85.0,
    daily_stock_limit: 50,
    current_stock: 24,
    is_sold_out: false,
    desc: 'Classic savory chicken braised in vinegar and soy sauce.',
  },
  {
    id: 102,
    name: 'Pork Sinigang with Rice',
    category: 'Meals',
    price: 95.0,
    daily_stock_limit: 40,
    current_stock: 15,
    is_sold_out: false,
    desc: 'Tamarind soured broth with pork ribs and water spinach.',
  },
  {
    id: 103,
    name: 'Toasted Ham & Cheese',
    category: 'Snacks',
    price: 45.0,
    daily_stock_limit: 60,
    current_stock: 12,
    is_sold_out: false,
    desc: 'Golden crisp bread with smoked ham and melted cheese.',
  },
  {
    id: 104,
    name: 'Iced Calamansi Juice',
    category: 'Drinks',
    price: 25.0,
    daily_stock_limit: 50,
    current_stock: 0,
    is_sold_out: true,
    desc: 'Chilled native citrus juice freshly squeezed with honey.',
  },
])

const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const formData = ref({
  name: '',
  category: 'Meals',
  price: 0,
  daily_stock_limit: 50,
  description: '',
})

async function fetchAdminMenu() {
  try {
    const res = await api.get('/admin/menu')
    if (res.data?.items && res.data.items.length > 0) {
      items.value = res.data.items
    }
  } catch {
    // If unauthenticated or offline, keep default items
  }
}

onMounted(() => {
  fetchAdminMenu()
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    name: '',
    category: 'Meals',
    price: 60,
    daily_stock_limit: 50,
    description: '',
  }
  isModalOpen.value = true
}

function openEditModal(item) {
  isEditing.value = true
  editingId.value = item.id
  formData.value = {
    name: item.name,
    category: item.category,
    price: item.price,
    daily_stock_limit: item.daily_stock_limit,
    description: item.desc || '',
  }
  isModalOpen.value = true
}

async function handleSaveItem() {
  if (!formData.value.name.trim()) return

  const payload = {
    name: formData.value.name.trim(),
    category: formData.value.category,
    price: Number(formData.value.price),
    daily_stock_limit: Number(formData.value.daily_stock_limit),
    description: formData.value.description.trim(),
  }

  if (isEditing.value) {
    const idx = items.value.findIndex((i) => i.id === editingId.value)
    if (idx > -1) {
      items.value[idx] = {
        ...items.value[idx],
        ...payload,
        desc: formData.value.description,
      }
    }
    try {
      await api.put(`/admin/menu/${editingId.value}`, payload)
    } catch {
      // Optimistic update retained
    }
  } else {
    try {
      const res = await api.post('/admin/menu', payload)
      if (res.data?.id) {
        items.value.push({
          id: res.data.id,
          name: res.data.name,
          category: formData.value.category,
          price: Number(res.data.price),
          daily_stock_limit: Number(res.data.daily_stock_limit),
          current_stock: Number(res.data.current_stock ?? res.data.daily_stock_limit),
          is_sold_out: Boolean(res.data.is_sold_out),
          desc: res.data.description,
        })
      }
    } catch {
      items.value.push({
        id: Date.now(),
        name: formData.value.name,
        category: formData.value.category,
        price: Number(formData.value.price),
        daily_stock_limit: Number(formData.value.daily_stock_limit),
        current_stock: Number(formData.value.daily_stock_limit),
        is_sold_out: false,
        desc: formData.value.description,
      })
    }
  }

  isModalOpen.value = false
}

async function handleDeleteItem(itemId) {
  if (confirm('Are you sure you want to deactivate this menu item?')) {
    items.value = items.value.filter((i) => i.id !== itemId)
    try {
      await api.delete(`/admin/menu/${itemId}`)
    } catch {
      // Optimistic delete
    }
  }
}

async function toggleSoldOut(item) {
  item.is_sold_out = !item.is_sold_out
  try {
    await api.patch(`/staff/menu/${item.id}/toggle-sold-out`, {
      is_sold_out: item.is_sold_out,
    })
  } catch {
    // Optimistic toggle
  }
}
</script>

<template>
  <div class="menu-manager">
    <!-- Header with Action -->
    <header class="manager-header">
      <div>
        <h2 class="section-title">Menu Items & Inventory Limits</h2>
        <p class="section-sub">Configure canteen offerings, pricing, and daily replenishment quotas</p>
      </div>
      <BaseButton variant="primary" size="md" @click="openCreateModal">
        + Add Menu Item
      </BaseButton>
    </header>

    <!-- Menu Table -->
    <div class="table-container">
      <table class="admin-table" aria-label="Menu Items Table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th>Category</th>
            <th>Price</th>
            <th>Daily Limit</th>
            <th>Stock Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <div class="item-title-cell">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-desc">{{ item.desc }}</span>
              </div>
            </td>
            <td>
              <span class="category-chip">{{ item.category }}</span>
            </td>
            <td class="tabular-nums font-bold">
              ₱{{ item.price.toFixed(2) }}
            </td>
            <td class="tabular-nums">
              {{ item.current_stock }} / {{ item.daily_stock_limit }}
            </td>
            <td>
              <BaseBadge
                :variant="item.is_sold_out ? 'danger' : 'ready'"
                class="cursor-pointer"
                @click="toggleSoldOut(item)"
              >
                {{ item.is_sold_out ? 'Sold Out' : 'Available' }}
              </BaseBadge>
            </td>
            <td class="text-right actions-cell">
              <button
                type="button"
                class="table-action-btn edit-btn"
                @click="openEditModal(item)"
              >
                Edit
              </button>
              <button
                type="button"
                class="table-action-btn delete-btn"
                @click="handleDeleteItem(item.id)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create / Edit Menu Modal -->
    <BaseModal
      :is-open="isModalOpen"
      :title="isEditing ? 'Edit Menu Item' : 'New Canteen Menu Item'"
      max-width="500px"
      @close="isModalOpen = false"
    >
      <form class="menu-form" @submit.prevent="handleSaveItem">
        <div class="form-group">
          <label for="itemName" class="form-label">Item Name *</label>
          <input
            id="itemName"
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="e.g., Beef Caldereta"
            required
          />
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
              class="form-input tabular-nums"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="itemLimit" class="form-label">Daily Stock Quota *</label>
          <input
            id="itemLimit"
            v-model.number="formData.daily_stock_limit"
            type="number"
            min="1"
            class="form-input tabular-nums"
            required
          />
          <span class="field-hint">Automatic replenishment pool limit resetting every morning</span>
        </div>

        <div class="form-group">
          <label for="itemDesc" class="form-label">Description / Ingredients</label>
          <textarea
            id="itemDesc"
            v-model="formData.description"
            class="form-textarea"
            rows="3"
            placeholder="Short overview of ingredients and flavor profile..."
          ></textarea>
        </div>
      </form>

      <template #footer>
        <BaseButton variant="ghost" size="md" @click="isModalOpen = false">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="handleSaveItem">
          {{ isEditing ? 'Save Changes' : 'Create Item' }}
        </BaseButton>
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

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.table-container {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-subtle);
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.admin-table th {
  background-color: var(--color-bg-subtle);
  padding: 12px 16px;
  font-weight: 700;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border-default);
}

.admin-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
}

.admin-table tr:hover td {
  background-color: #FAF8F5;
}

.item-title-cell {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.category-chip {
  background-color: var(--color-bg-subtle);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.font-bold {
  font-weight: 700;
}

.text-right {
  text-align: right;
}

.actions-cell {
  white-space: nowrap;
}

.table-action-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.edit-btn {
  color: var(--color-primary-base);
}

.edit-btn:hover {
  background-color: var(--color-primary-subtle);
}

.delete-btn {
  color: var(--status-danger-accent);
}

.delete-btn:hover {
  background-color: var(--status-danger-bg);
}

.cursor-pointer {
  cursor: pointer;
}

/* Modal Form Styles */
.menu-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.flex-1 {
  flex: 1;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
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

.field-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}
</style>

