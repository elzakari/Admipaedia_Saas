import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const parentPrivacyPrefsStorageNamespace = 'sms.parent.privacy_prefs.v1';

const defaults: PrivacyPrefs = {
  analytics: true,
  personalization: true,
  shareUsageData: false
};

const PrivacySettings: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(parentPrivacyPrefsStorageNamespace);
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
      localStorage.setItem(parentPrivacyPrefsStorageNamespace, JSON.stringify(prefs));
      toast({
        title: t('common.success', 'Success'),
        description: t('parent_settings.notifications.saved_toast', 'Your privacy preferences have been updated.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setPrefs(defaults);
    localStorage.setItem(parentPrivacyPrefsStorageNamespace, JSON.stringify(defaults));
    toast({
      title: t('common.success', 'Success'),
      description: t('parent_settings.notifications.reset_toast', 'Privacy preferences were reset to defaults.')
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('parent_settings.privacy.title', 'Privacy')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('parent_settings.privacy.description', 'Control how your data is used in the app')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            {t('parent_settings.privacy.preferences', 'Preferences')}
          </CardTitle>
          <CardDescription>{t('parent_settings.privacy.pref_desc', 'These settings apply only to your account')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            title={t('parent_settings.privacy.analytics', 'Analytics')}
            description={t('parent_settings.privacy.analytics_desc', 'Allow anonymous analytics to improve the app')}
            checked={prefs.analytics}
            onCheckedChange={(v) => setField('analytics', v)}
          />
          <Row
            title={t('parent_settings.privacy.personalization', 'Personalization')}
            description={t('parent_settings.privacy.personalization_desc', 'Personalize content like shortcuts and recommendations')}
            checked={prefs.personalization}
            onCheckedChange={(v) => setField('personalization', v)}
          />
          <Row
            title={t('parent_settings.privacy.share_data', 'Share usage data')}
            description={t('parent_settings.privacy.share_desc', 'Share extended diagnostic data when issues occur')}
            checked={prefs.shareUsageData}
            onCheckedChange={(v) => setField('shareUsageData', v)}
          />

          <div className="flex items-center gap-2 text-sm">
            <a
              href="/privacy"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700"
              target="_blank"
              rel="noreferrer"
            >
              {t('parent_settings.privacy.read_policy', 'Read Privacy Policy')}
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
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

export default PrivacySettings;
