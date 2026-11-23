<script setup>
import BaseBadge from '../common/BaseBadge.vue'

defineProps({
  categories: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  activeCategory: {
    type: String,
    default: 'all',
  },
})

defineEmits(['select-category', 'customize-item', 'quick-add'])
</script>

<template>
  <div class="menu-catalog">
    <!-- Category Tabs -->
    <div class="category-tabs" role="tablist" aria-label="Menu categories">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        role="tab"
        :aria-selected="activeCategory === cat.id"
        class="tab-pill"
        :class="{ active: activeCategory === cat.id }"
        @click="$emit('select-category', cat.id)"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Items Grid -->
    <div class="items-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="item-card"
        :class="{ 'sold-out': item.isSoldOut }"
        @click="!item.isSoldOut && $emit('customize-item', item)"
      >
        <div class="item-img-placeholder">
          <span class="food-emoji" aria-hidden="true">{{ item.emoji || '🍽️' }}</span>
          <BaseBadge
            v-if="item.isSoldOut"
            variant="danger"
            class="stock-badge"
          >
            Sold Out
          </BaseBadge>
          <BaseBadge
            v-else
            variant="ready"
            class="stock-badge"
          >
            In Stock ({{ item.stock }})
          </BaseBadge>
        </div>

        <div class="item-details">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-desc">{{ item.desc }}</p>
          <div class="item-footer">
            <span class="item-price tabular-nums">₱{{ item.price.toFixed(2) }}</span>
            <button
              type="button"
              class="add-btn touch-target-mobile"
              :disabled="item.isSoldOut"
              @click.stop="$emit('customize-item', item)"
            >
              {{ item.isSoldOut ? 'Unavailable' : '+ Add' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.menu-catalog {
  display: flex;
  flex-direction: column;
}

.category-tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-6);
}

.tab-pill {
  padding: 8px 18px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  min-height: 40px;
}

.tab-pill.active {
  background-color: var(--color-primary-base);
  color: var(--color-text-inverse);
  border-color: var(--color-primary-base);
  box-shadow: var(--shadow-subtle);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

.item-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.item-card:hover:not(.sold-out) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.item-card.sold-out {
  opacity: 0.7;
  cursor: not-allowed;
}

.item-img-placeholder {
  height: 180px;
  background-color: var(--color-bg-subtle);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.food-emoji {
  font-size: 64px;
}

.stock-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.item-details {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.item-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: var(--space-4);
  flex: 1;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.item-price {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-primary-base);
}

.add-btn {
  background-color: var(--color-primary-base);
  color: var(--color-text-inverse);
  border: none;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  min-height: 44px;
  transition: background-color 0.15s ease;
}

.add-btn:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.add-btn:disabled {
  background-color: var(--color-border-strong);
  cursor: not-allowed;
}
</style>
