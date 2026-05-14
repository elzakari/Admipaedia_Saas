import React from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuperAdminERegistrationBillingPage() {
  const { t } = useTranslation()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('super_admin.e_registration_billing.title', 'E-Registration Billing')}</h1>
        <p className="text-gray-500 mt-1">{t('super_admin.e_registration_billing.subtitle', 'Platform-level visibility and controls')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('super_admin.e_registration_billing.card_title', 'Platform View')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          {t('super_admin.e_registration_billing.card_body', 'School-level billing configuration belongs in the School Admin portal. This view is reserved for platform-wide reporting and policy controls.')}
        </CardContent>
      </Card>
    </div>
  )
}

