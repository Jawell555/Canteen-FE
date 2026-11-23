
<script setup>
import { ref } from 'vue'

const username = ref('Your Username')
const profilePhoto = ref(null)
const photoInput = ref(null)
const isEditingProfile = ref(false)
const profileMessage = ref('')

const orderNotifications = ref(true)
const promotionsNotifications = ref(false)
const darkMode = ref(false)

const showPasswordModal = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMessage = ref('')
const passwordSuccess = ref(false)

function selectPhoto() {
  photoInput.value?.click()
}

function handlePhotoUpload(event) {
  const file = event.target.files[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    profileMessage.value = 'Please select a valid image.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    profileMessage.value = 'Image must not exceed 5MB.'
    return
  }

  profilePhoto.value = URL.createObjectURL(file)
  profileMessage.value = ''
}

function saveProfile() {
  if (!username.value.trim()) {
    profileMessage.value = 'Username cannot be empty.'
    return
  }

  profileMessage.value = 'Profile changes are ready. Backend connection is still needed.'
  isEditingProfile.value = false
}

function cancelProfileEdit() {
  isEditingProfile.value = false
  profileMessage.value = ''
}

function closePasswordModal() {
  showPasswordModal.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordMessage.value = ''
  passwordSuccess.value = false
}

function changePassword() {
  passwordMessage.value = ''
  passwordSuccess.value = false

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordMessage.value = 'Please complete all fields.'
    return
  }

  if (newPassword.value.length < 8) {
    passwordMessage.value = 'New password must be at least 8 characters.'
    return
  }

  if (newPassword.value === currentPassword.value) {
    passwordMessage.value = 'Your new password must be different.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordMessage.value = 'New passwords do not match.'
    return
  }

  passwordMessage.value = 'Form validation successful. Backend connection is still needed.'
  passwordSuccess.value = true
}
</script>

<template>
  <main class="settings-page">
    <div class="settings-container">

      <header class="page-heading">
        <h1>Settings</h1>
        <p>Manage your account, security, and preferences.</p>
      </header>

      <!-- PROFILE SETTINGS -->
      <section class="settings-card">
        <div class="section-heading">
          <div class="section-icon">👤</div>
          <div>
            <h2>Profile Information</h2>
            <p>Manage your personal information and profile photo.</p>
          </div>
        </div>

        <div class="profile-content">
          <div class="photo-section">
            <div class="profile-avatar">
              <img v-if="profilePhoto" :src="profilePhoto" alt="Profile photo" />
              <span v-else>{{ username.charAt(0).toUpperCase() }}</span>
            </div>

            <div class="photo-details">
              <strong>Profile Photo</strong>
              <p>JPG, PNG, or GIF. Maximum size: 5MB.</p>

              <button class="secondary-button" @click="selectPhoto">
                Upload Photo
              </button>

              <input
                ref="photoInput"
                type="file"
                accept="image/*"
                hidden
                @change="handlePhotoUpload"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="username">Username / Display Name</label>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="Enter your username"
              :disabled="!isEditingProfile"
            />
          </div>

          <p v-if="profileMessage" class="info-message">
            {{ profileMessage }}
          </p>

          <div class="profile-actions">
            <template v-if="!isEditingProfile">
              <button class="primary-button" @click="isEditingProfile = true">
                Edit Profile
              </button>
            </template>

            <template v-else>
              <button class="primary-button" @click="saveProfile">
                Save Changes
              </button>
              <button class="secondary-button" @click="cancelProfileEdit">
                Cancel
              </button>
            </template>
          </div>
        </div>
      </section>

      <!-- SECURITY SETTINGS -->
      <section class="settings-card">
        <div class="section-heading">
          <div class="section-icon">🔒</div>
          <div>
            <h2>Account Security</h2>
            <p>Protect your account by keeping your password updated.</p>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <h3>Password</h3>
            <p>Change your current account password.</p>
          </div>

          <button class="primary-button" @click="showPasswordModal = true">
            Change Password
          </button>
        </div>
      </section>

      <!-- NOTIFICATIONS -->
      <section class="settings-card">
        <div class="section-heading">
          <div class="section-icon">🔔</div>
          <div>
            <h2>Notifications</h2>
            <p>Choose which updates you want to receive.</p>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <h3>Order Updates</h3>
            <p>Receive updates about your orders.</p>
          </div>

          <label class="switch">
            <input type="checkbox" v-model="orderNotifications" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div>
            <h3>Promotions and Announcements</h3>
            <p>Receive canteen announcements and promotions.</p>
          </div>

          <label class="switch">
            <input type="checkbox" v-model="promotionsNotifications" />
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <!-- APP PREFERENCES -->
      <section class="settings-card">
        <div class="section-heading">
          <div class="section-icon">⚙️</div>
          <div>
            <h2>App Preferences</h2>
            <p>Customize your application experience.</p>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <h3>Dark Mode</h3>
            <p>Switch between light and dark appearance.</p>
          </div>

          <label class="switch">
            <input type="checkbox" v-model="darkMode" />
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <!-- HELP AND ABOUT -->
      <section class="settings-card">
        <div class="section-heading">
          <div class="section-icon">❓</div>
          <div>
            <h2>Help and Information</h2>
            <p>Find information about the application.</p>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <h3>Help and Support</h3>
            <p>Need assistance? Contact the canteen administrator.</p>
          </div>
          <span class="setting-arrow">›</span>
        </div>

        <div class="setting-row">
          <div>
            <h3>About Canteena</h3>
            <p>Learn more about the Canteena ordering system.</p>
          </div>
          <span class="setting-arrow">›</span>
        </div>
      </section>

    </div>

    <!-- CHANGE PASSWORD MODAL -->
    <div
      v-if="showPasswordModal"
      class="modal-overlay"
      @click.self="closePasswordModal"
      @keydown.esc="closePasswordModal"
    >
      <section class="password-modal">
        <button class="close-button" @click="closePasswordModal">
          &times;
        </button>

        <div class="modal-heading">
          <div class="section-icon">🔐</div>
          <h2>Change Password</h2>
          <p>Enter your current password and choose a new one.</p>
        </div>

        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label>Current Password</label>
            <div class="password-input">
              <input
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="Enter current password"
              />
              <button type="button" @click="showCurrentPassword = !showCurrentPassword">
                {{ showCurrentPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>New Password</label>
            <div class="password-input">
              <input
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Enter new password"
              />
              <button type="button" @click="showNewPassword = !showNewPassword">
                {{ showNewPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Confirm New Password</label>
            <div class="password-input">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
              />
              <button type="button" @click="showConfirmPassword = !showConfirmPassword">
                {{ showConfirmPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <p
            v-if="passwordMessage"
            :class="passwordSuccess ? 'success-message' : 'error-message'"
          >
            {{ passwordMessage }}
          </p>

          <button type="submit" class="primary-button full-button">
            Update Password
          </button>

          <button type="button" class="cancel-button" @click="closePasswordModal">
            Cancel
          </button>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  padding: 110px 30px 50px;
  background: #f7f8fa;
  color: #252525;
}

.settings-container {
  max-width: 950px;
  margin: auto;
}

.page-heading {
  margin-bottom: 28px;
}

.page-heading h1 {
  font-size: 30px;
  margin: 0 0 8px;
}

.page-heading p,
.section-heading p,
.setting-row p,
.photo-details p {
  color: #777;
  margin: 0;
  font-size: 14px;
}

.settings-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 26px;
  margin-bottom: 20px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 25px;
}

.section-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: #f1f2f5;
  border-radius: 10px;
  font-size: 20px;
}

.section-heading h2 {
  font-size: 18px;
  margin: 0 0 6px;
}

.profile-content {
  border-top: 1px solid #eee;
  padding-top: 22px;
}

.photo-section {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 25px;
}

.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #e9e9e9;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-size: 32px;
  font-weight: 700;
  color: #555;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-details strong {
  display: block;
  margin-bottom: 6px;
}

.photo-details p {
  margin-bottom: 10px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group > input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 7px;
  outline: none;
  font-size: 14px;
}

.form-group input:focus {
  border-color: #555;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #777;
}

.primary-button,
.secondary-button {
  border: none;
  padding: 11px 18px;
  border-radius: 7px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

.primary-button {
  background: #252525;
  color: white;
}

.primary-button:hover {
  background: #444;
}

.secondary-button {
  background: #f0f0f0;
  color: #333;
}

.secondary-button:hover {
  background: #e4e4e4;
}

.profile-actions {
  display: flex;
  gap: 10px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 18px 0;
  border-top: 1px solid #eee;
}

.setting-row h3 {
  margin: 0 0 6px;
  font-size: 15px;
}

.setting-arrow {
  font-size: 26px;
  color: #999;
}

.info-message {
  font-size: 13px;
  color: #555;
  margin-bottom: 15px;
}

/* TOGGLE SWITCH */
.switch {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 25px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  border-radius: 30px;
  transition: 0.3s;
}

.slider::before {
  position: absolute;
  content: "";
  height: 19px;
  width: 19px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.switch input:checked + .slider {
  background: #333;
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

/* PASSWORD MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.password-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 14px;
  padding: 30px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
}

.close-button {
  position: absolute;
  top: 12px;
  right: 18px;
  border: none;
  background: none;
  font-size: 28px;
  color: #777;
  cursor: pointer;
}

.modal-heading {
  text-align: center;
  margin-bottom: 25px;
}

.modal-heading .section-icon {
  margin: 0 auto 12px;
}

.modal-heading h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.modal-heading p {
  color: #777;
  font-size: 13px;
}

.password-input {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 7px;
  overflow: hidden;
}

.password-input:focus-within {
  border-color: #555;
}

.password-input input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: none;
  outline: none;
  font-size: 14px;
}

.password-input button {
  border: none;
  background: white;
  color: #555;
  padding: 0 12px;
  cursor: pointer;
}

.full-button,
.cancel-button {
  width: 100%;
  margin-top: 8px;
}

.cancel-button {
  padding: 11px;
  border: 1px solid #ddd;
  border-radius: 7px;
  background: white;
  cursor: pointer;
}

.error-message,
.success-message {
  font-size: 13px;
  margin: 10px 0;
}

.error-message {
  color: #c0392b;
}

.success-message {
  color: #218838;
}

@media (max-width: 600px) {
  .settings-page {
    padding: 90px 16px 35px;
  }

  .settings-card {
    padding: 20px;
  }

  .setting-row {
    align-items: flex-start;
  }

  .password-modal {
    padding: 25px 20px;
  }
}
</style>
