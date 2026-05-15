import { computed } from "vue";
import ptBR from "ant-design-vue/es/locale/pt_BR";
import enUS from "ant-design-vue/es/locale/en_US";
import esES from "ant-design-vue/es/locale/es_ES";
import type { Locale } from "ant-design-vue/es/locale";
import { i18n, setAppLocale } from "../i18n";
import type { AppLocale } from "../i18n/types";

const ANTD_LOCALE_BY_APP_LOCALE: Record<AppLocale, Locale> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
};

export const useAppLocale = () => {
  const currentLocale = computed<AppLocale>(() => {
    return i18n.global.locale.value as AppLocale;
  });

  const antdLocale = computed<Locale>(() => {
    return ANTD_LOCALE_BY_APP_LOCALE[currentLocale.value];
  });

  const changeLocale = (locale: AppLocale): void => {
    setAppLocale(locale);
  };

  return {
    currentLocale,
    antdLocale,
    changeLocale,
  };
};
