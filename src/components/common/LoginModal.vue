<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from './BaseButton.vue'
import BaseAlert from './BaseAlert.vue'
import { useAuth } from '../../composables/useAuth'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const router = useRouter()
const { login, logout, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

function handleClose() {
  errorMessage.value = ''
  emit('close')
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      errorMessage.value = ''
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})

async function handleLogin() {
  errorMessage.value = ''
  try {
    const data = await login({
      email: email.value.trim(),
      password: password.value,
    })

    const role = data?.user?.role
    if (role === 'staff' || role === 'admin') {
      await logout()
      errorMessage.value =
        'Staff and Administrator accounts must sign in via the Staff/Admin portal (/admin).'
      return
    }

    email.value = ''
    password.value = ''
    handleClose()
    router.push('/profile')
  } catch (err) {
    errorMessage.value = err.message || 'Login failed. Please check your credentials.'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginModalTitle"
        @click.self="handleClose"
      >
        <div class="login-card">
          <button
            type="button"
            class="modal-close-btn"
            aria-label="Close modal"
            @click="handleClose"
          >
            &times;
          </button>

          <div class="login-header">
            <span class="login-icon" aria-hidden="true">👤</span>
            <h2 id="loginModalTitle" class="login-title">Customer Sign In</h2>
            <p class="login-sub">Sign in to track orders and view your account</p>
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
              <label for="customerLoginEmail" class="form-label">Email Address</label>
              <input
                id="customerLoginEmail"
                v-model="email"
                type="email"
                class="form-input"
                placeholder="customer@canteen.local"
                required
              />
            </div>

            <div class="form-group">
              <label for="customerLoginPassword" class="form-label">Password</label>
              <input
                id="customerLoginPassword"
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background-color: rgba(28, 25, 23, 0.6);
  backdrop-filter: blur(4px);
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-8);
  box-shadow: var(--shadow-elevated);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close-btn {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  background: transparent;
  border: none;
  font-size: 26px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-btn:hover {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
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

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .login-card,
.modal-fade-leave-active .login-card {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .login-card,
.modal-fade-leave-to .login-card {
  transform: scale(0.95);
}

@media (max-width: 480px) {
  .login-card {
    padding: var(--space-6) var(--space-4);
  }
}
</style>
