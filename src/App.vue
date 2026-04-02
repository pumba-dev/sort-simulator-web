<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  BarChartOutlined,
  BookOutlined,
  CodeOutlined,
  HistoryOutlined,
} from "@ant-design/icons-vue";
import LanguageFab from "./components/LanguageFab.vue";
import { setAppLocale } from "./i18n";
import { LOCALE_STORAGE_KEY, isAppLocale } from "./i18n/types";
import MobileValidationPage from "./pages/MobileValidationPage.vue";
import { isMobileDevice } from "./utils/device-detector";

type MenuSelection = {
  key: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const shouldBlockMobile = ref(isMobileDevice());

const selectedKey = computed(() => {
  if (route.path.startsWith("/comparador")) {
    return "/comparador";
  }
  if (route.path.startsWith("/historico")) {
    return "/historico";
  }
  return "/aprendizado";
});

const navigateTo = ({ key }: MenuSelection): void => {
  void router.push(key);
};

const handleStorageChange = (event: StorageEvent): void => {
  if (event.key !== LOCALE_STORAGE_KEY || !event.newValue) {
    return;
  }

  if (isAppLocale(event.newValue)) {
    setAppLocale(event.newValue);
  }
};

onMounted(() => {
  window.addEventListener("storage", handleStorageChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("storage", handleStorageChange);
});
</script>

<template>
  <MobileValidationPage v-if="shouldBlockMobile" />

  <a-layout v-else class="app-shell">
    <a-layout-header class="app-header">
      <div
        class="brand"
        role="button"
        tabindex="0"
        @click="navigateTo({ key: '/aprendizado' })"
      >
        <span class="brand__icon" aria-hidden="true">
          <CodeOutlined />
        </span>
        <span class="brand__text">
          <span class="brand__title">{{ t("app.brandTitle") }}</span>
          <span class="brand__subtitle">{{ t("app.brandSubtitle") }}</span>
        </span>
      </div>

      <a-menu
        mode="horizontal"
        :selected-keys="[selectedKey]"
        class="main-menu"
        @click="navigateTo"
      >
        <a-menu-item key="/aprendizado">
          <BookOutlined />
          {{ t("menu.learning") }}
        </a-menu-item>
        <a-menu-item key="/comparador">
          <BarChartOutlined />
          {{ t("menu.comparator") }}
        </a-menu-item>
        <a-menu-item key="/historico">
          <HistoryOutlined />
          {{ t("menu.history") }}
        </a-menu-item>
      </a-menu>
    </a-layout-header>

    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>

    <a-layout-footer class="app-footer">
      <div class="app-footer__content">
        <a
          class="app-footer__link"
          href="https://pumbadev.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("app.footerText") }}
        </a>
      </div>
    </a-layout-footer>
  </a-layout>

  <LanguageFab />
</template>
