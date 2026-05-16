<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <a-layout-footer class="app-footer">
    <div class="app-footer__content">
      <a
        class="app-footer__link"
        href="https://github.com/pumba-dev/sort-simulator-web"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("app.footerText") }}
      </a>
    </div>
  </a-layout-footer>
</template>
