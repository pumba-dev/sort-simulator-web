import { createI18n } from "vue-i18n";
import enUS from "./locales/enUS";
import esES from "./locales/esES";
import ptBR from "./locales/ptBR";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isAppLocale,
  type AppLocale,
} from "./types";

const messages = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
};

const normalizeDetectedLocale = (value: string | undefined): AppLocale => {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.toLowerCase();

  if (normalized.startsWith("pt")) {
    return "pt-BR";
  }
  if (normalized.startsWith("es")) {
    return "es-ES";
  }
  if (normalized.startsWith("en")) {
    return "en-US";
  }

  return DEFAULT_LOCALE;
};

const resolveInitialLocale = (): AppLocale => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  try {
    const persisted = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (persisted && isAppLocale(persisted)) {
      return persisted;
    }
  } catch {
    // Ignore environments where localStorage is unavailable.
  }

  return normalizeDetectedLocale(window.navigator.language);
};

const applyHtmlLang = (locale: AppLocale): void => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
};

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
});

applyHtmlLang(i18n.global.locale.value as AppLocale);

export const setAppLocale = (locale: AppLocale): void => {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return;
  }

  i18n.global.locale.value = locale;
  applyHtmlLang(locale);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore persistence failures.
    }
  }
};
