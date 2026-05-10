import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminERegistrationBillingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">E-Registration Billing</h1>
        <p className="text-gray-500 mt-1">Manage school-level e-registration billing preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This page is reserved for school-level billing configuration and will be available soon.
        </CardContent>
      </Card>
    </div>
  )
}

