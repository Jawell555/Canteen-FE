<script setup>
import { ref } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseAlert from '../common/BaseAlert.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  orderUuid: {
    type: String,
    default: '',
  },
  queueNumber: {
    type: String,
    default: '#042',
  },
})

const emit = defineEmits(['close', 'submitted'])

const rating = ref(5)
const comments = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)

const starOptions = [1, 2, 3, 4, 5]

function setRating(val) {
  rating.value = val
}

function handleSubmit() {
  isSubmitting.value = true

  setTimeout(() => {
    isSubmitting.value = false
    isSuccess.value = true

    emit('submitted', {
      orderUuid: props.orderUuid,
      rating: rating.value,
      comments: comments.value.trim(),
    })

    setTimeout(() => {
      isSuccess.value = false
      comments.value = ''
      emit('close')
    }, 1200)
  }, 500)
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="`Rate Your Experience — ${queueNumber}`"
    max-width="480px"
    @close="emit('close')"
  >
    <div v-if="isSuccess" class="success-box">
      <span class="success-icon" aria-hidden="true">🎉</span>
      <h3 class="success-title">Thank you for your feedback!</h3>
      <p class="success-sub">Your review helps our canteen kitchen improve everyday meals.</p>
    </div>

    <form v-else class="feedback-form" @submit.prevent="handleSubmit">
      <BaseAlert variant="info">
        How was your food and pickup service for order <strong>{{ queueNumber }}</strong>?
      </BaseAlert>

      <!-- Star Rating Picker (Touch Friendly) -->
      <div class="rating-section">
        <span class="rating-label">Rating *</span>
        <div class="star-group" role="radiogroup" aria-label="Order Star Rating">
          <button
            v-for="star in starOptions"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="rating >= star"
            class="star-btn touch-target-mobile"
            :class="{ active: rating >= star }"
            @click="setRating(star)"
          >
            ★
          </button>
        </div>
        <span class="rating-text">
          <strong v-if="rating === 5">Excellent (5/5)</strong>
          <strong v-else-if="rating === 4">Good (4/5)</strong>
          <strong v-else-if="rating === 3">Average (3/5)</strong>
          <strong v-else-if="rating === 2">Below Average (2/5)</strong>
          <strong v-else>Poor (1/5)</strong>
        </span>
      </div>

      <!-- Comments Textarea -->
      <div class="form-group">
        <label for="feedbackComments" class="form-label">Comments & Suggestions (Optional)</label>
        <textarea
          id="feedbackComments"
          v-model="comments"
          class="form-textarea"
          rows="3"
          maxlength="1000"
          placeholder="e.g., The adobo was delicious and the extra soup was hot! Handover was very fast."
        ></textarea>
        <span class="char-count tabular-nums">{{ comments.length }} / 1000</span>
      </div>
    </form>

    <template #footer>
      <BaseButton
        v-if="!isSuccess"
        variant="ghost"
        size="md"
        @click="emit('close')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        v-if="!isSuccess"
        variant="primary"
        size="md"
        :loading="isSubmitting"
        @click="handleSubmit"
      >
        Submit Feedback
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.feedback-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.rating-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) 0;
}

.rating-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.star-group {
  display: flex;
  gap: 8px;
}

.star-btn {
  background: transparent;
  border: none;
  font-size: 36px;
  line-height: 1;
  color: #D6CFC4;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-btn.active {
  color: #F59E0B;
  transform: scale(1.1);
}

.rating-text {
  font-size: 14px;
  color: var(--color-text-primary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.form-textarea {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  resize: vertical;
}

.form-textarea:focus {
  border-color: var(--color-primary-base);
  background-color: var(--color-bg-surface);
}

.char-count {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: right;
}

.success-box {
  text-align: center;
  padding: var(--space-6) var(--space-4);
}

.success-icon {
  font-size: 48px;
  display: block;
  margin-bottom: var(--space-2);
}

.success-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.success-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
</style>

