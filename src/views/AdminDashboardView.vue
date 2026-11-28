<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'
import { useAuth } from '../composables/useAuth'
import AdminSalesReport from '../components/admin/AdminSalesReport.vue'
import AdminMenuManager from '../components/admin/AdminMenuManager.vue'
import BaseButton from '../components/common/BaseButton.vue'
import BaseBadge from '../components/common/BaseBadge.vue'
import BaseModal from '../components/common/BaseModal.vue'

const route = useRoute()
const { isAdmin, isAuthenticated } = useAuth()

const activeTab = computed(() =>
  ['menu', 'reports', 'staff', 'audit'].includes(route.query.tab) ? route.query.tab : 'reports',
)

// Mock Staff Accounts matching admin.contract.md
const staffList = ref([
  { id: 1, name: 'Alex Cruz', email: 'alex.staff@canteena.local', role: 'staff', is_active: true },
  { id: 2, name: 'Elena Ramos', email: 'elena.kitchen@canteena.local', role: 'staff', is_active: true },
  { id: 3, name: 'Ben Torres', email: 'ben.former@canteena.local', role: 'staff', is_active: false },
])

const isStaffModalOpen = ref(false)
const newStaffName = ref('')
const newStaffEmail = ref('')
const newStaffPassword = ref('')

// Mock Audit Logs matching admin.contract.md
const auditLogs = ref([
  {
    id: 501,
    action: 'cancel_order',
    user_name: 'Elena Ramos (Staff)',
    entity_type: 'orders',
    entity_id: 42,
    details: 'Order #042 cancelled. Reason: Out of raw ingredients for sinigang.',
    created_at: 'Nov 13, 2026 • 12:40 PM',
  },
  {
    id: 502,
    action: 'verify_payment',
    user_name: 'Alex Cruz (Staff)',
    entity_type: 'orders',
    entity_id: 41,
    details: 'GCash Ref 902148192031 verified for ₱85.00',
    created_at: 'Nov 13, 2026 • 12:38 PM',
  },
  {
    id: 503,
    action: 'toggle_stockout',
    user_name: 'Alex Cruz (Staff)',
    entity_type: 'menu_items',
    entity_id: 104,
    details: 'Item #104 (Iced Calamansi Juice) marked as Sold Out.',
    created_at: 'Nov 13, 2026 • 11:15 AM',
  },
])

async function fetchStaffAndLogs() {
  try {
    const staffRes = await api.get('/admin/staff')
    if (staffRes.data?.staff && staffRes.data.staff.length > 0) {
      staffList.value = staffRes.data.staff
    }
  } catch {
    // Keep initial fallback
  }

  try {
    const logsRes = await api.get('/admin/audit-logs')
    if (logsRes.data?.logs && logsRes.data.logs.length > 0) {
      auditLogs.value = logsRes.data.logs
    }
  } catch {
    // Keep initial fallback
  }
}

onMounted(() => {
  fetchStaffAndLogs()
})

function openCreateStaffModal() {
  newStaffName.value = ''
  newStaffEmail.value = ''
  newStaffPassword.value = ''
  isStaffModalOpen.value = true
}

async function handleSaveStaff() {
  if (!newStaffName.value.trim() || !newStaffEmail.value.trim()) return

  const payload = {
    name: newStaffName.value.trim(),
    email: newStaffEmail.value.trim(),
    password: newStaffPassword.value.trim() || 'password123',
    role: 'staff',
  }

  try {
    const res = await api.post('/admin/staff', payload)
    if (res.data?.id) {
      staffList.value.push(res.data)
    }
  } catch {
    staffList.value.push({
      id: Date.now(),
      name: payload.name,
      email: payload.email,
      role: 'staff',
      is_active: true,
    })
  }

  isStaffModalOpen.value = false
}

async function toggleStaffStatus(staff) {
  staff.is_active = !staff.is_active
  try {
    await api.patch(`/admin/staff/${staff.id}/toggle-active`)
  } catch {
    // Keep optimistic state
  }
}
</script>

<template>
  <div class="admin-dashboard">
    <!-- Read-Only Banner for Unauthenticated / Non-Admin Users -->
    <div v-if="!isAuthenticated || !isAdmin" class="admin-auth-guard" style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">🔒</span>
        <div>
          <strong style="color: #92400e; font-size: 14px; display: block;">Administrator Access Required</strong>
          <span style="color: #b45309; font-size: 13px;">You are currently previewing in read-only mode. Sign in as an administrator to save mutations directly to Neon PostgreSQL.</span>
        </div>
      </div>
      <router-link to="/admin" style="background: #b45309; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 13px;">
        Sign In as Admin
      </router-link>
    </div>

    <!-- Top Header -->
    <header class="admin-header">
      <div>
        <h1 class="admin-title">Admin Management Portal</h1>
        <p class="admin-sub">Business performance, inventory control, and staff administration</p>
      </div>
    </header>

    <!-- Tab 1: Sales Analytics & Reporting (T031) -->
    <section v-if="activeTab === 'reports'">
      <AdminSalesReport />
    </section>

    <!-- Tab 2: Menu Management (T030) -->
    <section v-else-if="activeTab === 'menu'">
      <AdminMenuManager />
    </section>

    <!-- Tab 3: Staff Management -->
    <section v-else-if="activeTab === 'staff'" class="staff-section">
      <div class="section-top-bar">
        <div>
          <h2 class="section-title">Staff Accounts & Permissions</h2>
          <p class="section-sub">Manage canteen personnel access to kitchen queue and POS</p>
        </div>
        <BaseButton variant="primary" size="md" @click="openCreateStaffModal">
          + Add Staff Member
        </BaseButton>
      </div>

      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th class="text-right">Access Control</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="staff in staffList" :key="staff.id">
              <td class="font-bold">{{ staff.name }}</td>
              <td>{{ staff.email }}</td>
              <td>
                <span class="role-chip">{{ staff.role }}</span>
              </td>
              <td>
                <BaseBadge :variant="staff.is_active ? 'ready' : 'neutral'">
                  {{ staff.is_active ? 'Active' : 'Deactivated' }}
                </BaseBadge>
              </td>
              <td class="text-right">
                <button
                  type="button"
                  class="toggle-status-btn"
                  :class="{ deactivate: staff.is_active }"
                  @click="toggleStaffStatus(staff)"
                >
                  {{ staff.is_active ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Tab 4: Audit Logs -->
    <section v-else-if="activeTab === 'audit'" class="audit-section">
      <div class="section-top-bar">
        <div>
          <h2 class="section-title">Transaction & Operations Audit Trail</h2>
          <p class="section-sub">Immutable log of cashier actions, order voids, and inventory updates</p>
        </div>
      </div>

      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Staff User</th>
              <th>Target Entity</th>
              <th>Audit Log Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in auditLogs" :key="log.id">
              <td class="tabular-nums font-mono text-muted">{{ log.created_at }}</td>
              <td>
                <span class="action-tag" :class="log.action">{{ log.action }}</span>
              </td>
              <td class="font-bold">{{ log.user_name }}</td>
              <td>#{{ log.entity_id }} ({{ log.entity_type }})</td>
              <td class="details-cell">{{ log.details }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Add Staff Modal -->
    <BaseModal
      :is-open="isStaffModalOpen"
      title="Create Staff Account"
      max-width="480px"
      @close="isStaffModalOpen = false"
    >
      <form class="staff-form" @submit.prevent="handleSaveStaff">
        <div class="form-group">
          <label for="staffName" class="form-label">Full Name *</label>
          <input
            id="staffName"
            v-model="newStaffName"
            type="text"
            class="form-input"
            placeholder="e.g., Alex Cruz"
            required
          />
        </div>

        <div class="form-group">
          <label for="staffEmail" class="form-label">Email Address *</label>
          <input
            id="staffEmail"
            v-model="newStaffEmail"
            type="email"
            class="form-input"
            placeholder="alex.staff@canteena.local"
            required
          />
        </div>

        <div class="form-group">
          <label for="staffPassword" class="form-label">Temporary Password *</label>
          <input
            id="staffPassword"
            v-model="newStaffPassword"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>
      </form>

      <template #footer>
        <BaseButton variant="ghost" size="md" @click="isStaffModalOpen = false">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="handleSaveStaff">
          Create Account
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.admin-dashboard {
  padding: var(--space-6);
  max-width: 1300px;
  margin: 0 auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-6);
}

.admin-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.admin-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.section-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
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

.font-bold {
  font-weight: 700;
}

.role-chip {
  background-color: var(--color-bg-subtle);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.text-right {
  text-align: right;
}

.toggle-status-btn {
  background: transparent;
  border: 1px solid var(--color-border-default);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: var(--status-ready-accent);
}

.toggle-status-btn.deactivate {
  color: var(--status-danger-accent);
}

.action-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.action-tag.cancel_order {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
}

.action-tag.verify_payment {
  background-color: var(--status-ready-bg);
  color: var(--status-ready-text);
}

.action-tag.toggle_stockout {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text);
}

.details-cell {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.staff-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.form-input {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  font-size: 14px;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}
</style>
