<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <main class="mobile-validation" role="main" aria-live="polite">
    <section class="mobile-validation__card">
      <h1 class="mobile-validation__title">
        {{ t("mobileValidation.title") }}
      </h1>
      <p class="mobile-validation__message">
        {{ t("mobileValidation.message") }}
      </p>
    </section>
  </main>
</template>

<style scoped lang="scss">
.mobile-validation {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(
    circle at top,
    #ebf2ff 0%,
    #d8e3ff 46%,
    #c5d4fa 100%
  );
}

.mobile-validation__card {
  width: min(540px, 100%);
  padding: 28px 24px;
  border-radius: var(--sl-radius-lg);
  border: 1px solid rgba(17, 56, 141, 0.18);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--sl-shadow-lg);
  text-align: center;
}

.mobile-validation__title {
  margin: 0;
  color: #123472;
  font-family: var(--sl-font-display);
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.mobile-validation__message {
  margin: 14px 0 0;
  color: #2d4576;
  font-family: var(--sl-font-sans);
  font-size: 1rem;
  line-height: 1.55;
}
</style>
