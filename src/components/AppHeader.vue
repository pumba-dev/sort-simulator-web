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
import { useViewportBreakpoint } from "../composables/use-viewport-breakpoint";

type MenuSelection = {
  key: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const MOBILE_HEADER_BREAKPOINT = 900;
const isMobileHeader = useViewportBreakpoint(MOBILE_HEADER_BREAKPOINT);
const isMobileMenuOpen = ref(false);

const viewportWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : MOBILE_HEADER_BREAKPOINT,
);

const updateViewportWidth = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  viewportWidth.value = window.innerWidth;
};

const drawerWidth = computed(() => {
  return Math.min(320, Math.round(viewportWidth.value * 0.86));
});

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

const openMobileMenu = (): void => {
  isMobileMenuOpen.value = true;
};

const closeMobileMenu = (): void => {
  isMobileMenuOpen.value = false;
};

watch(isMobileHeader, (mobile) => {
  if (!mobile) {
    isMobileMenuOpen.value = false;
  }
});

onMounted(() => {
  updateViewportWidth();
  window.addEventListener("resize", updateViewportWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewportWidth);
});

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);
</script>

<template>
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
    :width="drawerWidth"
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
</template>
