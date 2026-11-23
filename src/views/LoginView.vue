<script setup>
import { ref } from 'vue'
import BaseButton from '../components/common/BaseButton.vue'

const email = ref('')
const password = ref('')
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <div class="login-header">
        <span class="login-icon" aria-hidden="true">🔐</span>
        <h1 class="login-title">Staff & Admin Login</h1>
        <p class="login-sub">Sign in to access kitchen queue or canteen management</p>
      </div>

      <form class="login-form" @submit.prevent>
        <div class="form-group">
          <label for="loginEmail" class="form-label">Email Address</label>
          <input
            id="loginEmail"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="staff@canteena.local"
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

        <BaseButton variant="primary" block size="lg" type="submit" class="mt-4">
          Sign In
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

.mt-4 {
  margin-top: var(--space-4);
}
</style>

