export const SAAS_LANGUAGE_OVERRIDE_KEY = 'saas_language_override'

export function normalizeLanguage(code: string): string {
  return String(code || '').split('-')[0]
}

export function languageForCountry(countryCode: string | null | undefined): string {
  const cc = String(countryCode || '').trim().toUpperCase()
  if (cc === 'TG' || cc === 'BJ') return 'fr'
  if (cc === 'GH') return 'en'
  return 'en'
}

export function applyDocumentLanguage(langCode: string): void {
  const lang = normalizeLanguage(langCode)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

export function markLanguageOverride(): void {
  localStorage.setItem(SAAS_LANGUAGE_OVERRIDE_KEY, 'true')
}

export function hasLanguageOverride(): boolean {
  return localStorage.getItem(SAAS_LANGUAGE_OVERRIDE_KEY) === 'true'
}

