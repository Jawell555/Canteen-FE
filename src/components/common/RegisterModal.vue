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

const emit = defineEmits(['close', 'switch-to-login'])

const router = useRouter()
const { register, isLoading } = useAuth()

const name = ref('')
const contact = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')

function handleClose() {
  errorMessage.value = ''
  successMessage.value = ''
  emit('close')
}

function handleSwitchToLogin() {
  errorMessage.value = ''
  successMessage.value = ''
  emit('switch-to-login')
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
      setTimeout(() => {
        if (!document.querySelector('.modal-backdrop')) {
          document.body.style.overflow = ''
        }
      }, 250)
      errorMessage.value = ''
      successMessage.value = ''
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (!document.querySelector('.modal-backdrop')) {
    document.body.style.overflow = ''
  }
})

async function handleRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  const trimmedName = name.value.trim()
  const trimmedContact = contact.value.trim()

  if (!trimmedName) {
    errorMessage.value = 'Please enter your full name.'
    return
  }

  if (!trimmedContact) {
    errorMessage.value = 'Please enter your phone number or email address.'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  const isEmail = trimmedContact.includes('@')
  const registrationPayload = {
    name: trimmedName,
    email: isEmail ? trimmedContact : `${trimmedContact.replace(/\D/g, '')}@canteen.local`,
    phone_number: !isEmail ? trimmedContact : null,
    password: password.value,
    password_confirmation: confirmPassword.value,
  }

  try {
    const data = await register(registrationPayload)
    successMessage.value = data?.message || 'Registration successful! Welcome to Canteena.'

    name.value = ''
    contact.value = ''
    password.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      handleClose()
      router.push('/profile')
    }, 1200)
  } catch (err) {
    if (err?.errors && Object.keys(err.errors).length > 0) {
      const firstKey = Object.keys(err.errors)[0]
      errorMessage.value = err.errors[firstKey][0] || err.message
    } else {
      errorMessage.value = err?.message || 'Registration failed. Please check your information.'
    }
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
        aria-labelledby="registerModalTitle"
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
            <span class="login-icon" aria-hidden="true">📝</span>
            <h2 id="registerModalTitle" class="login-title">Create Your Account</h2>
            <p class="login-sub">Register to place orders and track your meals</p>
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

          <BaseAlert
            v-if="successMessage"
            variant="success"
            class="mb-4"
            :dismissible="true"
            @dismiss="successMessage = ''"
          >
            {{ successMessage }}
          </BaseAlert>

          <form class="login-form" @submit.prevent="handleRegister">
            <div class="form-group">
              <label for="registerName" class="form-label">Full Name</label>
              <input
                id="registerName"
                v-model="name"
                type="text"
                class="form-input"
                placeholder="e.g., Maria Santos"
                required
              />
            </div>

            <div class="form-group">
              <label for="registerContact" class="form-label">Phone Number / Email</label>
              <input
                id="registerContact"
                v-model="contact"
                type="text"
                class="form-input"
                placeholder="e.g., maria@example.com or 09170000003"
                required
              />
            </div>

            <div class="form-group">
              <label for="registerPassword" class="form-label">Password</label>
              <input
                id="registerPassword"
                v-model="password"
                type="password"
                class="form-input"
                placeholder="••••••••"
                required
                minlength="6"
              />
            </div>

            <div class="form-group">
              <label for="registerConfirmPassword" class="form-label">Confirm Password</label>
              <input
                id="registerConfirmPassword"
                v-model="confirmPassword"
                type="password"
                class="form-input"
                placeholder="••••••••"
                required
                minlength="6"
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
              {{ isLoading ? 'Registering...' : 'Register' }}
            </BaseButton>
          </form>

          <div class="modal-footer-nav">
            <p class="switch-prompt">
              Already have an account?
              <button
                type="button"
                class="switch-btn"
                @click="handleSwitchToLogin"
              >
                Sign In
              </button>
            </p>
          </div>
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

.modal-footer-nav {
  margin-top: var(--space-6);
  text-align: center;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-4);
}

.switch-prompt {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.switch-btn {
  background: none;
  border: none;
  color: var(--color-primary-base);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
  text-decoration: underline;
  transition: color 0.15s ease;
}

.switch-btn:hover {
  color: var(--color-primary-dark);
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
