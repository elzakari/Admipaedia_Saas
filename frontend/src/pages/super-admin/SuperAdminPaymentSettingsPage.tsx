import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import billingService, { PaymentGateway } from '@/services/billingService'

const gatewayNames = ['paystack', 'cinetpay', 'flutterwave', 'manual'] as const

export default function SuperAdminPaymentSettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [gateways, setGateways] = useState<PaymentGateway[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState<(typeof gatewayNames)[number]>('paystack')
  const [displayName, setDisplayName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [currency, setCurrency] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [supportedChannels, setSupportedChannels] = useState('mobile_money,card')
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('sandbox')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await billingService.listGateways()
      setGateways(res.gateways)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.payment_settings.errors.load_failed', 'Failed to load gateways'), description: e.response?.data?.message || e.message || t('super_admin.payment_settings.errors.try_again', 'Please try again') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rows = useMemo(() => gateways || [], [gateways])

  const resetForm = () => {
    setEditingId(null)
    setName('paystack')
    setDisplayName('')
    setCountryCode('')
    setCurrency('')
    setPublicKey('')
    setSecretKey('')
    setWebhookSecret('')
    setSupportedChannels('mobile_money,card')
    setEnvironment('sandbox')
    setIsActive(true)
    setIsDefault(false)
  }

  const openNew = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (gw: PaymentGateway) => {
    setEditingId(gw.id)
    setName(gw.name as any)
    setDisplayName(gw.display_name || '')
    setCountryCode(gw.country_code || '')
    setCurrency(gw.currency || '')
    setPublicKey(gw.public_key || '')
    setSecretKey(gw.secret_key_set ? '********' : '')
    setWebhookSecret(gw.webhook_secret_set ? '********' : '')
    setSupportedChannels((gw.supported_channels || []).join(','))
    setEnvironment((gw.environment as any) || 'sandbox')
    setIsActive(Boolean(gw.is_active))
    setIsDefault(Boolean(gw.is_default))
    setOpen(true)
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const channels = supportedChannels
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const payload = {
        name,
        display_name: displayName || undefined,
        country_code: countryCode || undefined,
        currency: currency || undefined,
        public_key: publicKey || undefined,
        secret_key: secretKey || undefined,
        webhook_secret: webhookSecret || undefined,
        supported_channels: channels,
        environment,
        is_active: isActive,
        is_default: isDefault
      }
      if (editingId) await billingService.updateGateway(editingId, payload)
      else await billingService.createGateway(payload)
      toast({ title: t('common.saved', 'Saved') })
      setOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.payment_settings.errors.save_failed', 'Save failed'), description: e.response?.data?.message || e.message || t('super_admin.payment_settings.errors.try_again', 'Please try again') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.payment_settings.title', 'Payment Settings')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.payment_settings.subtitle', 'Configure payment gateways by country and currency.')}</p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Settings2 className="h-4 w-4 mr-2" />
              {t('super_admin.payment_settings.actions.add_gateway', 'Add gateway')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>{editingId ? t('super_admin.payment_settings.dialog.edit_title', 'Edit gateway') : t('super_admin.payment_settings.dialog.add_title', 'Add gateway')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.name', 'Name')}</Label>
                <Select value={name} onValueChange={(v: any) => setName(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('super_admin.payment_settings.form.select_gateway', 'Select gateway')} />
                  </SelectTrigger>
                  <SelectContent>
                    {gatewayNames.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.display_name', 'Display name')}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('super_admin.payment_settings.form.display_name_placeholder', 'Paystack Ghana')} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.country_code', 'Country code')}</Label>
                <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="GH" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.currency', 'Currency')}</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="GHS" maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.public_key', 'Public key')}</Label>
                <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder={t('super_admin.payment_settings.form.public_key', 'Public key')} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.secret_key', 'Secret key')}</Label>
                <Input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={editingId ? '********' : t('super_admin.payment_settings.form.secret_key', 'Secret key')} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.webhook_secret', 'Webhook secret')}</Label>
                <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={editingId ? '********' : t('super_admin.payment_settings.form.webhook_secret', 'Webhook secret')} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.supported_channels', 'Supported channels')}</Label>
                <Input value={supportedChannels} onChange={(e) => setSupportedChannels(e.target.value)} placeholder={t('super_admin.payment_settings.form.supported_channels_placeholder', 'mobile_money,card,bank_transfer,wallet,manual')} />
              </div>
              <div className="space-y-2">
                <Label>{t('super_admin.payment_settings.form.environment', 'Environment')}</Label>
                <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('super_admin.payment_settings.form.select_environment', 'Select env')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">sandbox</SelectItem>
                    <SelectItem value="live">live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
                  {t('common.active', 'Active')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
                  {t('super_admin.payment_settings.form.default', 'Default')}
                </label>
              </div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                <Button type="submit" disabled={saving}>{saving ? t('super_admin.payment_settings.saving', 'Saving...') : t('common.save', 'Save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('super_admin.payment_settings.gateways.title', 'Gateways')}</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? t('common.loading', 'Loading...') : t('super_admin.payment_settings.gateways.configured', '{{count}} configured', { count: rows.length })}</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('super_admin.payment_settings.table.name', 'Name')}</TableHead>
                <TableHead>{t('super_admin.payment_settings.table.country', 'Country')}</TableHead>
                <TableHead>{t('super_admin.payment_settings.table.currency', 'Currency')}</TableHead>
                <TableHead>{t('super_admin.payment_settings.table.env', 'Env')}</TableHead>
                <TableHead>{t('super_admin.payment_settings.table.channels', 'Channels')}</TableHead>
                <TableHead>{t('super_admin.payment_settings.table.status', 'Status')}</TableHead>
                <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.display_name || g.name}</TableCell>
                  <TableCell>{g.country_code || '—'}</TableCell>
                  <TableCell>{g.currency || '—'}</TableCell>
                  <TableCell>{g.environment}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{(g.supported_channels || []).join(', ') || '—'}</TableCell>
                  <TableCell className="space-x-2">
                    <Badge variant={g.is_active ? 'success' : 'secondary'}>{g.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}</Badge>
                    {g.is_default && <Badge variant="outline">{t('super_admin.payment_settings.badges.default', 'default')}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>{t('common.edit', 'Edit')}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">{t('super_admin.payment_settings.empty', 'No gateways configured.')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

