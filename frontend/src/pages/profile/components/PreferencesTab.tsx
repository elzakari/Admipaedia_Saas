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
  { value: 'system', label: 'Système', icon: <Palette className="h-4 w-4" /> },
  { value: 'light', label: 'Clair', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Sombre', icon: <Moon className="h-4 w-4" /> },
  { value: 'gradient', label: 'Dégradé', icon: <Palette className="h-4 w-4" /> },
  { value: 'casaos', label: 'CasaOS', icon: <Palette className="h-4 w-4" /> },
];

const TAB_OPTIONS: Array<{ value: ProfileTabKey; label: string }> = [
  { value: 'profile', label: 'Profil' },
  { value: 'security', label: 'Sécurité' },
  { value: 'preferences', label: 'Préférences' },
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
            Thème & Apparence
          </CardTitle>
          <CardDescription>Personnalisez l'apparence et la convivialité de l'application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Thème</Label>
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
            <div className="text-xs text-slate-500 dark:text-slate-400">Actuel : {themeMode}</div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Langue
              </Label>
              <Select
                value={form.language}
                onValueChange={(v) => {
                  setForm(s => ({ ...s, language: v }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">Anglais (English)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format date/heure</Label>
              <Select
                value={form.date_time_format}
                onValueChange={(v) => {
                  setForm(s => ({ ...s, date_time_format: v as any }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatique</SelectItem>
                  <SelectItem value="YYYY-MM-DD">AAAA-MM-JJ</SelectItem>
                  <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Onglet de profil par défaut</Label>
              <Select
                value={form.default_profile_tab}
                onValueChange={(v) => {
                  setForm(s => ({ ...s, default_profile_tab: v as any }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'onglet par défaut" />
                </SelectTrigger>
                <SelectContent>
                  {TAB_OPTIONS.map(tab => (
                    <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Gérez les e-mails que vous recevez.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="notify_product_updates" className="flex flex-col space-y-1">
              <span>Mises à jour du produit</span>
              <span className="font-normal text-xs text-slate-500">Notes de version et annonces de fonctionnalités.</span>
            </Label>
            <Switch
              id="notify_product_updates"
              checked={form.notify_product_updates}
              onCheckedChange={(v) => {
                setForm(s => ({ ...s, notify_product_updates: v }));
                setDirty(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="notify_security_alerts" className="flex flex-col space-y-1">
              <span>Alertes de sécurité</span>
              <span className="font-normal text-xs text-slate-500">Recommandé. Activités importantes du compte.</span>
            </Label>
            <Switch
              id="notify_security_alerts"
              checked={form.notify_security_alerts}
              onCheckedChange={(v) => {
                setForm(s => ({ ...s, notify_security_alerts: v }));
                setDirty(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              {dirty ? 'Modifications non enregistrées' : 'Les préférences sont enregistrées.'}
            </div>
            <Button
              type="button"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
