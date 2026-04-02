import { computed } from "vue";
import { i18n, setAppLocale } from "../i18n";
import type { AppLocale } from "../i18n/types";

export const useAppLocale = () => {
  const currentLocale = computed<AppLocale>(() => {
    return i18n.global.locale.value as AppLocale;
  });

  const changeLocale = (locale: AppLocale): void => {
    setAppLocale(locale);
  };

  return {
    currentLocale,
    changeLocale,
  };
};
