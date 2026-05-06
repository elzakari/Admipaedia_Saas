import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages, Loader2, Moon, Palette, Save, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { profileService, ProfileTabKey, ThemeMode, UserPreferencesData } from '@/services/profileService';
import { cn } from '@/lib/utils';
import { applyDocumentLanguage, markLanguageOverride } from '@/lib/countryLanguage';

type Props = {
  preferences: UserPreferencesData;
};

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'System', icon: <Palette className="h-4 w-4" /> },
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
  { value: 'gradient', label: 'Gradient', icon: <Palette className="h-4 w-4" /> },
  { value: 'casaos', label: 'CasaOS', icon: <Palette className="h-4 w-4" /> },
];

const TAB_OPTIONS: Array<{ value: ProfileTabKey; label: string }> = [
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
  { value: 'preferences', label: 'Preferences' },
];

export default function PreferencesTab({ preferences }: Props) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();

  const [form, setForm] = React.useState<UserPreferencesData>(preferences);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setForm(preferences);
    setDirty(false);
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return profileService.updatePreferences({
        theme_mode: form.theme_mode,
        language: form.language,
        date_time_format: form.date_time_format,
        default_profile_tab: form.default_profile_tab,
        notify_product_updates: form.notify_product_updates,
        notify_security_alerts: form.notify_security_alerts,
      });
    },
    onSuccess: async (data) => {
      toast.success('Preferences saved');
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      const nextTheme = data?.preferences?.theme_mode;
      if (nextTheme) setThemeMode(nextTheme);
      if (data?.preferences?.language) {
        try {
          markLanguageOverride();
          await i18n.changeLanguage(data.preferences.language);
          applyDocumentLanguage(data.preferences.language);
        } catch {
        }
      }
      setDirty(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to save preferences');
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance & Language
          </CardTitle>
          <CardDescription>Personalize how the app looks and feels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {THEME_OPTIONS.map(opt => {
                const active = form.theme_mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                    )}
                    onClick={() => {
                      setForm(s => ({ ...s, theme_mode: opt.value }));
                      setThemeMode(opt.value);
                      setDirty(true);
                    }}
                    aria-pressed={active}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Current: {themeMode}</div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Language
              </Label>
              <Select
                value={form.language}
                onValueChange={(v) => {
                  setForm(s => ({ ...s, language: v }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date/time format</Label>
              <Select
                value={form.date_time_format}
                onValueChange={(v) => {
                  setForm(s => ({ ...s, date_time_format: v as any }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="12h">12-hour</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default profile tab</Label>
            <Select
              value={form.default_profile_tab}
              onValueChange={(v) => {
                setForm(s => ({ ...s, default_profile_tab: v as ProfileTabKey }));
                setDirty(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control the emails you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Product updates</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Release notes and feature announcements.</div>
            </div>
            <Switch
              checked={form.notify_product_updates}
              onCheckedChange={(checked) => {
                setForm(s => ({ ...s, notify_product_updates: checked }));
                setDirty(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Security alerts</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Recommended. Important account activity.</div>
            </div>
            <Switch
              checked={form.notify_security_alerts}
              onCheckedChange={(checked) => {
                setForm(s => ({ ...s, notify_security_alerts: checked }));
                setDirty(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {dirty ? 'You have unsaved changes.' : 'Preferences are saved.'}
            </div>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
