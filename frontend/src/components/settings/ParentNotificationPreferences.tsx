import React, { useEffect, useMemo, useState } from 'react';
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

const storageKey = 'admipaedia.parent.notification_prefs.v1';

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
  const [isSaving, setIsSaving] = useState(false);

  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
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
      localStorage.setItem(storageKey, JSON.stringify(prefs));
      toast({
        title: 'Saved',
        description: 'Your notification preferences have been updated.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPrefs(defaultPrefs);
    localStorage.setItem(storageKey, JSON.stringify(defaultPrefs));
    toast({
      title: 'Reset',
      description: 'Notification preferences were reset to defaults.'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-gray-500 dark:text-gray-400">Choose what you want to be notified about</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            Delivery
          </CardTitle>
          <CardDescription>Control how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            title="Email"
            description="Receive notifications by email"
            checked={prefs.email}
            onCheckedChange={(v) => setField('email', v)}
          />
          <Row
            title="In-app"
            description="Show notifications inside ADMIPEDIA"
            checked={prefs.push}
            onCheckedChange={(v) => setField('push', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>Pick the updates that matter to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            title="Fee reminders"
            description="Balances, due dates, and payment confirmations"
            checked={prefs.feeReminders}
            onCheckedChange={(v) => setField('feeReminders', v)}
          />
          <Row
            title="Academic updates"
            description="Report cards and academic announcements"
            checked={prefs.academicUpdates}
            onCheckedChange={(v) => setField('academicUpdates', v)}
          />
          <Row
            title="Attendance alerts"
            description="Absences, late arrivals, and attendance summaries"
            checked={prefs.attendanceAlerts}
            onCheckedChange={(v) => setField('attendanceAlerts', v)}
          />
          <Row
            title="Events"
            description="PTA meetings, school closures, and calendar events"
            checked={prefs.events}
            onCheckedChange={(v) => setField('events', v)}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={reset} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={save} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
          {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving…' : 'Save'}
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
