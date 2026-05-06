import React, { useEffect, useMemo, useState } from 'react'
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
      toast.success(`Reminder sent (${data?.count || 0} recipients)`) 
      setSendOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to send reminders')
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
            <CardTitle>Smart Reminders</CardTitle>
            <CardDescription>Automate fee payment reminders and notifications</CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white dark:bg-slate-800" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Manual Reminder
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              window.dispatchEvent(new CustomEvent('fees:navigate', { detail: { tab: 'settings' } }))
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Reminder Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg border bg-gray-50 dark:bg-slate-800 p-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">Overdue fees</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{overdueCount} records need attention</div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send manual reminder</DialogTitle>
            <DialogDescription>Send a reminder to students with outstanding balances.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={sendForm.audience} onValueChange={(v) => setSendForm((p) => ({ ...p, audience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="overdue">Overdue fees</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Recipients: {overdueCount}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test email (optional)</Label>
                <Input value={sendForm.testEmail} onChange={(e) => setSendForm((p) => ({ ...p, testEmail: e.target.value }))} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Test phone (optional)</Label>
                <Input value={sendForm.testPhone} onChange={(e) => setSendForm((p) => ({ ...p, testPhone: e.target.value }))} placeholder="+233201234567" />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Channels</div>
              <div className="text-xs text-muted-foreground">Configured: {reminderChannels.join(', ') || '—'}</div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartReminderPanel;
