<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BarChartOutlined,
  BookOutlined,
  CodeOutlined,
  HistoryOutlined,
} from "@ant-design/icons-vue";

type MenuSelection = {
  key: string;
};

const route = useRoute();
const router = useRouter();

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
</script>

<template>
  <a-layout class="app-shell">
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
          <span class="brand__title">Sorting Lab</span>
          <span class="brand__subtitle">Simulador Iterativo</span>
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
          Aprendizado
        </a-menu-item>
        <a-menu-item key="/comparador">
          <BarChartOutlined />
          Comparador
        </a-menu-item>
        <a-menu-item key="/historico">
          <HistoryOutlined />
          Historico
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
          Sorting Algorithms Simulator · Pumba Developer © 2026
        </a>
      </div>
    </a-layout-footer>
  </a-layout>
</template>
