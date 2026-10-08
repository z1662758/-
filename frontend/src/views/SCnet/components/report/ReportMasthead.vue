<template>
  <header class="rp-mast">
    <!-- 极淡的供应链节点线稿:只作纸面层次,不参与信息表达 -->
    <svg class="rp-mast__ghost" viewBox="0 0 220 84" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1">
        <path d="M4 66 L62 26 L126 48 L196 14" />
        <path d="M62 26 L86 74 M126 48 L148 76" />
      </g>
      <g fill="currentColor">
        <circle cx="62" cy="26" r="2.6" />
        <circle cx="126" cy="48" r="2.6" />
        <circle cx="86" cy="74" r="1.8" />
        <circle cx="148" cy="76" r="1.8" />
      </g>
    </svg>

    <!-- 刊头:图形标识 + 艺术化短标题 -->
    <div class="rp-mast__row">
      <div class="rp-mast__brand">
        <svg class="rp-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <!-- 原子环线 -->
          <g class="rp-mark__ring" transform="rotate(-30 16 16)">
            <ellipse cx="16" cy="16" rx="13" ry="5.5" />
            <circle class="rp-mark__node" cx="29" cy="16" r="1.7" />
          </g>
          <g class="rp-mark__ring" transform="rotate(30 16 16)">
            <ellipse cx="16" cy="16" rx="13" ry="5.5" />
            <circle class="rp-mark__node" cx="3" cy="16" r="1.7" />
          </g>
          <circle class="rp-mark__core" cx="16" cy="16" r="2.1" />
        </svg>

        <span class="rp-mast__brand-text">
          <span class="rp-mast__wordmark">供应链</span>
          <span class="rp-mast__latin">SUPPLY CHAIN RESEARCH</span>
        </span>
      </div>

      <span v-if="badgeLabel" class="rp-mast__badge">{{ badgeLabel }}</span>
    </div>

    <!-- 标题区 -->
    <div class="rp-mast__head">
      <h1 class="rp-mast__title">{{ title }}</h1>
      <p v-if="topicLine" class="rp-mast__topic">{{ topicLine }}</p>

      <span class="rp-mast__bar" aria-hidden="true">
        <i class="rp-mast__bar-main"></i>
        <i class="rp-mast__bar-accent"></i>
      </span>

      <p v-if="metaItems.length" class="rp-mast__meta">
        <template v-for="(item, index) in metaItems" :key="item.label">
          <span v-if="index" class="rp-mast__sep">·</span>
          <span class="rp-mast__meta-item">
            <span class="rp-mast__meta-label">{{ item.label }}</span>{{ item.value }}
          </span>
        </template>
      </p>

      <p v-if="note" class="rp-mast__note">{{ note }}</p>
    </div>
  </header>
</template>

<script setup>
defineProps({
  /** 正式报告标题:整个页面只出现一次 */
  title: { type: String, default: '' },
  /** 主题标识,如「铀资源采购 / 跨境运输 / 供应保障」 */
  topicLine: { type: String, default: '' },
  /** 标题下方元信息:[{ label, value }],只传后端确实给出的字段 */
  metaItems: { type: Array, default: () => [] },
  /** 刊头右侧标识:案例报告 / 当前任务报告 */
  badgeLabel: { type: String, default: '' },
  /** 状态提示(如部分阶段数据缺失) */
  note: { type: String, default: '' },
})
</script>

<style scoped>
.rp-mast { position: relative; margin-bottom: 30px; }

/* ===== 纸面线稿:极淡,压在刊头下方 ===== */
.rp-mast__ghost {
  position: absolute;
  top: -10px;
  right: -18px;
  width: 220px;
  height: 84px;
  color: var(--rp-navy, #1b3a5f);
  opacity: .05;
  pointer-events: none;
}

/* ===== 刊头行 ===== */
.rp-mast__row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8edf3;
}
.rp-mast__brand { display: flex; align-items: center; gap: 12px; }
.rp-mark { width: 32px; height: 32px; flex-shrink: 0; color: var(--rp-navy, #1b3a5f); }
.rp-mark__ring { fill: none; stroke: currentColor; stroke-width: 1.3; opacity: .9; }
.rp-mark__core { fill: currentColor; }
/* 节点用铜金点缀:整页强调色只出现在这里和标题短线 */
.rp-mark__node { fill: var(--rp-accent, #b07d3a); stroke: none; }

.rp-mast__brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--rp-accent, #b07d3a);
}
.rp-mast__wordmark {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: .3em;
  color: var(--rp-navy, #1b3a5f);
  line-height: 1.1;
}
.rp-mast__latin {
  font-size: 8.5px;
  letter-spacing: .2em;
  color: var(--rp-faint, #94a3b8);
  line-height: 1.2;
}

.rp-mast__badge {
  flex-shrink: 0;
  margin-top: 4px;
  padding: 2px 10px;
  font-size: var(--rp-chip, 12px);
  letter-spacing: .08em;
  color: var(--rp-navy, #1b3a5f);
  background: #f4f7fb;
  border: 1px solid #dfe7f0;
  border-radius: 2px;
}

/* ===== 标题区 ===== */
.rp-mast__head { position: relative; z-index: 1; padding-top: 26px; text-align: center; }
.rp-mast__title {
  margin: 0 auto;
  max-width: 21em;
  font-size: var(--rp-title, 26px);
  font-weight: 700;
  line-height: 1.42;
  letter-spacing: .005em;
  color: var(--rp-ink, #0f172a);
}
.rp-mast__topic {
  margin: 12px 0 0;
  font-size: var(--rp-small, 12.5px);
  letter-spacing: .12em;
  color: var(--rp-navy-soft, #2f5b86);
}

/* 短横线:深蓝主段 + 铜金收尾,替代贯穿全页的细线 */
.rp-mast__bar {
  display: inline-flex;
  align-items: center;
  margin-top: 16px;
  height: 3px;
}
.rp-mast__bar-main { width: 58px; height: 3px; background: var(--rp-navy, #1b3a5f); }
.rp-mast__bar-accent { width: 14px; height: 3px; background: var(--rp-accent, #b07d3a); }

.rp-mast__meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 9px;
  margin: 16px 0 0;
  font-size: var(--rp-small, 12.5px);
  color: var(--rp-muted, #64748b);
}
.rp-mast__sep { color: var(--rp-faint, #94a3b8); }
.rp-mast__meta-label { color: var(--rp-faint, #94a3b8); margin-right: 4px; }
.rp-mast__meta-item { font-variant-numeric: tabular-nums; }

.rp-mast__note { margin: 10px 0 0; font-size: var(--rp-small, 12.5px); color: #b45309; }

/* 窄屏:刊头与元信息不挤压正文 */
@media (max-width: 768px) {
  .rp-mast__ghost { display: none; }
  .rp-mast__wordmark { font-size: 17px; letter-spacing: .22em; }
  .rp-mast__head { padding-top: 20px; }
}

@media print {
  .rp-mast__ghost { opacity: .04; }
  .rp-mast__row { break-after: avoid; }
  .rp-mast__title, .rp-mast__topic { break-after: avoid; }
}
</style>
