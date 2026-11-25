<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import LoginModal from './LoginModal.vue'
import RegisterModal from './RegisterModal.vue'

defineProps({
  cartCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['toggle-cart'])

const router = useRouter()
const currentRouteName = computed(() => router.currentRoute.value.name)
const { user, isAuthenticated, isAdmin, logout } = useAuth()

const isMobileDrawerOpen = ref(false)
const isLoginModalOpen = ref(false)
const isRegisterModalOpen = ref(false)
const isAccountMenuOpen = ref(false)

function toggleAccountMenu() {
  isAccountMenuOpen.value = !isAccountMenuOpen.value
}

function closeAccountMenu() {
  isAccountMenuOpen.value = false
}

function toggleMobileDrawer() {
  isMobileDrawerOpen.value = !isMobileDrawerOpen.value
}

function closeMobileDrawer() {
  isMobileDrawerOpen.value = false
  isAccountMenuOpen.value = false
}

function openLoginModal() {
  closeMobileDrawer()
  isRegisterModalOpen.value = false
  isLoginModalOpen.value = true
}

function closeLoginModal() {
  isLoginModalOpen.value = false
}

function closeRegisterModal() {
  isRegisterModalOpen.value = false
}

function switchToRegister() {
  isLoginModalOpen.value = false
  setTimeout(() => {
    isRegisterModalOpen.value = true
  }, 220)
}

function switchToLogin() {
  isRegisterModalOpen.value = false
  setTimeout(() => {
    isLoginModalOpen.value = true
  }, 220)
}

async function handleLogout() {
  closeMobileDrawer()
  await logout()
  router.push('/')
}

// Automatically close drawer when route changes
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    closeMobileDrawer()
    closeAccountMenu()
  },
)

// Prevent background scrolling when mobile drawer is open
watch(isMobileDrawerOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="app-navbar">
    <div class="navbar-container">
      <div class="navbar-left">
        <!-- Mobile Hamburger Button (Touch target >= 44px) -->
        <button
          type="button"
          class="hamburger-btn"
          :aria-expanded="isMobileDrawerOpen"
          aria-label="Toggle navigation menu"
          @click="toggleMobileDrawer"
        >
          <span class="hamburger-icon" aria-hidden="true">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </span>
        </button>

        <!-- Brand Link -->
        <router-link to="/" class="brand-link" @click="closeMobileDrawer">
          <span class="brand-logo" aria-hidden="true">🍳</span>
          <div class="brand-text">
            <span class="brand-name">Canteena</span>
            <span class="brand-sub">Campus Bites</span>
          </div>
        </router-link>
      </div>

      <!-- Desktop Nav Links (> 640px) -->
      <nav class="nav-links desktop-nav" aria-label="Main Navigation">
        <router-link to="/" class="nav-link" :class="{ active: currentRouteName === 'menu' }">
          Menu
        </router-link>
        <router-link
          to="/orders"
          class="nav-link"
          :class="{ active: currentRouteName === 'orders' }"
        >
          Track Order
        </router-link>
        
        <router-link
          v-if="user?.role === 'staff'"
          to="/staff"
          class="nav-link staff-link"
          :class="{ active: currentRouteName === 'staff' }"
        >
          Staff Queue
        </router-link>
        <router-link
          v-if="isAdmin"
          to="/admin"
          class="nav-link staff-link"
          :class="{ active: currentRouteName === 'admin' }"
        >
          Admin
        </router-link>
      </nav>

      <div class="navbar-actions">
        
<!-- ACCOUNT DROPDOWN - LOGGED IN USERS -->
<div v-if="isAuthenticated" class="account-dropdown">

  <button
    type="button"
    class="user-chip account-trigger"
    :aria-expanded="isAccountMenuOpen"
    aria-haspopup="true"
    @click="toggleAccountMenu"
  >
    <span class="user-role-badge" :class="user?.role">
      {{ user?.role }}
    </span>

    <span class="user-name-text">
      {{ user?.name?.split(' ')[0] }}
    </span>

    <span class="dropdown-arrow" :class="{ rotated: isAccountMenuOpen }">
      ▾
    </span>
  </button>

  <Transition name="dropdown">
    <div v-if="isAccountMenuOpen" class="account-menu">

      <div class="account-menu-header">
        <strong>{{ user?.name }}</strong>
        <span>{{ user?.email }}</span>
      </div>

      <div class="account-menu-divider"></div>

      <router-link
        to="/profile"
        class="account-menu-item"
        @click="closeAccountMenu"
      >
        <span>👤</span>
        Profile
      </router-link>

      <router-link
        to="/settings"
        class="account-menu-item"
        @click="closeAccountMenu"
      >
        <span>⚙️</span>
        Settings
      </router-link>

      <div class="account-menu-divider"></div>

      <button
        type="button"
        class="account-menu-item logout-menu-item"
        @click="handleLogout"
      >
        <span>↪</span>
        Logout
      </button>

    </div>
  </Transition>
</div>

<!-- SIGN IN - GUEST USERS -->
<button
  v-else
  type="button"
  class="login-btn"
  @click="openLoginModal"
>
  Sign In
</button>


        <button
          type="button"
          class="cart-btn"
          aria-label="Open shopping cart"
          @click="$emit('toggle-cart')"
        >
          <span class="cart-icon" aria-hidden="true">🛒</span>
          <span class="cart-label">Cart</span>
          <span v-if="cartCount > 0" class="cart-badge tabular-nums">
            {{ cartCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Mobile Slide-out Drawer (Impeccable & Taste Standard) -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="isMobileDrawerOpen"
          class="drawer-backdrop"
          aria-modal="true"
          role="dialog"
          @click.self="closeMobileDrawer"
        >
          <aside class="drawer-panel">
            <header class="drawer-header">
              <div class="drawer-brand">
                <span class="brand-logo" aria-hidden="true">🍳</span>
                <div class="brand-text">
                  <span class="brand-name">Canteena</span>
                  <span class="brand-sub">Campus Bites</span>
                </div>
              </div>
              <button
                type="button"
                class="drawer-close-btn"
                aria-label="Close navigation drawer"
                @click="closeMobileDrawer"
              >
                &times;
              </button>
            </header>

            <div class="drawer-content">
              <!-- Mobile Auth Status Banner -->
              <div v-if="isAuthenticated" class="drawer-user-info">
                <span class="drawer-avatar">👤</span>
                <div class="drawer-user-meta">
                  <span class="drawer-user-name">{{ user?.name }}</span>
                  <span class="drawer-user-email">{{ user?.email }}</span>
                </div>
                <button type="button" class="drawer-logout-btn" @click="handleLogout">
                  Logout
                </button>
              </div>
              <div v-else class="drawer-signin-banner">
                <button type="button" class="drawer-signin-btn" @click="openLoginModal">
                  🔑 Sign In to Canteena
                </button>
              </div>

              <span class="drawer-section-label">Order & Account</span>
              
              
              <nav class="drawer-nav" aria-label="Mobile Main Navigation">

                <!-- Menu: Available to Everyone -->
                <router-link
                  to="/"
                  class="drawer-nav-item"
                  :class="{ active: currentRouteName === 'menu' }"
                  @click="closeMobileDrawer"
                >
                  <span class="nav-icon" aria-hidden="true">🍲</span>
                  <span>Today's Menu</span>
                </router-link>

                <!-- Track Order: Available to Everyone -->
                <router-link
                  to="/orders"
                  class="drawer-nav-item"
                  :class="{ active: currentRouteName === 'orders' }"
                  @click="closeMobileDrawer"
                >
                  <span class="nav-icon" aria-hidden="true">📋</span>
                  <span>Track Live Order</span>
                </router-link>

                <!-- Profile and Settings: Logged-in Users Only -->
                <template v-if="isAuthenticated">

                  <router-link
                    to="/profile"
                    class="drawer-nav-item"
                    :class="{ active: currentRouteName === 'profile' }"
                    @click="closeMobileDrawer"
                  >
                    <span class="nav-icon" aria-hidden="true">👤</span>
                    <span>My Profile & History</span>
                  </router-link>

                  <router-link
                    to="/settings"
                    class="drawer-nav-item"
                    :class="{ active: currentRouteName === 'settings' }"
                    @click="closeMobileDrawer"
                  >
                    <span class="nav-icon" aria-hidden="true">⚙️</span>
                    <span>Settings</span>
                  </router-link>

                </template>

              </nav>


              <template v-if="user?.role === 'staff' || isAdmin">
                <div class="drawer-divider"></div>
                <span class="drawer-section-label">Canteen Operations</span>
                <nav class="drawer-nav" aria-label="Mobile Staff Navigation">
                  <router-link
                    v-if="user?.role === 'staff'"
                    to="/staff"
                    class="drawer-nav-item staff-item"
                    :class="{ active: currentRouteName === 'staff' }"
                  >
                    <span class="nav-icon" aria-hidden="true">👨‍🍳</span>
                    <span>Staff Kitchen Queue</span>
                  </router-link>
                  <router-link
                    v-if="isAdmin"
                    to="/admin"
                    class="drawer-nav-item staff-item"
                    :class="{ active: currentRouteName === 'admin' }"
                  >
                    <span class="nav-icon" aria-hidden="true">⚙️</span>
                    <span>Admin Portal</span>
                  </router-link>
                </nav>
              </template>
            </div>

            <footer class="drawer-footer">
              <span class="footer-canteen-note">Canteena v1.0 • Campus Ordering</span>
            </footer>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <LoginModal
      :is-open="isLoginModalOpen"
      @close="closeLoginModal"
      @switch-to-register="switchToRegister"
    />
    <RegisterModal
      :is-open="isRegisterModalOpen"
      @close="closeRegisterModal"
      @switch-to-login="switchToLogin"
    />
  </header>
</template>

<style scoped>


/* ACCOUNT DROPDOWN */
.account-dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

.account-trigger {
  cursor: pointer;
  font-family: inherit;
  min-height: 38px;
}

.dropdown-arrow {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.account-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 230px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-elevated);
  padding: 8px;
  z-index: 200;
}

.account-menu-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  overflow: hidden;
}

.account-menu-header strong {
  font-size: 14px;
  color: var(--color-text-primary);
}

.account-menu-header span {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.account-menu-divider {
  height: 1px;
  background: var(--color-border-subtle);
  margin: 5px 0;
}

.account-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-primary);
  text-decoration: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.account-menu-item:hover {
  background: var(--color-bg-subtle);
  color: var(--color-primary-base);
}

.logout-menu-item {
  color: #dc2626;
}

.logout-menu-item:hover {
  background: #fee2e2;
  color: #b91c1c;
}

/* DROPDOWN ANIMATION */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.app-navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-subtle);
  height: 64px;
}

.navbar-container {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* Mobile Hamburger Button */
.hamburger-btn {
  display: none;
  background: transparent;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: 8px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  transition: all 0.15s ease;
}

.hamburger-btn:hover {
  background-color: var(--color-bg-subtle);
  border-color: var(--color-primary-base);
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 14px;
}

.bar {
  display: block;
  width: 100%;
  height: 2px;
  background-color: var(--color-text-primary);
  border-radius: 1px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: var(--color-text-primary);
}

.brand-logo {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-primary-base);
  line-height: 1.1;
}

.brand-sub {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.nav-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: var(--color-primary-base);
  background-color: var(--color-bg-subtle);
}

.nav-link.active {
  color: var(--color-primary-base);
  background-color: var(--color-primary-subtle);
}

.staff-link {
  font-size: 13px;
  background-color: var(--color-bg-subtle);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.cart-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-base);
  color: var(--color-text-inverse);
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: var(--shadow-subtle);
  transition: background-color 0.15s ease;
  min-height: 40px;
}

.cart-btn:hover {
  background-color: var(--color-primary-hover);
}

.cart-icon {
  font-size: 16px;
}

.cart-badge {
  background-color: var(--color-bg-surface);
  color: var(--color-primary-base);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  line-height: 1;
}

/* Mobile Side-out Drawer */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(28, 25, 23, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
}

.drawer-panel {
  width: 300px;
  max-width: 85vw;
  height: 100%;
  background-color: var(--color-bg-canvas);
  border-right: 1px solid var(--color-border-strong);
  box-shadow: var(--shadow-elevated);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drawer-close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-close-btn:hover {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.drawer-content {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  overflow-y: auto;
}

.drawer-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
  padding: 0 var(--space-2);
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.drawer-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  transition: all 0.15s ease;
  min-height: 48px;
}

.drawer-nav-item:hover {
  background-color: var(--color-bg-subtle);
  color: var(--color-primary-base);
}

.drawer-nav-item.active {
  background-color: var(--color-primary-subtle);
  color: var(--color-primary-base);
  font-weight: 700;
}

.staff-item {
  background-color: rgba(0, 0, 0, 0.02);
}

.nav-icon {
  font-size: 18px;
}

.drawer-divider {
  height: 1px;
  background-color: var(--color-border-subtle);
  margin: var(--space-4) 0;
}

.drawer-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  text-align: center;
  background-color: var(--color-bg-surface);
}

.footer-canteen-note {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
}

/* Transitions */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-active .drawer-panel,
.drawer-fade-leave-active .drawer-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-fade-enter-from .drawer-panel,
.drawer-fade-leave-to .drawer-panel {
  transform: translateX(-100%);
}

/* Auth in Navbar */
.auth-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
  padding: 4px 10px 4px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.user-role-badge {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  letter-spacing: 0.5px;
}

.user-role-badge.admin {
  background-color: #fee2e2;
  color: #991b1b;
}

.user-role-badge.staff {
  background-color: #e0f2fe;
  color: #0369a1;
}

.user-role-badge.customer {
  background-color: #dcfce7;
  color: #15803d;
}

.user-name-text {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  background: transparent;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 36px;
}

.logout-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 1.5px solid var(--color-primary-base);
  color: var(--color-primary-base);
  text-decoration: none;
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  min-height: 38px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.login-btn:hover {
  background-color: var(--color-primary-subtle);
  color: var(--color-primary-hover);
}

.drawer-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin-bottom: var(--space-3);
}

.drawer-avatar {
  font-size: 20px;
}

.drawer-user-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-user-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-user-email {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-logout-btn {
  background: transparent;
  border: 1px solid var(--color-border-default);
  color: #b91c1c;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.drawer-signin-banner {
  margin-bottom: var(--space-3);
}

.drawer-signin-btn {
  display: block;
  width: 100%;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  background-color: var(--color-primary-base);
  color: white;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  padding: 10px;
  border-radius: var(--radius-md);
}

/* Responsive Media Queries */
@media (max-width: 640px) {

    .account-dropdown {
    display: none;
}
  .hamburger-btn {
    display: flex;
  }
  .desktop-nav {
    display: none;
  }
  .cart-label {
    display: none;
  }
  .auth-box {
    display: none;
  }
  .login-btn {
    display: none;
  }
}
</style>
