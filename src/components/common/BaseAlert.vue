<script setup>
defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'warning', 'success', 'danger'].includes(v),
  },
  title: {
    type: String,
    default: '',
  },
  dismissible: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['dismiss'])
</script>

<template>
  <div class="base-alert" :class="`alert-${variant}`" role="alert">
    <div class="alert-content">
      <h4 v-if="title" class="alert-title">{{ title }}</h4>
      <div class="alert-body">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="alert-close"
      aria-label="Dismiss alert"
      @click="$emit('dismiss')"
    >
      &times;
    </button>
  </div>
</template>

<style scoped>
.base-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: 14px;
  line-height: 1.4;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.alert-close {
  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  opacity: 0.65;
  padding: 0 4px;
}

.alert-close:hover {
  opacity: 1;
}

.alert-info {
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
}

.alert-warning {
  background-color: var(--status-pending-bg);
  border: 1px solid rgba(217, 119, 6, 0.35);
  color: var(--status-pending-text);
}

.alert-success {
  background-color: var(--status-ready-bg);
  border: 1px solid rgba(21, 128, 61, 0.35);
  color: var(--status-ready-text);
}

.alert-danger {
  background-color: var(--status-danger-bg);
  border: 1px solid rgba(220, 38, 38, 0.35);
  color: var(--status-danger-text);
}
</style>

