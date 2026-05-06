import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { applyDocumentLanguage, hasLanguageOverride, languageForCountry, normalizeLanguage } from '@/lib/countryLanguage'

export default function CountryLanguageAutoSwitch() {
  const { i18n } = useTranslation()
  const { current } = useSaasTenant()

  useEffect(() => {
    const countryCode = current?.tenant?.country_code
    if (!countryCode) return
    if (hasLanguageOverride()) return

    const nextLang = languageForCountry(countryCode)
    const currentLang = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'en')
    if (currentLang === nextLang) {
      applyDocumentLanguage(currentLang)
      return
    }

    void i18n.changeLanguage(nextLang).then(() => applyDocumentLanguage(nextLang))
  }, [current?.tenant?.country_code, i18n])

  return null
}

