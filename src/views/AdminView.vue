<script setup>
import { useAuth } from '../composables/useAuth'
import AdminDashboardView from './AdminDashboardView.vue'
import LoginView from './LoginView.vue'

const { isAuthenticated, user } = useAuth()
</script>

<template>
  <AdminDashboardView v-if="isAuthenticated && user?.role === 'admin'" />
  <LoginView v-else portal="admin" />
</template>
