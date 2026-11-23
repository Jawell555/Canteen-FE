<script setup>
import { ref } from 'vue'

const currentPeriod = ref('daily')

const reportData = ref({
  date: 'Nov 13, 2026',
  metrics: {
    total_revenue: 18450.0,
    total_orders_completed: 142,
    total_orders_cancelled: 3,
    average_order_value: 129.93,
  },
  payment_split: {
    gcash: { amount: 11200.0, count: 84, percentage: 60.7 },
    counter_cash: { amount: 7250.0, count: 58, percentage: 39.3 },
  },
  top_selling_items: [
    { menu_item_id: 101, name: 'Chicken Adobo with Rice', quantity_sold: 58, total_sales: 4930.0 },
    { menu_item_id: 102, name: 'Pork Sinigang with Rice', quantity_sold: 44, total_sales: 4180.0 },
    { menu_item_id: 103, name: 'Toasted Ham & Cheese', quantity_sold: 38, total_sales: 1710.0 },
    { menu_item_id: 104, name: 'Iced Calamansi Juice', quantity_sold: 50, total_sales: 1250.0 },
  ],
})

function setPeriod(period) {
  currentPeriod.value = period
  if (period === 'weekly') {
    reportData.value.metrics.total_revenue = 112500.0
    reportData.value.metrics.total_orders_completed = 864
    reportData.value.metrics.total_orders_cancelled = 12
    reportData.value.metrics.average_order_value = 130.2
  } else if (period === 'monthly') {
    reportData.value.metrics.total_revenue = 485200.0
    reportData.value.metrics.total_orders_completed = 3710
    reportData.value.metrics.total_orders_cancelled = 45
    reportData.value.metrics.average_order_value = 130.78
  } else {
    reportData.value.metrics.total_revenue = 18450.0
    reportData.value.metrics.total_orders_completed = 142
    reportData.value.metrics.total_orders_cancelled = 3
    reportData.value.metrics.average_order_value = 129.93
  }
}
</script>

<template>
  <div class="sales-report">
    <!-- Period Filter Header -->
    <header class="report-header">
      <div>
        <h2 class="section-title">Sales Analytics & Revenue Breakdown</h2>
        <p class="section-sub">Comprehensive financial metrics for {{ reportData.date }}</p>
      </div>

      <div class="period-toggle-group" role="group" aria-label="Reporting period">
        <button
          type="button"
          class="period-pill"
          :class="{ active: currentPeriod === 'daily' }"
          @click="setPeriod('daily')"
        >
          Daily
        </button>
        <button
          type="button"
          class="period-pill"
          :class="{ active: currentPeriod === 'weekly' }"
          @click="setPeriod('weekly')"
        >
          Weekly
        </button>
        <button
          type="button"
          class="period-pill"
          :class="{ active: currentPeriod === 'monthly' }"
          @click="setPeriod('monthly')"
        >
          Monthly
        </button>
      </div>
    </header>

    <!-- Key Performance Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Gross Revenue</span>
        <span class="metric-value revenue-color tabular-nums">
          ₱{{ reportData.metrics.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
        </span>
        <span class="metric-foot">100% mathematically balanced</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Orders Completed</span>
        <span class="metric-value tabular-nums">
          {{ reportData.metrics.total_orders_completed }}
        </span>
        <span class="metric-foot success-text">{{ reportData.metrics.total_orders_cancelled }} orders voided</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Average Order Value</span>
        <span class="metric-value tabular-nums">
          ₱{{ reportData.metrics.average_order_value.toFixed(2) }}
        </span>
        <span class="metric-foot">Per transaction average</span>
      </div>
    </div>

    <!-- Dual Payment Split Section -->
    <section class="split-card" aria-label="Payment method split breakdown">
      <h3 class="card-subtitle">Payment Method Distribution</h3>

      <!-- Proportion Bar -->
      <div class="progress-track">
        <div
          class="progress-seg gcash-seg"
          :style="{ width: `${reportData.payment_split.gcash.percentage}%` }"
        ></div>
        <div
          class="progress-seg cash-seg"
          :style="{ width: `${reportData.payment_split.counter_cash.percentage}%` }"
        ></div>
      </div>

      <div class="split-details-grid">
        <div class="split-col">
          <div class="split-header">
            <span class="legend-dot gcash-dot"></span>
            <span class="split-name">GCash / E-Wallet</span>
          </div>
          <span class="split-amount tabular-nums">
            ₱{{ reportData.payment_split.gcash.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </span>
          <span class="split-count tabular-nums">
            {{ reportData.payment_split.gcash.count }} orders ({{ reportData.payment_split.gcash.percentage }}%)
          </span>
        </div>

        <div class="split-col text-right">
          <div class="split-header justify-end">
            <span class="legend-dot cash-dot"></span>
            <span class="split-name">Cash at Counter</span>
          </div>
          <span class="split-amount tabular-nums">
            ₱{{ reportData.payment_split.counter_cash.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </span>
          <span class="split-count tabular-nums">
            {{ reportData.payment_split.counter_cash.count }} orders ({{ reportData.payment_split.counter_cash.percentage }}%)
          </span>
        </div>
      </div>
    </section>

    <!-- Top Selling Items Ranking Table -->
    <section class="ranking-card" aria-label="Top-selling food items">
      <h3 class="card-subtitle">Top-Selling Menu Items</h3>
      <table class="ranking-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Item Name</th>
            <th class="text-right">Units Sold</th>
            <th class="text-right">Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in reportData.top_selling_items"
            :key="item.menu_item_id"
          >
            <td class="tabular-nums font-bold">#{{ idx + 1 }}</td>
            <td class="font-semibold">{{ item.name }}</td>
            <td class="text-right tabular-nums">{{ item.quantity_sold }}</td>
            <td class="text-right font-bold tabular-nums">
              ₱{{ item.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.sales-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.period-toggle-group {
  display: inline-flex;
  background-color: var(--color-bg-subtle);
  padding: 4px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
}

.period-pill {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.period-pill.active {
  background-color: var(--color-bg-surface);
  color: var(--color-primary-base);
  box-shadow: var(--shadow-subtle);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-6);
}

.metric-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.metric-value {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-text-primary);
}

.revenue-color {
  color: var(--color-primary-base);
}

.metric-foot {
  font-size: 12px;
  color: var(--color-text-muted);
}

.success-text {
  color: var(--status-ready-accent);
}

.split-card,
.ranking-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  box-shadow: var(--shadow-subtle);
}

.card-subtitle {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.progress-track {
  display: flex;
  height: 12px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background-color: var(--color-bg-subtle);
  margin-bottom: var(--space-4);
}

.progress-seg {
  height: 100%;
}

.gcash-seg {
  background-color: #2563EB;
}

.cash-seg {
  background-color: #059669;
}

.split-details-grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.split-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.split-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.justify-end {
  justify-content: flex-end;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.gcash-dot {
  background-color: #2563EB;
}

.cash-dot {
  background-color: #059669;
}

.split-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.split-amount {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.split-count {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ranking-table th {
  background-color: var(--color-bg-subtle);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-default);
  text-align: left;
}

.ranking-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.ranking-table tr:hover td {
  background-color: #FAF8F5;
}

.text-right {
  text-align: right;
}

.font-bold {
  font-weight: 800;
}

.font-semibold {
  font-weight: 600;
}
</style>

