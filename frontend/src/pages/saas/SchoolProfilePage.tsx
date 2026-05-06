import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import saasService from '@/services/saasService'

export default function SchoolProfilePage() {
  const { toast } = useToast()
  const { currentTenantId, current, refresh } = useSaasTenant()

  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [currency, setCurrency] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(current?.tenant.name || '')
    setCountryCode(current?.tenant.country_code || '')
    setCurrency(current?.tenant.currency || '')
  }, [current])

  async function onSave() {
    if (!currentTenantId) return
    setIsSaving(true)
    try {
      await saasService.updateTenant(currentTenantId, { name, country_code: countryCode, currency })
      await refresh()
      toast({ title: 'Saved', description: 'School profile updated.' })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SaasShell title="School Profile" nav={schoolNav} showTenantSwitcher>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">School details</CardTitle>
          <CardDescription>Update your school workspace details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="School name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country code</Label>
              <Input
                id="country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="GH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="GHS"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={!currentTenantId || isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </SaasShell>
  )
}
