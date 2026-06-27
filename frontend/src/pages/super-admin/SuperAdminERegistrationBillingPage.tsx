import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { Building2, Copy, CreditCard, ExternalLink, Mail, RefreshCcw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { superAdminService, SuperAdminAuditLog } from '@/services/superAdminService'

export default function SuperAdminERegistrationBillingPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [schoolName, setSchoolName] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [countryCode, setCountryCode] = useState('GH')
  const [currency, setCurrency] = useState('GHS')
  const [sendEmail, setSendEmail] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null)
  const [recentLogs, setRecentLogs] = useState<SuperAdminAuditLog[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  const suggestedSlug = useMemo(() => (
    schoolName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
  ), [schoolName])
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()), [adminEmail])
  const formValid = schoolName.trim().length > 0 && emailValid && countryCode.trim().length === 2 && currency.trim().length === 3

  async function loadRecent() {
    setLoadingRecent(true)
    try {
      const res = await superAdminService.listAuditLogs({
        page: 1,
        per_page: 10,
        event_type: 'super_admin.school_registration_link_created',
      })
      setRecentLogs(res.logs || [])
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: t('super_admin.e_registration_billing.recent_load_failed', 'Failed to load recent registration activity'),
        description: e.response?.data?.message || e.message || t('super_admin.e_registration_billing.try_again', 'Please try again')
      })
    } finally {
      setLoadingRecent(false)
    }
  }

  useEffect(() => {
    loadRecent()
  }, [])

  async function onCreateLink() {
    if (!formValid) return
    setSubmitting(true)
    try {
      const res = await superAdminService.createSchoolRegistrationLink({
        school_name: schoolName.trim(),
        school_slug: schoolSlug.trim() || undefined,
        admin_email: adminEmail.trim(),
        country_code: countryCode.trim().toUpperCase(),
        currency: currency.trim().toUpperCase(),
        send_email: sendEmail,
      })
      setGeneratedUrl(res.registration_url)
      setGeneratedExpiresAt(res.registration.expires_at || null)
      toast({
        title: t('super_admin.e_registration_billing.link_created', 'Registration link created'),
        description: sendEmail && res.email_sent
          ? t('super_admin.e_registration_billing.link_created_email', 'The school admin email was queued successfully.')
          : t('super_admin.e_registration_billing.link_created_copy', 'Copy the secure registration link and share it with the school owner.'),
      })
      await loadRecent()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string; error?: string }>
      toast({
        variant: 'destructive',
        title: t('super_admin.e_registration_billing.create_failed', 'Could not create registration link'),
        description: e.response?.data?.error || e.response?.data?.message || e.message || t('super_admin.e_registration_billing.try_again', 'Please try again')
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function copyGeneratedUrl() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      toast({ title: t('super_admin.e_registration_billing.copied', 'Copied secure link') })
    } catch (err) {
      void err
      toast({
        variant: 'destructive',
        title: t('super_admin.e_registration_billing.copy_failed', 'Copy failed'),
        description: t('super_admin.e_registration_billing.copy_failed_desc', 'Try selecting and copying the link manually.'),
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('super_admin.e_registration_billing.title', 'E-Registration Operations')}</h1>
          <p className="text-gray-500 mt-1">{t('super_admin.e_registration_billing.subtitle', 'Secure school onboarding links, registration oversight, and billing handoff visibility.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadRecent} disabled={loadingRecent}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/super-admin/schools">
              <Building2 className="mr-2 h-4 w-4" />
              {t('super_admin.e_registration_billing.manage_schools', 'Open Schools')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/super-admin/financial">
              <CreditCard className="mr-2 h-4 w-4" />
              {t('super_admin.e_registration_billing.open_financial', 'Open Financial Insights')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.use_case', 'Primary use')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{t('super_admin.e_registration_billing.cards.use_case_value', 'School onboarding')}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.use_case_hint', 'Issue secure registration links for new school owners from the platform layer.')}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.security', 'Security posture')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{t('super_admin.e_registration_billing.cards.security_value', 'Single-use, 24h expiry')}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.security_hint', 'Links are short-lived and intended for the assigned school admin email only.')}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.billing_handoff', 'Billing handoff')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{t('super_admin.e_registration_billing.cards.billing_handoff_value', 'Post-registration')}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('super_admin.e_registration_billing.cards.billing_handoff_hint', 'After school creation, billing operations continue in the subscription and financial workflows.')}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4" />
              {t('super_admin.e_registration_billing.workflow_title', 'How this page is used in the Super Admin Portal')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('super_admin.e_registration_billing.workflow_body', 'Use this page to generate a secure school registration link, deliver it to the designated school admin, monitor recent onboarding activity, and then move into financial oversight once the school is created.')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{t('super_admin.e_registration_billing.workflow_step_1', '1. Issue link')}</Badge>
            <Badge variant="secondary">{t('super_admin.e_registration_billing.workflow_step_2', '2. School completes registration')}</Badge>
            <Badge variant="secondary">{t('super_admin.e_registration_billing.workflow_step_3', '3. Review financial exposure')}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('super_admin.e_registration_billing.create_card', 'Create school registration link')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schoolName">{t('super_admin.e_registration_billing.school_name', 'School name')}</Label>
                <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="ADMIPAEDIA Academy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolSlug">{t('super_admin.e_registration_billing.school_slug', 'School slug')}</Label>
                <Input id="schoolSlug" value={schoolSlug} onChange={(e) => setSchoolSlug(e.target.value)} placeholder={suggestedSlug || 'admipaedia-academy'} />
                <div className="text-xs text-muted-foreground">
                  {t('super_admin.e_registration_billing.school_slug_hint', 'Leave blank to auto-generate from the school name.')}
                  {suggestedSlug && !schoolSlug.trim() ? ` ${t('super_admin.e_registration_billing.suggested', 'Suggested')}: ${suggestedSlug}` : ''}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">{t('super_admin.e_registration_billing.admin_email', 'School admin email')}</Label>
              <Input id="adminEmail" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.com" />
              <div className="text-xs text-muted-foreground">
                {adminEmail.trim().length === 0
                  ? t('super_admin.e_registration_billing.admin_email_hint', 'This email receives the onboarding link and becomes the initial school admin login.')
                  : emailValid
                    ? t('super_admin.e_registration_billing.email_valid', 'Valid email format.')
                    : t('super_admin.e_registration_billing.email_invalid', 'Enter a valid email address.')}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="countryCode">{t('super_admin.e_registration_billing.country_code', 'Country code')}</Label>
                <Input id="countryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} placeholder="GH" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t('super_admin.e_registration_billing.currency', 'Currency')}</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} placeholder="GHS" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <div className="text-sm font-medium">{t('super_admin.e_registration_billing.send_email', 'Send by email')}</div>
                <div className="text-xs text-muted-foreground">{t('super_admin.e_registration_billing.send_email_hint', 'Queues the secure registration link for the designated school admin.')}</div>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setSchoolName('')
                setSchoolSlug('')
                setAdminEmail('')
                setCountryCode('GH')
                setCurrency('GHS')
                setSendEmail(true)
                setGeneratedUrl(null)
                setGeneratedExpiresAt(null)
              }}>
                {t('common.reset', 'Reset')}
              </Button>
              <Button onClick={onCreateLink} disabled={!formValid || submitting}>
                {submitting ? t('common.processing', 'Processing...') : t('super_admin.e_registration_billing.create_action', 'Create secure link')}
              </Button>
            </div>

            {generatedUrl && (
              <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-semibold">{t('super_admin.e_registration_billing.generated_title', 'Generated registration link')}</div>
                <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    <Mail className="mr-1 h-3 w-3" />
                    {sendEmail ? t('super_admin.e_registration_billing.delivery_email', 'Email delivery requested') : t('super_admin.e_registration_billing.delivery_manual', 'Manual delivery')}
                  </Badge>
                  {generatedExpiresAt ? <Badge variant="outline">{t('super_admin.e_registration_billing.expires', 'Expires')}: {new Date(generatedExpiresAt).toLocaleString()}</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={copyGeneratedUrl}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('super_admin.e_registration_billing.copy_link', 'Copy link')}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={generatedUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('super_admin.e_registration_billing.open_preview', 'Open link')}
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('super_admin.e_registration_billing.recent_title', 'Recent onboarding activity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRecent ? (
              <div className="text-sm text-muted-foreground">{t('common.loading', 'Loading...')}</div>
            ) : recentLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('super_admin.e_registration_billing.recent_empty', 'No registration-link activity yet.')}</div>
            ) : (
              recentLogs.map((log) => {
                const details = (log.details || {}) as Record<string, string>
                return (
                  <div key={log.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{details.school_slug || log.event_type}</div>
                        <div className="text-xs text-muted-foreground">{details.admin_email || t('super_admin.e_registration_billing.unknown_email', 'No admin email')}</div>
                      </div>
                      <Badge variant="outline">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {details.registration_id ? <Badge variant="secondary">ID: {details.registration_id}</Badge> : null}
                      {details.expires_at ? <Badge variant="secondary">{t('super_admin.e_registration_billing.expires', 'Expires')}: {new Date(details.expires_at).toLocaleString()}</Badge> : null}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

