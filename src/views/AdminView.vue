<script setup>
import { watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AdminDashboardView from './AdminDashboardView.vue'
import LoginView from './LoginView.vue'

const router = useRouter()
const { isAuthenticated, user } = useAuth()

watchEffect(() => {
  if (isAuthenticated.value && user.value?.role === 'staff') {
    router.replace('/staff')
  }
})
</script>

<template>
  <AdminDashboardView v-if="isAuthenticated && user?.role === 'admin'" />
  <LoginView v-else portal="admin" />
</template>
