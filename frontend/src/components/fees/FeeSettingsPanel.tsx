import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Loader2, RotateCcw, Save } from 'lucide-react'
import api from '../../lib/api'
import { toast } from 'sonner'
import { useSaasTenant } from '../../hooks/useSaasTenant'

type FeeSettings = {
  allowPartialPayments: boolean
  lateFeeEnabled: boolean
  lateFeePercent: number
  reminderDaysBeforeDue: number
  reminderChannels: string
}

const keys = [
  'fees.allow_partial_payments',
  'fees.late_fee_enabled',
  'fees.late_fee_percent',
  'fees.reminder_days_before_due',
  'fees.reminder_channels'
]

const defaults: FeeSettings = {
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const { current } = useSaasTenant()
  const schoolCurrency = String(current?.tenant?.currency || 'USD').toUpperCase()

  const { data, isLoading } = useQuery({
    queryKey: ['fees', 'settings'],
    queryFn: async () => {
      const res = await api.get('/settings/', { params: { keys } })
      return res.data?.data || {}
    }
  })

  const settings: FeeSettings = useMemo(() => {
    return {
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
      toast.error(e?.response?.data?.message || t('admin_fees.failed_save_setting', 'Failed to save setting'))
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
          <CardTitle className="text-lg font-semibold">{t('admin_fees.fee_settings', 'Fee Settings')}</CardTitle>
          <CardDescription>{t('common.loading', 'Loading…')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.general', 'General')}</CardTitle>
          <CardDescription>{t('admin_fees.general_settings_desc', 'Defaults used across fees, invoices and payments. Currency follows the school profile automatically.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin_fees.school_currency', 'School currency')}</Label>
              <Input value={schoolCurrency} disabled readOnly />
              <div className="text-xs text-muted-foreground">{t('admin_fees.school_currency_desc', 'Update the school profile currency to change fees, templates, invoices, and parent balances platform-wide.')}</div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-sm font-medium">{t('admin_fees.allow_partial_payments', 'Allow partial payments')}</div>
                <div className="text-xs text-muted-foreground">{t('admin_fees.allow_partial_payments_desc', 'Let payments reduce balance without paying full amount')}</div>
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
                setSetting('fees.allow_partial_payments', defaults.allowPartialPayments ? 'true' : 'false', 'boolean')
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('admin_fees.reset_general_defaults', 'Reset general defaults')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.reminders', 'Reminders')}</CardTitle>
          <CardDescription>{t('admin_fees.reminders_desc', 'Controls for manual reminders in the Reminders tab')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin_fees.days_before_due', 'Days before due date')}</Label>
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
                  <Save className="h-4 w-4 mr-2" /> {t('common.save', 'Save')}
                </Button>
              </div>
              {savingKey === 'fees.reminder_days_before_due' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Saving…')}</div> : null}
            </div>

            <div className="space-y-2">
              <Label>{t('admin_fees.channels_label', 'Channels (comma-separated)')}</Label>
              <Input
                value={settings.reminderChannels}
                onChange={(e) => setSetting('fees.reminder_channels', e.target.value, 'string')}
                placeholder="sms,email"
              />
              {savingKey === 'fees.reminder_channels' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Saving…')}</div> : null}
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
              {t('admin_fees.reset_reminder_defaults', 'Reset reminder defaults')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.late_fees', 'Late Fees')}</CardTitle>
          <CardDescription>{t('admin_fees.late_fees_desc', 'Optional late-fee policy (display + manual enforcement)')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="text-sm font-medium">{t('admin_fees.enable_late_fee', 'Enable late fee')}</div>
              <div className="text-xs text-muted-foreground">{t('admin_fees.enable_late_fee_desc', 'Adds late fee percentage for overdue balances')}</div>
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
              <Label>{t('admin_fees.late_fee_percent', 'Late fee percent')}</Label>
              <Input
                type="number"
                value={String(settings.lateFeePercent)}
                onChange={(e) => setSetting('fees.late_fee_percent', e.target.value, 'float')}
                disabled={!settings.lateFeeEnabled}
              />
              {savingKey === 'fees.late_fee_percent' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Saving…')}</div> : null}
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
              {t('admin_fees.reset_late_fee_defaults', 'Reset late-fee defaults')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeeSettingsPanel
