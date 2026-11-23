<script setup>
import { useAuth } from '../composables/useAuth'
import StaffDashboardView from './StaffDashboardView.vue'
import LoginView from './LoginView.vue'

const { isAuthenticated, user } = useAuth()
</script>

<template>
  <StaffDashboardView v-if="isAuthenticated && user?.role === 'staff'" />
  <LoginView v-else portal="staff" />
</template>
