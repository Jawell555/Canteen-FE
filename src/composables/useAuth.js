import { ref, computed } from 'vue'
import { api, ApiError } from '../services/api'

// Shared module-level reactive state
const user = ref(JSON.parse(localStorage.getItem('canteena_user') || 'null'))
const token = ref(localStorage.getItem('canteena_token') || null)
const isLoading = ref(false)
const error = ref(null)

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)
  const role = computed(() => user.value?.role || 'guest')
  const isCustomer = computed(() => user.value?.role === 'customer')
  const isStaff = computed(() => ['staff', 'admin'].includes(user.value?.role))
  const isAdmin = computed(() => user.value?.role === 'admin')

  /**
   * Set user session in state and localStorage
   */
  function setSession(userData, tokenString) {
    user.value = userData
    token.value = tokenString

    if (tokenString) {
      localStorage.setItem('canteena_token', tokenString)
    } else {
      localStorage.removeItem('canteena_token')
    }

    if (userData) {
      localStorage.setItem('canteena_user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('canteena_user')
    }
  }

  /**
   * Authenticate user with email and password
   */
  async function login({ email, password }) {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/login', { email, password })
      const { user: userData, token: tokenString } = response.data
      setSession(userData, tokenString)
      return response.data
    } catch (err) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Register a new customer account
   */
  async function register(registrationData) {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/register', registrationData)
      if (response.data?.token) {
        setSession(response.data.user, response.data.token)
      }
      return response.data
    } catch (err) {
      error.value = err.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Sign out and clear active session
   */
  async function logout() {
    isLoading.value = true
    try {
      if (token.value) {
        await api.post('/auth/logout').catch(() => {
          // Ignore network / unauthenticated error during logout
        })
      }
    } finally {
      setSession(null, null)
      isLoading.value = false
    }
  }

  /**
   * Fetch current authenticated user details from /auth/me
   */
  async function fetchUser() {
    if (!token.value) return null

    isLoading.value = true
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user || response.data
      localStorage.setItem('canteena_user', JSON.stringify(user.value))
      return user.value
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null, null)
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    role,
    isCustomer,
    isStaff,
    isAdmin,
    login,
    register,
    logout,
    fetchUser,
    setSession,
  }
}

export default useAuth

