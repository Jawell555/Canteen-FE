<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'outline', 'danger', 'ghost'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="base-btn"
    :class="[
      `btn-${variant}`,
      `btn-${size}`,
      { 'btn-block': block, 'btn-loading': loading }
    ]"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner" aria-hidden="true"></span>
    <span :class="{ 'opacity-0': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: inherit;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  text-decoration: none;
  white-space: nowrap;
}

.base-btn:focus-visible {
  outline: 2px solid var(--color-primary-base);
  outline-offset: 2px;
}

.base-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

/* Sizes (Guaranteed touch targets >= 44px on md/lg) */
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 36px;
}

.btn-md {
  padding: 10px 18px;
  font-size: 15px;
  min-height: 44px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
  min-height: 48px;
}

.btn-block {
  display: flex;
  width: 100%;
}

/* Variants */
.btn-primary {
  background-color: var(--color-primary-base);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-subtle);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.btn-primary:active:not(:disabled) {
  background-color: var(--color-primary-active);
}

.btn-secondary {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
  border-color: var(--color-border-subtle);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-border-default);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-primary-base);
  border-color: var(--color-primary-base);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--color-primary-subtle);
}

.btn-danger {
  background-color: var(--status-danger-accent);
  color: var(--color-text-inverse);
}

.btn-danger:hover:not(:disabled) {
  background-color: #B91C1C;
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

/* Spinner */
.spinner {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.opacity-0 {
  opacity: 0;
}
</style>

