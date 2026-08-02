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
          <CardTitle className="text-lg font-semibold">{t('admin_fees.fee_settings', 'Paramètres des frais')}</CardTitle>
          <CardDescription>{t('common.loading', 'Chargement…')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.general', 'Général')}</CardTitle>
          <CardDescription>{t('admin_fees.general_settings_desc', 'Valeurs par défaut utilisées pour les frais, factures et paiements. La devise suit automatiquement le profil de l\'école.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin_fees.school_currency', 'Devise de l\'école')}</Label>
              <Input value={schoolCurrency} disabled readOnly />
              <div className="text-xs text-muted-foreground">{t('admin_fees.school_currency_desc', 'Mettez à jour la devise du profil de l\'école pour modifier les frais, modèles, factures et soldes des parents sur toute la plateforme.')}</div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-sm font-medium">{t('admin_fees.allow_partial_payments', 'Autoriser les paiements partiels')}</div>
                <div className="text-xs text-muted-foreground">{t('admin_fees.allow_partial_payments_desc', 'Permettre aux paiements de réduire le solde sans payer le montant total')}</div>
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
              {t('admin_fees.reset_general_defaults', 'Réinitialiser les paramètres généraux')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.reminders', 'Rappels')}</CardTitle>
          <CardDescription>{t('admin_fees.reminders_desc', 'Contrôles pour les rappels manuels dans l\'onglet Rappels')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin_fees.days_before_due', 'Jours avant la date d\'échéance')}</Label>
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
                  <Save className="h-4 w-4 mr-2" /> {t('common.save', 'Enregistrer')}
                </Button>
              </div>
              {savingKey === 'fees.reminder_days_before_due' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Enregistrement…')}</div> : null}
            </div>

            <div className="space-y-2">
              <Label>{t('admin_fees.channels_label', 'Canaux (séparés par des virgules)')}</Label>
              <Input
                value={settings.reminderChannels}
                onChange={(e) => setSetting('fees.reminder_channels', e.target.value, 'string')}
                placeholder="sms,email"
              />
              {savingKey === 'fees.reminder_channels' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Enregistrement…')}</div> : null}
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
              {t('admin_fees.reset_reminder_defaults', 'Réinitialiser les paramètres de rappel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin_fees.late_fees', 'Frais de retard')}</CardTitle>
          <CardDescription>{t('admin_fees.late_fees_desc', 'Politique optionnelle de frais de retard (affichage + application manuelle)')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="text-sm font-medium">{t('admin_fees.enable_late_fee', 'Activer les frais de retard')}</div>
              <div className="text-xs text-muted-foreground">{t('admin_fees.enable_late_fee_desc', 'Ajoute un pourcentage de frais de retard aux soldes impayés')}</div>
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
              <Label>{t('admin_fees.late_fee_percent', 'Pourcentage des frais de retard')}</Label>
              <Input
                type="number"
                value={String(settings.lateFeePercent)}
                onChange={(e) => setSetting('fees.late_fee_percent', e.target.value, 'float')}
                disabled={!settings.lateFeeEnabled}
              />
              {savingKey === 'fees.late_fee_percent' ? <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{t('common.saving', 'Enregistrement…')}</div> : null}
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
              {t('admin_fees.reset_late_fee_defaults', 'Réinitialiser les frais de retard')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeeSettingsPanel
