<script setup>
import { watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import StaffDashboardView from './StaffDashboardView.vue'
import LoginView from './LoginView.vue'

const router = useRouter()
const { isAuthenticated, user } = useAuth()

watchEffect(() => {
  if (isAuthenticated.value && user.value?.role === 'admin') {
    router.replace('/admin')
  }
})
</script>

<template>
  <StaffDashboardView v-if="isAuthenticated && user?.role === 'staff'" />
  <LoginView v-else portal="staff" />
</template>
