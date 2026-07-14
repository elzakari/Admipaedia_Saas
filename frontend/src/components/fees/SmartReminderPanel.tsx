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

const SmartReminderPanel = () => {
  const { t } = useTranslation();
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    audience: 'overdue',
    testEmail: '',
    testPhone: ''
  })

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

  const overdueCount = Array.isArray(overdueResp?.overdue_fees) ? overdueResp.overdue_fees.length : 0

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        audience: sendForm.audience,
        channels: reminderChannels,
        test_email: sendForm.testEmail.trim() || undefined,
        test_phone: sendForm.testPhone.trim() || undefined
      }
      const res = await api.post('/administration/fee-reminders/send', payload)
      return res.data
    },
    onSuccess: (data: any) => {
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
            <CardTitle>{t('admin_fees.smart_reminders', 'Smart Reminders')}</CardTitle>
            <CardDescription>{t('admin_fees.smart_reminders_desc', 'Prepare and review manual reminder batches for outstanding fee balances')}</CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white dark:bg-slate-800" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              {t('admin_fees.run_reminder_batch', 'Run Reminder Batch')}
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              window.dispatchEvent(new CustomEvent('fees:navigate', { detail: { tab: 'settings' } }))
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin_fees.reminder_settings', 'Reminder Settings')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg border bg-gray-50 dark:bg-slate-800 p-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.overdue_fees', 'Overdue fees')}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.records_need_attention', '{{count}} records need attention', { count: overdueCount })}</div>
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
