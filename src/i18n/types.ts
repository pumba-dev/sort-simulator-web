export const SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt-BR";
export const LOCALE_STORAGE_KEY = "sorting-simulator-locale";

export const isAppLocale = (value: string): value is AppLocale => {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
};
