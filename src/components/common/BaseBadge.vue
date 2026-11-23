<script setup>
defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (v) => ['pending', 'preparing', 'ready', 'completed', 'danger', 'neutral'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
})
</script>

<template>
  <span
    class="base-badge tabular-nums"
    :class="[`badge-${variant}`, `badge-${size}`]"
  >
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.badge-sm {
  font-size: 11px;
  padding: 2px 6px;
}

.badge-md {
  font-size: 12px;
  padding: 4px 10px;
}

/* Status variants */
.badge-pending {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text);
  border: 1px solid rgba(217, 119, 6, 0.25);
}

.badge-preparing {
  background-color: var(--status-preparing-bg);
  color: var(--status-preparing-text);
  border: 1px solid rgba(234, 88, 12, 0.25);
}

.badge-ready {
  background-color: var(--status-ready-bg);
  color: var(--status-ready-text);
  border: 1px solid rgba(21, 128, 61, 0.25);
}

.badge-completed {
  background-color: var(--status-completed-bg);
  color: var(--status-completed-text);
  border: 1px solid rgba(75, 85, 99, 0.2);
}

.badge-danger {
  background-color: var(--status-danger-bg);
  color: var(--status-danger-text);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.badge-neutral {
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
}
</style>

