<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseBadge from '../common/BaseBadge.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  item: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'add-to-cart'])

const quantity = ref(1)
const customNotes = ref('')

const quickChips = [
  'Penge sabaw',
  'Separate sauce',
  'Less rice',
  'Extra spicy',
  'No utensils needed',
]

// Reset when modal opens for a new item
watch(
  () => props.item,
  () => {
    quantity.value = 1
    customNotes.value = ''
  },
)

const maxQuantity = computed(() => {
  if (!props.item) return 10
  return Math.min(props.item.stock || 10, 10)
})

const lineTotal = computed(() => {
  if (!props.item) return 0
  return props.item.price * quantity.value
})

function increment() {
  if (quantity.value < maxQuantity.value) {
    quantity.value += 1
  }
}

function decrement() {
  if (quantity.value > 1) {
    quantity.value -= 1
  }
}

function handleAddChip(chip) {
  const current = customNotes.value.trim()
  if (!current) {
    customNotes.value = chip
  } else if (!current.includes(chip)) {
    customNotes.value = `${current}, ${chip}`
  }
}

function handleSubmit() {
  if (!props.item || props.item.isSoldOut) return
  emit('add-to-cart', {
    item: props.item,
    quantity: quantity.value,
    customNotes: customNotes.value.trim(),
  })
  emit('close')
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="Customize Your Order"
    max-width="500px"
    @close="emit('close')"
  >
    <div v-if="item" class="customizer-content">
      <!-- Item Overview Header -->
      <div class="item-summary-bar">
        <span class="item-emoji" aria-hidden="true">{{ item.emoji || '🍽️' }}</span>
        <div class="item-info">
          <h4 class="item-name">{{ item.name }}</h4>
          <span class="item-base-price tabular-nums">₱{{ item.price.toFixed(2) }}</span>
        </div>
        <BaseBadge
          v-if="item.isSoldOut"
          variant="danger"
        >
          Sold Out
        </BaseBadge>
        <BaseBadge
          v-else
          variant="ready"
        >
          {{ item.stock }} left
        </BaseBadge>
      </div>

      <p v-if="item.desc" class="item-desc">{{ item.desc }}</p>

      <div class="divider"></div>

      <!-- Quantity Selector -->
      <div class="section-row">
        <span class="section-title">Quantity</span>
        <div class="stepper-controls" role="group" aria-label="Quantity controls">
          <button
            type="button"
            class="stepper-btn touch-target-mobile"
            :disabled="quantity <= 1"
            aria-label="Decrease quantity"
            @click="decrement"
          >
            −
          </button>
          <span class="stepper-value tabular-nums">{{ quantity }}</span>
          <button
            type="button"
            class="stepper-btn touch-target-mobile"
            :disabled="quantity >= maxQuantity"
            aria-label="Increase quantity"
            @click="increment"
          >
            +
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Special Instructions / Notes -->
      <div class="form-section">
        <label for="customNotesInput" class="section-title">Special Instructions (Optional)</label>
        <p class="section-hint">Canteen kitchen notes for sauce, rice portion, or condiments.</p>

        <!-- Quick Chips -->
        <div class="chips-container" aria-label="Quick note suggestions">
          <button
            v-for="chip in quickChips"
            :key="chip"
            type="button"
            class="quick-chip"
            @click="handleAddChip(chip)"
          >
            + {{ chip }}
          </button>
        </div>

        <textarea
          id="customNotesInput"
          v-model="customNotes"
          class="notes-textarea"
          rows="3"
          placeholder="e.g., Penge extra sabaw sa hiwalay na lalagyan..."
          maxlength="200"
        ></textarea>
        <div class="char-count tabular-nums">{{ customNotes.length }} / 200</div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" size="md" @click="emit('close')">
        Cancel
      </BaseButton>
      <BaseButton
        variant="primary"
        size="md"
        :disabled="!item || item.isSoldOut"
        @click="handleSubmit"
      >
        Add to Cart • <span class="tabular-nums">₱{{ lineTotal.toFixed(2) }}</span>
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.customizer-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.item-summary-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.item-emoji {
  font-size: 38px;
  background-color: var(--color-bg-subtle);
  padding: 8px;
  border-radius: var(--radius-md);
  line-height: 1;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-base-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary-base);
}

.item-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.divider {
  height: 1px;
  background-color: var(--color-border-subtle);
}

.section-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.section-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
  margin-bottom: var(--space-2);
}

.stepper-controls {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-subtle);
  overflow: hidden;
}

.stepper-btn {
  background: transparent;
  border: none;
  width: 44px;
  height: 44px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.stepper-btn:hover:not(:disabled) {
  background-color: var(--color-border-subtle);
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-value {
  min-width: 36px;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  color: var(--color-text-primary);
}

.form-section {
  display: flex;
  flex-direction: column;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.quick-chip {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  background-color: var(--color-primary-subtle);
  border-color: var(--color-primary-base);
  color: var(--color-primary-base);
}

.notes-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  font-family: inherit;
  font-size: 14px;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.15s ease;
}

.notes-textarea:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}

.char-count {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: right;
  margin-top: 4px;
}
</style>
