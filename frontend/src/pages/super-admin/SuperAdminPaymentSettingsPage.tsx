import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Settings2 } from 'lucide-react'

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
      toast({ variant: 'destructive', title: 'Failed to load gateways', description: e.response?.data?.message || e.message || 'Please try again' })
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
      toast({ title: 'Saved' })
      setOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Save failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Payment Settings</h1>
          <p className="text-sm text-muted-foreground">Configure payment gateways by country and currency.</p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Settings2 className="h-4 w-4 mr-2" />
              Add gateway
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit gateway' : 'Add gateway'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Select value={name} onValueChange={(v: any) => setName(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gateway" />
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
                <Label>Display name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Paystack Ghana" />
              </div>
              <div className="space-y-2">
                <Label>Country code</Label>
                <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="GH" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="GHS" maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label>Public key</Label>
                <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="Public key" />
              </div>
              <div className="space-y-2">
                <Label>Secret key</Label>
                <Input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={editingId ? '********' : 'Secret key'} />
              </div>
              <div className="space-y-2">
                <Label>Webhook secret</Label>
                <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={editingId ? '********' : 'Webhook secret'} />
              </div>
              <div className="space-y-2">
                <Label>Supported channels</Label>
                <Input value={supportedChannels} onChange={(e) => setSupportedChannels(e.target.value)} placeholder="mobile_money,card,bank_transfer,wallet,manual" />
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select env" />
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
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
                  Default
                </label>
              </div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Gateways</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${rows.length} configured`}</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Env</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                    <Badge variant={g.is_active ? 'success' : 'secondary'}>{g.is_active ? 'active' : 'inactive'}</Badge>
                    {g.is_default && <Badge variant="outline">default</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">No gateways configured.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

