import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const StudentPreferencesSettings: React.FC = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('student_settings.system_preferences', 'System Preferences')}</CardTitle>
          <CardDescription>Configure localization and system preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Language Preferences</h3>
            <div className="flex gap-3">
              <Button 
                variant={i18n.language === 'en' ? 'default' : 'outline'} 
                onClick={() => changeLanguage('en')}
              >
                English
              </Button>
              <Button 
                variant={i18n.language === 'fr' ? 'default' : 'outline'} 
                onClick={() => changeLanguage('fr')}
              >
                Français
              </Button>
              <Button 
                variant={i18n.language === 'ee' ? 'default' : 'outline'} 
                onClick={() => changeLanguage('ee')}
              >
                Eʋegbe (Ewe)
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Language switching applies immediately without reloading.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPreferencesSettings;
