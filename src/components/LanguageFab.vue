<script setup lang="ts">
import { computed, ref } from "vue";
import { CheckOutlined, GlobalOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import brFlag from "../assets/flags/br.svg";
import esFlag from "../assets/flags/es.svg";
import usFlag from "../assets/flags/us.svg";
import { useAppLocale } from "../composables/use-app-locale";
import type { AppLocale } from "../i18n/types";

type LocaleOption = {
  locale: AppLocale;
  flagSrc: string;
  label: string;
  flagAlt: string;
};

const isOpen = ref(false);
const { t } = useI18n();
const { currentLocale, changeLocale } = useAppLocale();

const localeOptions = computed<LocaleOption[]>(() => {
  return [
    {
      locale: "pt-BR",
      flagSrc: brFlag,
      label: t("language.options.pt-BR"),
      flagAlt: t("language.flagAlt.pt-BR"),
    },
    {
      locale: "en-US",
      flagSrc: usFlag,
      label: t("language.options.en-US"),
      flagAlt: t("language.flagAlt.en-US"),
    },
    {
      locale: "es-ES",
      flagSrc: esFlag,
      label: t("language.options.es-ES"),
      flagAlt: t("language.flagAlt.es-ES"),
    },
  ];
});

const selectedLocaleOption = computed(() => {
  return (
    localeOptions.value.find((item) => item.locale === currentLocale.value) ??
    localeOptions.value[0]
  );
});

const triggerAriaLabel = computed(() => {
  return t("language.current", {
    language: selectedLocaleOption.value.label,
  });
});

const selectLocale = (locale: AppLocale): void => {
  if (locale !== currentLocale.value) {
    changeLocale(locale);
  }
  isOpen.value = false;
};
</script>

<template>
  <div class="language-fab">
    <a-popover v-model:open="isOpen" trigger="click" placement="topRight">
      <template #content>
        <div
          class="language-fab__menu"
          role="menu"
          :aria-label="t('language.change')"
        >
          <button
            v-for="option in localeOptions"
            :key="option.locale"
            class="language-fab__item"
            :class="{
              'language-fab__item--active': option.locale === currentLocale,
            }"
            type="button"
            @click="selectLocale(option.locale)"
          >
            <img
              :src="option.flagSrc"
              :alt="option.flagAlt"
              class="language-fab__item-flag"
            />
            <span>{{ option.label }}</span>
            <CheckOutlined v-if="option.locale === currentLocale" />
          </button>
        </div>
      </template>

      <button
        type="button"
        class="language-fab__trigger"
        :title="t('language.change')"
        :aria-label="triggerAriaLabel"
      >
        <img
          :src="selectedLocaleOption.flagSrc"
          :alt="selectedLocaleOption.flagAlt"
          class="language-fab__trigger-flag"
        />
        <span class="language-fab__trigger-icon" aria-hidden="true">
          <GlobalOutlined />
        </span>
      </button>
    </a-popover>
  </div>
</template>

<style scoped lang="scss">
.language-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1200;
}

.language-fab__trigger {
  position: relative;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(34, 76, 166, 0.42);
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff 0%, #e4ecff 100%);
  box-shadow: 0 14px 26px rgba(17, 50, 122, 0.26);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  padding: 0;
  overflow: hidden;
}

.language-fab__trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 30px rgba(17, 50, 122, 0.32);
}

.language-fab__trigger:focus-visible {
  outline: 2px solid var(--sl-accent);
  outline-offset: 3px;
}

.language-fab__trigger-flag {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.language-fab__trigger-icon {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  color: #ffffff;
  background: linear-gradient(145deg, #205fe9 0%, #133fa9 100%);
  box-shadow: 0 6px 10px rgba(20, 62, 165, 0.34);
}

.language-fab__menu {
  display: grid;
  gap: 6px;
  min-width: 230px;
}

.language-fab__item {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(156, 177, 219, 0.5);
  border-radius: 10px;
  background: #ffffff;
  color: #214276;
  font-family: var(--sl-font-sans);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 7px 10px;
}

.language-fab__item:hover {
  border-color: rgba(58, 101, 189, 0.62);
  background: #eff4ff;
}

.language-fab__item--active {
  border-color: rgba(26, 77, 188, 0.62);
  background: #e7eeff;
  font-weight: 700;
}

.language-fab__item-flag {
  width: 26px;
  height: 18px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(82, 104, 149, 0.35);
}

@media (max-width: 900px) {
  .language-fab {
    right: 14px;
    bottom: 14px;
  }
}

@media (max-width: 600px) {
  .language-fab {
    right: 12px;
    bottom: 12px;
  }

  .language-fab__trigger {
    width: 52px;
    height: 52px;
  }

  .language-fab__trigger-icon {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .language-fab__menu {
    min-width: 206px;
  }
}

@media (max-width: 480px) {
  .language-fab {
    right: 10px;
    bottom: 10px;
  }

  .language-fab__trigger {
    width: 46px;
    height: 46px;
  }

  .language-fab__trigger-icon {
    width: 16px;
    height: 16px;
    font-size: 9px;
  }

  .language-fab__menu {
    min-width: 178px;
    gap: 5px;
  }

  .language-fab__item {
    grid-template-columns: 22px 1fr auto;
    gap: 8px;
    font-size: 0.84rem;
    padding: 6px 8px;
  }

  .language-fab__item-flag {
    width: 22px;
    height: 15px;
  }
}
</style>
