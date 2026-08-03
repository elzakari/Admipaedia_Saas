import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Bell, RefreshCw, Save } from 'lucide-react';
import { useToast } from '../ui/use-toast';

type TeacherNotificationPrefs = {
  email: boolean;
  inApp: boolean;
  announcements: boolean;
  assignmentSubmissions: boolean;
  timetableChanges: boolean;
};

const teacherNotificationPrefsStorageNamespace = 'sms.teacher.notification_prefs.v1';

const defaults: TeacherNotificationPrefs = {
  email: true,
  inApp: true,
  announcements: true,
  assignmentSubmissions: true,
  timetableChanges: true
};

const TeacherNotificationPreferences: React.FC = () => {
  const { toast } = useToast();

  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(teacherNotificationPrefsStorageNamespace);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<TeacherNotificationPrefs>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }, []);

  const [prefs, setPrefs] = useState<TeacherNotificationPrefs>(initial);
  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: keyof TeacherNotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(teacherNotificationPrefsStorageNamespace, JSON.stringify(prefs));
      toast({ title: 'Saved', description: 'Your notification preferences have been updated.' });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPrefs(defaults);
    localStorage.setItem(teacherNotificationPrefsStorageNamespace, JSON.stringify(defaults));
    toast({ title: 'Reset', description: 'Notification preferences were reset to defaults.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-gray-500 dark:text-gray-400">Choisissez ce dont vous souhaitez être informé</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            Modes de réception
          </CardTitle>
          <CardDescription>Gérez la façon dont vous recevez vos notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row title="E-mail" description="Recevoir les notifications par e-mail" checked={prefs.email} onCheckedChange={(v) => setField('email', v)} />
          <Row title="Dans l'application" description="Afficher les notifications dans ADMIPAEDIA" checked={prefs.inApp} onCheckedChange={(v) => setField('inApp', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sujets</CardTitle>
          <CardDescription>Choisissez les mises à jour qui vous réintéressent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row title="Annonces" description="Annonces et communiqués de l'établissement" checked={prefs.announcements} onCheckedChange={(v) => setField('announcements', v)} />
          <Row title="Devoirs rendus" description="Lorsque les élèves soumettent ou re-soumettent un travail" checked={prefs.assignmentSubmissions} onCheckedChange={(v) => setField('assignmentSubmissions', v)} />
          <Row title="Changements d'emploi du temps" description="Modifications apportées à votre emploi du temps" checked={prefs.timetableChanges} onCheckedChange={(v) => setField('timetableChanges', v)} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={reset} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />
          Réinitialiser aux valeurs par défaut
        </Button>
        <Button onClick={save} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
          {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
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

export default TeacherNotificationPreferences;

