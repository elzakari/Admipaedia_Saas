import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Loader2, RotateCcw, Save } from 'lucide-react'
import api from '../../lib/api'
import { toast } from 'sonner'

type FeeSettings = {
  currency: string
  allowPartialPayments: boolean
  lateFeeEnabled: boolean
  lateFeePercent: number
  reminderDaysBeforeDue: number
  reminderChannels: string
}

const keys = [
  'fees.currency',
  'fees.allow_partial_payments',
  'fees.late_fee_enabled',
  'fees.late_fee_percent',
  'fees.reminder_days_before_due',
  'fees.reminder_channels'
]

const defaults: FeeSettings = {
  currency: 'GHS',
  allowPartialPayments: true,
  lateFeeEnabled: false,
  lateFeePercent: 0,
  reminderDaysBeforeDue: 7,
  reminderChannels: 'sms,email'
}

const asBool = (v: any, fallback: boolean) => {
  if (v === undefined || v === null) return fallback
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase()
  if (s === 'true') return true
  if (s === 'false') return false
  return fallback
}

const asNumber = (v: any, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const FeeSettingsPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fees', 'settings'],
    queryFn: async () => {
      const res = await api.get('/settings/', { params: { keys } })
      return res.data?.data || {}
    }
  })

  const settings: FeeSettings = useMemo(() => {
    return {
      currency: String(data?.['fees.currency'] ?? defaults.currency),
      allowPartialPayments: asBool(data?.['fees.allow_partial_payments'], defaults.allowPartialPayments),
      lateFeeEnabled: asBool(data?.['fees.late_fee_enabled'], defaults.lateFeeEnabled),
      lateFeePercent: asNumber(data?.['fees.late_fee_percent'], defaults.lateFeePercent),
      reminderDaysBeforeDue: asNumber(data?.['fees.reminder_days_before_due'], defaults.reminderDaysBeforeDue),
      reminderChannels: String(data?.['fees.reminder_channels'] ?? defaults.reminderChannels)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async (payload: { key: string; value: string; setting_type?: string }) => {
      const res = await api.post('/settings/update', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'settings'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to save setting')
    },
    onSettled: () => setSavingKey(null)
  })

  const setSetting = (key: string, value: string, setting_type?: string) => {
    setSavingKey(key)
    updateMutation.mutate({ key, value, setting_type })
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Fee Settings</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">General</CardTitle>
          <CardDescription>Defaults used across fees, invoices and payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => {
                  setSetting('fees.currency', v, 'string')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">GHS</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              {savingKey === 'fees.currency' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Saving…</div> : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-sm font-medium">Allow partial payments</div>
                <div className="text-xs text-muted-foreground">Let payments reduce balance without paying full amount</div>
              </div>
              <div className="flex items-center gap-2">
                {savingKey === 'fees.allow_partial_payments' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                <Switch
                  checked={settings.allowPartialPayments}
                  onCheckedChange={(checked) => setSetting('fees.allow_partial_payments', checked ? 'true' : 'false', 'boolean')}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSetting('fees.currency', defaults.currency, 'string')
                setSetting('fees.allow_partial_payments', defaults.allowPartialPayments ? 'true' : 'false', 'boolean')
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset general defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Reminders</CardTitle>
          <CardDescription>Controls for manual reminders in the Reminders tab</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Days before due date</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={String(settings.reminderDaysBeforeDue)}
                  onChange={(e) => {
                    const v = e.target.value
                    setSetting('fees.reminder_days_before_due', v, 'int')
                  }}
                />
                <Button
                  variant="outline"
                  disabled={savingKey === 'fees.reminder_days_before_due'}
                  onClick={() => setSetting('fees.reminder_days_before_due', String(settings.reminderDaysBeforeDue), 'int')}
                >
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
              {savingKey === 'fees.reminder_days_before_due' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Saving…</div> : null}
            </div>

            <div className="space-y-2">
              <Label>Channels (comma-separated)</Label>
              <Input
                value={settings.reminderChannels}
                onChange={(e) => setSetting('fees.reminder_channels', e.target.value, 'string')}
                placeholder="sms,email"
              />
              {savingKey === 'fees.reminder_channels' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Saving…</div> : null}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSetting('fees.reminder_days_before_due', String(defaults.reminderDaysBeforeDue), 'int')
                setSetting('fees.reminder_channels', defaults.reminderChannels, 'string')
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset reminder defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Late Fees</CardTitle>
          <CardDescription>Optional late-fee policy (display + manual enforcement)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="text-sm font-medium">Enable late fee</div>
              <div className="text-xs text-muted-foreground">Adds late fee percentage for overdue balances</div>
            </div>
            <div className="flex items-center gap-2">
              {savingKey === 'fees.late_fee_enabled' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              <Switch
                checked={settings.lateFeeEnabled}
                onCheckedChange={(checked) => setSetting('fees.late_fee_enabled', checked ? 'true' : 'false', 'boolean')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Late fee percent</Label>
              <Input
                type="number"
                value={String(settings.lateFeePercent)}
                onChange={(e) => setSetting('fees.late_fee_percent', e.target.value, 'float')}
                disabled={!settings.lateFeeEnabled}
              />
              {savingKey === 'fees.late_fee_percent' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Saving…</div> : null}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSetting('fees.late_fee_enabled', defaults.lateFeeEnabled ? 'true' : 'false', 'boolean')
                setSetting('fees.late_fee_percent', String(defaults.lateFeePercent), 'float')
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset late-fee defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeeSettingsPanel

