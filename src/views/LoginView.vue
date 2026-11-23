<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/common/BaseButton.vue'
import BaseAlert from '../components/common/BaseAlert.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

function fillCredentials(fillEmail, fillPass) {
  email.value = fillEmail
  password.value = fillPass
  handleLogin()
}

async function handleLogin() {
  errorMessage.value = ''
  try {
    const data = await login({
      email: email.value.trim(),
      password: password.value,
    })

    const role = data?.user?.role
    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'staff') {
      router.push('/staff')
    } else {
      router.push('/profile')
    }
  } catch (err) {
    errorMessage.value = err.message || 'Login failed. Please check your credentials.'
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <div class="login-header">
        <span class="login-icon" aria-hidden="true">🔐</span>
        <h1 class="login-title">Staff & Admin Login</h1>
        <p class="login-sub">Sign in to access kitchen queue or canteen management</p>
      </div>

      <BaseAlert
        v-if="errorMessage"
        variant="danger"
        class="mb-4"
        :dismissible="true"
        @dismiss="errorMessage = ''"
      >
        {{ errorMessage }}
      </BaseAlert>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="loginEmail" class="form-label">Email Address</label>
          <input
            id="loginEmail"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="staff@canteen.local"
            required
          />
        </div>

        <div class="form-group">
          <label for="loginPassword" class="form-label">Password</label>
          <input
            id="loginPassword"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        <BaseButton
          variant="primary"
          block
          size="lg"
          type="submit"
          class="mt-4"
          :loading="isLoading"
        >
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </BaseButton>
      </form>

      <!-- Quick Demo Sign-in Helpers -->
      <div class="demo-helpers">
        <span class="demo-label">⚡ 1-Click Role Login:</span>
        <div class="demo-buttons">
          <button
            type="button"
            class="demo-chip staff-chip"
            @click="fillCredentials('staff@canteen.local', 'staff123')"
          >
            👨‍🍳 Kitchen Staff
          </button>
          <button
            type="button"
            class="demo-chip admin-chip"
            @click="fillCredentials('admin@canteen.local', 'admin123')"
          >
            ⚙️ Administrator
          </button>
          <button
            type="button"
            class="demo-chip customer-chip"
            @click="fillCredentials('customer@canteen.local', 'customer123')"
          >
            👤 Customer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-8);
  box-shadow: var(--shadow-card);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.login-icon {
  font-size: 36px;
  display: block;
  margin-bottom: var(--space-2);
}

.login-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.login-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.login-form {
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
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  font-size: 15px;
  background-color: var(--color-bg-subtle);
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}

.mb-4 {
  margin-bottom: var(--space-4);
}

.mt-4 {
  margin-top: var(--space-4);
}

.demo-helpers {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px dashed var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.demo-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.demo-chip {
  flex: 1;
  min-width: 100px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.demo-chip:hover {
  background-color: var(--color-bg-surface);
  transform: translateY(-1px);
}

.staff-chip:hover {
  border-color: #0284c7;
  color: #0369a1;
}

.admin-chip:hover {
  border-color: #dc2626;
  color: #b91c1c;
}

.customer-chip:hover {
  border-color: #16a34a;
  color: #15803d;
}
</style>
