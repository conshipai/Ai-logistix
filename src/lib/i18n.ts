import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

/**
 * Localisation.
 *
 * English is the MVP default and the only complete catalogue. Portuguese is
 * scaffolded because it matters for Mozambique; French is reserved. User-visible
 * strings resolve through `t()` so a later phase adds a language by adding a
 * catalogue, not by touching components.
 */
export const LOCALES = ['en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
}

type Catalogue = typeof en
const catalogues: Record<Locale, Catalogue> = { en, pt: pt as Catalogue }

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

function lookup(catalogue: unknown, path: string): string | undefined {
  const segments = path.split('.')
  let node: unknown = catalogue
  for (const segment of segments) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === 'string' ? node : undefined
}

/** Resolves a dotted key, falling back to English and then to the key itself. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return lookup(catalogues[locale], key) ?? lookup(catalogues[DEFAULT_LOCALE], key) ?? key
}

export function translator(locale: Locale = DEFAULT_LOCALE) {
  return (key: string) => t(key, locale)
}
