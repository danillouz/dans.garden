import { CalloutTranslation, Translation } from "./locales/definition"
import enUs from "./locales/en-US"

export const TRANSLATIONS = {
  "en-US": enUs,
} as const

export const defaultTranslation = "en-US"
export const i18n = (locale: ValidLocale): Translation => TRANSLATIONS[locale ?? defaultTranslation]
export type ValidLocale = keyof typeof TRANSLATIONS
export type ValidCallout = keyof CalloutTranslation
