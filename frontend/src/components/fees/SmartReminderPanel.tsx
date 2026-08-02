import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Send, Plus } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { feesService } from '../../services/feesService'
import { formatCurrency } from '../../lib/utils'

const SmartReminderPanel = () => {
  const { t } = useTranslation();
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    audience: 'overdue',
    testEmail: '',
    testPhone: ''
  })
  const [batchPreview, setBatchPreview] = useState<any | null>(null)

  const { data: settingsResp } = useQuery({
    queryKey: ['fees', 'settings', 'reminders'],
    queryFn: async () => {
      const res = await api.get('/settings/', { params: { keys: ['fees.reminder_days_before_due', 'fees.reminder_channels'] } })
      return res.data?.data || {}
    }
  })

  const reminderChannels = useMemo(() => {
    const v = String(settingsResp?.['fees.reminder_channels'] || 'sms,email')
    return v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }, [settingsResp])

  const { data: overdueResp } = useQuery({
    queryKey: ['fees', 'overdue', 'reminders'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 50 })
  })

  const overdueFees = Array.isArray(overdueResp?.overdue_fees) ? overdueResp.overdue_fees : []
  const overdueCount = overdueFees.length
  const totalOverdueBalance = overdueFees.reduce((sum, fee) => sum + Number(fee.balance || 0), 0)
  const longestOverdueDays = overdueFees.reduce((max, fee) => Math.max(max, Number(fee.days_overdue || 0)), 0)
  const topOverdueAccounts = useMemo(
    () => overdueFees
      .slice()
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 3),
    [overdueFees]
  )

  const sendMutation = useMutation({
    mutationFn: async () => {
      return feesService.sendReminderBatch({
        audience: sendForm.audience,
        channels: reminderChannels,
        test_email: sendForm.testEmail.trim() || undefined,
        test_phone: sendForm.testPhone.trim() || undefined
      })
    },
    onSuccess: (data: any) => {
      setBatchPreview(data)
      toast.success(t('admin_fees.reminder_batch_prepared', 'Reminder batch prepared for {{count}} recipient(s)', { count: data?.count || 0 })) 
      setSendOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('admin_fees.failed_send_reminders', 'Failed to send reminders'))
  })

  useEffect(() => {
    const onCreate = (e: any) => {
      if (e?.detail?.tab !== 'reminders') return
      setSendOpen(true)
    }
    window.addEventListener('fees:create', onCreate)
    return () => window.removeEventListener('fees:create', onCreate)
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle>{t('admin_fees.smart_reminders', 'Rappels intelligents')}</CardTitle>
            <CardDescription>{t('admin_fees.smart_reminders_desc', 'Préparer et réviser les lots de rappels manuels pour les soldes de frais impayés')}</CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white dark:bg-slate-800" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              {t('admin_fees.run_reminder_batch', 'Lancer un lot de rappels')}
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              window.dispatchEvent(new CustomEvent('fees:navigate', { detail: { tab: 'settings' } }))
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin_fees.reminder_settings', 'Paramètres de rappel')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-gray-50 dark:bg-slate-800 p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.overdue_fees', 'Frais en retard')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{overdueCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.records_need_attention', '{{count}} dossiers nécessitent de l\'attention', { count: overdueCount })}</div>
            </div>
            <div className="rounded-lg border bg-gray-50 dark:bg-slate-800 p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.outstanding_balance', 'Solde impayé')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalOverdueBalance, 'USD')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.reminder_channels', 'Canaux')}: {reminderChannels.join(', ') || '—'}</div>
            </div>
            <div className="rounded-lg border bg-gray-50 dark:bg-slate-800 p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.longest_overdue', 'Plus grand retard')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{longestOverdueDays}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.days_label', 'jours')}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.high_priority_accounts', 'Comptes prioritaires')}</div>
              <div className="mt-3 space-y-3">
                {topOverdueAccounts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('admin_fees.no_overdue_accounts', 'Aucun compte en retard pour le moment.')}</div>
                ) : topOverdueAccounts.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.student_name || `Étudiant ${item.student_id}`}</div>
                      <div className="text-xs text-slate-500">{item.class_name || '—'} • {item.days_overdue || 0} {t('admin_fees.days_label', 'jours')}</div>
                    </div>
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(Number(item.balance || 0), item.currency || 'USD')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.last_batch_preview', 'Aperçu du dernier lot')}</div>
              <div className="mt-3 space-y-3">
                {!batchPreview ? (
                  <div className="text-sm text-muted-foreground">{t('admin_fees.batch_preview_empty', 'Lancer un lot de rappels pour prévisualiser les destinataires, les soldes et les canaux configurés.')}</div>
                ) : (
                  <>
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{batchPreview.message || t('admin_fees.batch_preview_ready', 'Batch preview ready')}</div>
                      <div className="mt-1 text-slate-600 dark:text-slate-300">
                        {t('admin_fees.reminder_batch_summary', '{{count}} recipients across {{records}} overdue records', {
                          count: batchPreview.count || 0,
                          records: batchPreview.fee_record_count || 0
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('admin_fees.delivery_mode_label', 'Delivery mode')}: {batchPreview.delivery_mode || 'preview_only'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('admin_fees.configured_channels', 'Configured: {{channels}}', { channels: (batchPreview.channels || []).join(', ') || '—' })}
                    </div>
                    <div className="space-y-2">
                      {(batchPreview.sample_recipients || []).map((recipient: any) => (
                        <div key={recipient.student_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium">{recipient.student_name}</div>
                            <div className="text-xs text-muted-foreground">{recipient.class_name || '—'} • {recipient.days_overdue || 0} {t('admin_fees.days_label', 'days')}</div>
                          </div>
                          <div className="font-semibold">{formatCurrency(Number(recipient.balance || 0), 'USD')}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('admin_fees.run_reminder_batch_dialog', 'Run reminder batch')}</DialogTitle>
            <DialogDescription>{t('admin_fees.run_reminder_batch_desc', 'Prepare reminders for students with outstanding balances using the configured channels.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin_fees.audience', 'Audience')}</Label>
              <Select value={sendForm.audience} onValueChange={(v) => setSendForm((p) => ({ ...p, audience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="overdue">{t('admin_fees.overdue_fees', 'Overdue fees')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">{t('admin_fees.eligible_recipients', 'Eligible recipients: {{count}}', { count: overdueCount })}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin_fees.test_email_optional', 'Test email (optional)')}</Label>
                <Input value={sendForm.testEmail} onChange={(e) => setSendForm((p) => ({ ...p, testEmail: e.target.value }))} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_fees.test_phone_optional', 'Test phone (optional)')}</Label>
                <Input value={sendForm.testPhone} onChange={(e) => setSendForm((p) => ({ ...p, testPhone: e.target.value }))} placeholder="+233201234567" />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">{t('admin_fees.channels', 'Channels')}</div>
              <div className="text-xs text-muted-foreground">{t('admin_fees.configured_channels', 'Configured: {{channels}}', { channels: reminderChannels.join(', ') || '—' })}</div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
              {t('admin_fees.run_batch_btn', 'Run Batch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartReminderPanel;
