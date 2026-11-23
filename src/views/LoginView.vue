<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/common/BaseButton.vue'
import BaseAlert from '../components/common/BaseAlert.vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  portal: {
    type: String,
    default: 'admin',
  },
})

const router = useRouter()
const { login, logout, isLoading, isAuthenticated, user } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const isStaffPortal = computed(() => props.portal === 'staff')

const portalConfig = computed(() => {
  if (isStaffPortal.value) {
    return {
      icon: '👨‍🍳',
      title: 'Staff Login',
      sub: 'Sign in to access kitchen queue and order fulfillment',
      placeholder: 'staff@canteen.local',
    }
  }
  return {
    icon: '⚙️',
    title: 'Administrator Login',
    sub: 'Sign in to access canteen management and sales reporting',
    placeholder: 'admin@canteen.local',
  }
})

function checkExistingSession() {
  if (!isAuthenticated.value) return
  const currentRole = user.value?.role
  if (isStaffPortal.value) {
    if (currentRole === 'admin') {
      errorMessage.value =
        'This is an Administrator account. Please log in through the Admin Portal.'
    } else if (currentRole !== 'staff') {
      errorMessage.value =
        'Access restricted. Customer accounts cannot access the Staff Portal.'
    }
  } else {
    if (currentRole === 'staff') {
      errorMessage.value =
        'This is a Staff account. Please log in through the Staff Portal.'
    } else if (currentRole !== 'admin') {
      errorMessage.value =
        'Access restricted. Customer accounts cannot access the Admin Portal.'
    }
  }
}

onMounted(() => {
  checkExistingSession()
})

async function handleLogin() {
  errorMessage.value = ''
  try {
    const data = await login({
      email: email.value.trim(),
      password: password.value,
    })

    const role = data?.user?.role
    if (isStaffPortal.value) {
      if (role === 'staff') {
        router.push('/staff')
      } else if (role === 'admin') {
        await logout()
        errorMessage.value =
          'This is an Administrator account. Please log in through the Admin Portal.'
      } else {
        await logout()
        errorMessage.value =
          'Access restricted. Customer accounts cannot access the Staff Portal.'
      }
    } else {
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'staff') {
        await logout()
        errorMessage.value =
          'This is a Staff account. Please log in through the Staff Portal.'
      } else {
        await logout()
        errorMessage.value =
          'Access restricted. Customer accounts cannot access the Admin Portal.'
      }
    }
  } catch (err) {
    errorMessage.value = err.message || 'Invalid email or password.'
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <div class="login-header">
        <span class="login-icon" aria-hidden="true">{{ portalConfig.icon }}</span>
        <h1 class="login-title">{{ portalConfig.title }}</h1>
        <p class="login-sub">{{ portalConfig.sub }}</p>
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
            :placeholder="portalConfig.placeholder"
            required
            @input="errorMessage = ''"
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
            @input="errorMessage = ''"
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
</style>
