<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import LanguageFab from "./components/LanguageFab.vue";
import { setAppLocale } from "./i18n";
import { LOCALE_STORAGE_KEY, isAppLocale } from "./i18n/types";
import { useAppLocale } from "./composables/use-app-locale";

const { antdLocale } = useAppLocale();

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
  <a-config-provider :locale="antdLocale">
    <a-layout class="app-shell">
      <AppHeader />

      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>

      <AppFooter />
    </a-layout>

    <LanguageFab />
  </a-config-provider>
</template>
