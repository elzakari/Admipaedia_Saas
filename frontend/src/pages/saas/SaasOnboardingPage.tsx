import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Sparkles } from 'lucide-react'
import type { AxiosError } from 'axios'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import saasService from '@/services/saasService'

export default function SaasOnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [countryCode, setCountryCode] = useState('GH')
  const [currency, setCurrency] = useState('GHS')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const suggestedSlug = useMemo(() => {
    const s = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
    return s
  }, [name])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await saasService.createTenant({
        name,
        slug: slug || suggestedSlug,
        country_code: countryCode,
        currency
      })
      localStorage.setItem('saas_current_tenant_id', res.tenant.id)
      toast({ title: 'School created', description: `Welcome to ${res.tenant.name}` })
      navigate('/app')
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to create school',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-slate-200 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create your School Workspace
          </CardTitle>
          <div className="text-sm text-slate-600">This creates a tenant (school) and makes you School Admin.</div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">School name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ADMIPAEDIA School" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">School slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={suggestedSlug || 'your-school'}
                />
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Used for URLs and identifiers
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country code</Label>
                <Input id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} placeholder="GH" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} placeholder="GHS" />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" className="bg-white" onClick={() => navigate('/app')}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create School'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
