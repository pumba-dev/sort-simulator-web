<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ExperimentOutlined,
  KeyOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  CopyOutlined,
} from "@ant-design/icons-vue";
import {
  scenarioOptions,
  scenarioLabelKeyByKey,
} from "../constants/comparator-options";
import { comparatorAlgorithmInfo } from "../constants/comparator-algorithm-info";
import { SeededPrng } from "../services/seeded-prng";

defineProps<{ open: boolean }>();
defineEmits<{ (e: "update:open", value: boolean): void }>();

const { t } = useI18n();

const PREVIEW_N = 48;
const PREVIEW_SEED = 42;

const scenarios = computed(() =>
  scenarioOptions.map((opt) => ({
    key: opt.key,
    label: t(scenarioLabelKeyByKey[opt.key]),
    description: t(`comparator.help.scenarios.${opt.key}`),
  })),
);

const scenarioPreviews = computed(() => {
  const out: Record<string, number[]> = {};
  for (const opt of scenarioOptions) {
    const raw = SeededPrng.generateScenarioArray(PREVIEW_N, opt.key, PREVIEW_SEED);
    out[opt.key] = Array.from(raw, (v) => Math.round((v / PREVIEW_N) * 100));
  }
  return out;
});
</script>

<template>
  <a-modal
    :open="open"
    :title="t('comparator.help.title')"
    :width="'min(780px, calc(100vw - 32px))'"
    :footer="null"
    @update:open="$emit('update:open', $event)"
  >
    <a-tabs default-active-key="general">
      <a-tab-pane key="general" :tab="t('comparator.help.tabs.general')">
        <div class="comparator-help__section">
          <ol class="comparator-help__steps">
            <li
              v-for="(key, i) in ['intro', 'workflow', 'results']"
              :key="key"
              class="comparator-help__step"
            >
              <span class="comparator-help__step-num">{{ i + 1 }}</span>
              <p>{{ t(`comparator.help.general.${key}`) }}</p>
            </li>
          </ol>
        </div>
      </a-tab-pane>

      <a-tab-pane key="algorithms" :tab="t('comparator.help.tabs.algorithms')">
        <div class="comparator-help__section">
          <article
            v-for="alg in comparatorAlgorithmInfo"
            :key="alg.key"
            class="comparator-help__card comparator-help__card--algorithm"
          >
            <h4 class="comparator-help__card-title">{{ t(alg.titleKey) }}</h4>
            <p>{{ t(alg.conceptKey) }}</p>
            <p>{{ t(alg.strategyKey) }}</p>
            <div class="comparator-help__card-tags">
              <a-space wrap :size="6">
                <a-tag color="green">
                  {{ t("learning.complexity.best") }}: {{ alg.bestCase }}
                </a-tag>
                <a-tag color="blue">
                  {{ t("learning.complexity.average") }}: {{ alg.averageCase }}
                </a-tag>
                <a-tag color="volcano">
                  {{ t("learning.complexity.worst") }}: {{ alg.worstCase }}
                </a-tag>
              </a-space>
            </div>
          </article>
        </div>
      </a-tab-pane>

      <a-tab-pane key="scenarios" :tab="t('comparator.help.tabs.scenarios')">
        <div class="comparator-help__section">
          <article
            v-for="scn in scenarios"
            :key="scn.key"
            class="comparator-help__card"
          >
            <h4 class="comparator-help__card-title">{{ scn.label }}</h4>
            <div class="scenario-preview" aria-hidden="true">
              <span
                v-for="(h, i) in scenarioPreviews[scn.key]"
                :key="i"
                class="scenario-preview__bar"
                :style="{ height: h + '%' }"
              />
            </div>
            <p>{{ scn.description }}</p>
          </article>
          <p class="comparator-help__note">
            {{ t("comparator.help.scenarios.note") }}
          </p>
        </div>
      </a-tab-pane>

      <a-tab-pane key="parameters" :tab="t('comparator.help.tabs.parameters')">
        <div class="comparator-help__section">
          <article class="comparator-help__card">
            <h4 class="comparator-help__card-title">
              <ExperimentOutlined class="comparator-help__card-icon" />
              {{ t("comparator.form.replications") }}
            </h4>
            <p>{{ t("comparator.help.parameters.replications") }}</p>
          </article>
          <article class="comparator-help__card">
            <h4 class="comparator-help__card-title">
              <KeyOutlined class="comparator-help__card-icon" />
              {{ t("comparator.form.seed") }}
            </h4>
            <p>{{ t("comparator.help.parameters.seed") }}</p>
          </article>
          <article class="comparator-help__card">
            <h4 class="comparator-help__card-title">
              <ClockCircleOutlined class="comparator-help__card-icon" />
              {{ t("comparator.form.timeoutEnabled") }}
            </h4>
            <p>{{ t("comparator.help.parameters.timeout") }}</p>
          </article>
          <article class="comparator-help__card">
            <h4 class="comparator-help__card-title">
              <FilterOutlined class="comparator-help__card-icon" />
              {{ t("comparator.form.removeOutliers") }}
            </h4>
            <p>{{ t("comparator.help.parameters.outliers") }}</p>
          </article>
          <article class="comparator-help__card">
            <h4 class="comparator-help__card-title">
              <CopyOutlined class="comparator-help__card-icon" />
              {{ t("comparator.form.allowDuplicates") }}
            </h4>
            <p>{{ t("comparator.help.parameters.duplicates") }}</p>
          </article>
        </div>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<style scoped>
.comparator-help__section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

/* General tab — numbered steps */
.comparator-help__steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comparator-help__step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  align-items: start;
}

.comparator-help__step p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--sl-text-muted);
}

.comparator-help__step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--sl-accent-soft, #dce7ff);
  color: var(--sl-accent, #164fd6);
  font-weight: 700;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Cards */
.comparator-help__card {
  border: 1px solid var(--sl-border, #d8e0f3);
  border-radius: var(--sl-radius-sm, 10px);
  padding: 12px 14px;
  background: var(--sl-bg-soft, #eef3ff);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.comparator-help__card:hover {
  border-color: var(--sl-border-strong, #b7c6eb);
  box-shadow: var(--sl-shadow-sm, 0 8px 20px rgba(20, 52, 121, 0.08));
}

/* Algorithm cards — left accent border */
.comparator-help__card--algorithm {
  border-left: 3px solid var(--sl-accent, #164fd6);
}

/* Tags section inside algorithm cards */
.comparator-help__card-tags {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--sl-border, #d8e0f3);
}

/* Card title with optional icon */
.comparator-help__card-title {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 7px;
}

.comparator-help__card-icon {
  font-size: 0.9rem;
  color: var(--sl-accent, #164fd6);
  flex-shrink: 0;
}

.comparator-help__card p {
  margin: 0 0 8px;
  font-size: 0.92rem;
  line-height: 1.45;
}

.comparator-help__card p:last-of-type {
  margin-bottom: 0;
}

/* Scenario mini bar chart */
.scenario-preview {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 44px;
  margin: 6px 0 8px;
  border-radius: var(--sl-radius-sm, 10px);
  overflow: hidden;
  background: var(--sl-bg-main, #f4f6fb);
  padding: 4px 4px 0;
}

.scenario-preview__bar {
  flex: 1;
  background: var(--sl-accent, #164fd6);
  opacity: 0.45;
  border-radius: 1px 1px 0 0;
  min-height: 2px;
  transition: opacity 0.15s;
}

.comparator-help__card:hover .scenario-preview__bar {
  opacity: 0.65;
}

.comparator-help__note {
  margin: 4px 0 0;
  font-size: 0.88rem;
  font-style: italic;
  color: var(--sl-text-soft, #6a7897);
}
</style>
