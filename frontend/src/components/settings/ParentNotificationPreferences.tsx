import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Bell, RefreshCw, Save } from 'lucide-react';
import { useToast } from '../ui/use-toast';

type ParentNotificationPrefs = {
  email: boolean;
  push: boolean;
  feeReminders: boolean;
  academicUpdates: boolean;
  attendanceAlerts: boolean;
  events: boolean;
};

const parentNotificationPrefsStorageNamespace = 'sms.parent.notification_prefs.v1';

const defaultPrefs: ParentNotificationPrefs = {
  email: true,
  push: true,
  feeReminders: true,
  academicUpdates: true,
  attendanceAlerts: true,
  events: true
};

const ParentNotificationPreferences: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(parentNotificationPrefsStorageNamespace);
      if (!raw) return defaultPrefs;
      const parsed = JSON.parse(raw) as Partial<ParentNotificationPrefs>;
      return { ...defaultPrefs, ...parsed };
    } catch {
      return defaultPrefs;
    }
  }, []);

  const [prefs, setPrefs] = useState<ParentNotificationPrefs>(initial);

  useEffect(() => {
    setPrefs(initial);
  }, [initial]);

  const setField = (field: keyof ParentNotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(parentNotificationPrefsStorageNamespace, JSON.stringify(prefs));
      toast({
        title: t('common.success', 'Success'),
        description: t('parent_settings.notifications.saved_toast', 'Your notification preferences have been updated.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPrefs(defaultPrefs);
    localStorage.setItem(parentNotificationPrefsStorageNamespace, JSON.stringify(defaultPrefs));
    toast({
      title: t('common.success', 'Success'),
      description: t('parent_settings.notifications.reset_toast', 'Notification preferences were reset to defaults.')
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('parent_settings.notifications.title', 'Notifications')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('parent_settings.notifications.description', 'Choose what you want to be notified about')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            {t('parent_settings.notifications.delivery', 'Delivery')}
          </CardTitle>
          <CardDescription>{t('parent_settings.notifications.delivery_desc', 'Control how you receive notifications')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            title={t('parent_settings.notifications.email', 'Email')}
            description={t('parent_settings.notifications.email_desc', 'Receive notifications by email')}
            checked={prefs.email}
            onCheckedChange={(v) => setField('email', v)}
          />
          <Row
            title={t('parent_settings.notifications.in_app', 'In-app')}
            description={t('parent_settings.notifications.in_app_desc', 'Show notifications inside ADMIPEDIA')}
            checked={prefs.push}
            onCheckedChange={(v) => setField('push', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('parent_settings.notifications.topics', 'Topics')}</CardTitle>
          <CardDescription>{t('parent_settings.notifications.topics_desc', 'Pick the updates that matter to you')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            title={t('parent_settings.notifications.fee_reminders', 'Fee reminders')}
            description={t('parent_settings.notifications.fee_desc', 'Balances, due dates, and payment confirmations')}
            checked={prefs.feeReminders}
            onCheckedChange={(v) => setField('feeReminders', v)}
          />
          <Row
            title={t('parent_settings.notifications.academic_updates', 'Academic updates')}
            description={t('parent_settings.notifications.academic_desc', 'Report cards and academic announcements')}
            checked={prefs.academicUpdates}
            onCheckedChange={(v) => setField('academicUpdates', v)}
          />
          <Row
            title={t('parent_settings.notifications.attendance_alerts', 'Attendance alerts')}
            description={t('parent_settings.notifications.attendance_desc', 'Absences, late arrivals, and attendance summaries')}
            checked={prefs.attendanceAlerts}
            onCheckedChange={(v) => setField('attendanceAlerts', v)}
          />
          <Row
            title={t('parent_settings.notifications.events', 'Events')}
            description={t('parent_settings.notifications.events_desc', 'PTA meetings, school closures, and calendar events')}
            checked={prefs.events}
            onCheckedChange={(v) => setField('events', v)}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={reset} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('parent_settings.notifications.reset', 'Reset to Defaults')}
        </Button>
        <Button onClick={save} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
          {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? t('parent_settings.notifications.saving', 'Saving...') : t('parent_settings.notifications.save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

function Row({
  title,
  description,
  checked,
  onCheckedChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default ParentNotificationPreferences;
