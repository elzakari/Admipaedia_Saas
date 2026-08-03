import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Shield, ExternalLink, RefreshCw, Save } from 'lucide-react';
import { useToast } from '../ui/use-toast';

type PrivacyPrefs = {
  analytics: boolean;
  personalization: boolean;
  shareUsageData: boolean;
};

const teacherPrivacyPrefsStorageNamespace = 'sms.teacher.privacy_prefs.v1';

const defaults: PrivacyPrefs = {
  analytics: true,
  personalization: true,
  shareUsageData: false
};

const TeacherPrivacySettings: React.FC = () => {
  const { toast } = useToast();

  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(teacherPrivacyPrefsStorageNamespace);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<PrivacyPrefs>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }, []);

  const [prefs, setPrefs] = useState<PrivacyPrefs>(initial);
  const [isSaving, setIsSaving] = useState(false);

  const setField = (field: keyof PrivacyPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(teacherPrivacyPrefsStorageNamespace, JSON.stringify(prefs));
      toast({ title: 'Saved', description: 'Your privacy preferences have been updated.' });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPrefs(defaults);
    localStorage.setItem(teacherPrivacyPrefsStorageNamespace, JSON.stringify(defaults));
    toast({ title: 'Reset', description: 'Privacy preferences were reset to defaults.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Confidentialité</h2>
        <p className="text-gray-500 dark:text-gray-400">Gérez l'utilisation de vos données dans l'application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Préférences
          </CardTitle>
          <CardDescription>Ces paramètres s'appliquent uniquement à votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row title="Statistiques & Analytique" description="Autoriser les données analytiques anonymes pour améliorer l'application" checked={prefs.analytics} onCheckedChange={(v) => setField('analytics', v)} />
          <Row title="Personnalisation" description="Personnaliser le contenu comme les raccourcis et recommandations" checked={prefs.personalization} onCheckedChange={(v) => setField('personalization', v)} />
          <Row title="Partager les données d'utilisation" description="Partager les données de diagnostic étendues en cas d'incident" checked={prefs.shareUsageData} onCheckedChange={(v) => setField('shareUsageData', v)} />

          <div className="flex items-center gap-2 text-sm">
            <a href="/privacy" className="inline-flex items-center text-indigo-600 hover:text-indigo-700" target="_blank" rel="noreferrer">
              Lire la Politique de confidentialité
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
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

export default TeacherPrivacySettings;

