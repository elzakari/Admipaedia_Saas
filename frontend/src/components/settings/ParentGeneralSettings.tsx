import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';
import { User, ArrowRight } from 'lucide-react';
import { applyDocumentLanguage, markLanguageOverride } from '@/lib/countryLanguage';

const supportedLanguages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' }
];

const ParentGeneralSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const initialLanguage = useMemo(() => {
    const current = String(i18n.language || 'en').split('-')[0];
    return supportedLanguages.some((l) => l.value === current) ? current : 'en';
  }, [i18n.language]);

  const [language, setLanguage] = useState<string>(initialLanguage);

  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);

  const onChangeLanguage = (value: string) => {
    setLanguage(value);
    markLanguageOverride();
    void i18n.changeLanguage(value);
    applyDocumentLanguage(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('parent_settings.tabs.profile_general', 'Profile & General')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('parent_settings.profile.description', 'View and edit your account information')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            {t('parent_settings.profile.title', 'Profile')}
          </CardTitle>
          <CardDescription>{t('parent_settings.profile.description', 'View and edit your account information')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">{t('parent_settings.profile.name', 'Name')}</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.username || 'Parent'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t('parent_settings.profile.role', 'Role')}</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {user?.role || 'parent'}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate('/profile')}
          >
            {t('parent_settings.profile.open_profile', 'Open Profile')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('parent_settings.language.title', 'Language')}</CardTitle>
          <CardDescription>{t('parent_settings.language.description', 'Choose how ADMIPEDIA is displayed for you')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="preferred-language">{t('parent_settings.language.preferred', 'Preferred language')}</Label>
          <Select value={language} onValueChange={onChangeLanguage}>
            <SelectTrigger id="preferred-language" className="max-w-sm">
              <SelectValue placeholder={t('parent_settings.language.select', 'Select language')} />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentGeneralSettings;
