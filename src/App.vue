<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  BarChartOutlined,
  BookOutlined,
  CodeOutlined,
  HistoryOutlined,
  MenuOutlined,
} from "@ant-design/icons-vue";
import LanguageFab from "./components/LanguageFab.vue";
import { setAppLocale } from "./i18n";
import { LOCALE_STORAGE_KEY, isAppLocale } from "./i18n/types";
import { useAppLocale } from "./composables/use-app-locale";

type MenuSelection = {
  key: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { antdLocale } = useAppLocale();
const MOBILE_HEADER_BREAKPOINT = 900;
const isMobileHeader = ref(
  typeof window !== "undefined" &&
    window.innerWidth <= MOBILE_HEADER_BREAKPOINT,
);
const isMobileMenuOpen = ref(false);

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
  isMobileMenuOpen.value = false;
  void router.push(key);
};

const updateMobileHeaderState = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  isMobileHeader.value = window.innerWidth <= MOBILE_HEADER_BREAKPOINT;
  if (!isMobileHeader.value) {
    isMobileMenuOpen.value = false;
  }
};

const openMobileMenu = (): void => {
  isMobileMenuOpen.value = true;
};

const closeMobileMenu = (): void => {
  isMobileMenuOpen.value = false;
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
  updateMobileHeaderState();
  window.addEventListener("resize", updateMobileHeaderState);
  window.addEventListener("storage", handleStorageChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMobileHeaderState);
  window.removeEventListener("storage", handleStorageChange);
});

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);
</script>

<template>
  <a-config-provider :locale="antdLocale">
    <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div
        class="brand"
        role="button"
        tabindex="0"
        @click="navigateTo({ key: '/aprendizado' })"
        @keydown.enter.prevent="navigateTo({ key: '/aprendizado' })"
        @keydown.space.prevent="navigateTo({ key: '/aprendizado' })"
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
        v-if="!isMobileHeader"
        mode="horizontal"
        :selected-keys="[selectedKey]"
        class="main-menu main-menu--desktop"
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

      <button
        v-else
        type="button"
        class="main-menu-toggle"
        :aria-label="t('menu.openNavigation')"
        :aria-expanded="isMobileMenuOpen"
        aria-haspopup="dialog"
        @click="openMobileMenu"
      >
        <MenuOutlined />
      </button>
    </a-layout-header>

    <a-drawer
      v-if="isMobileHeader"
      class="mobile-menu-drawer"
      placement="right"
      :title="t('menu.navigation')"
      :open="isMobileMenuOpen"
      @close="closeMobileMenu"
    >
      <a-menu
        mode="inline"
        :selected-keys="[selectedKey]"
        class="main-menu-mobile"
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
    </a-drawer>

    <a-layout-content class="app-content">
      <router-view />
    </a-layout-content>

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
    </a-layout>

    <LanguageFab />
  </a-config-provider>
</template>
