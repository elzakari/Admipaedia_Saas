import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const StudentSecuritySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('student_settings.security_options', 'Security Options')}</CardTitle>
          <CardDescription>Manage your password and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-500 block mb-1">Password</label>
            <div className="text-sm mb-3">**************</div>
            <Button variant="outline">{t('student_settings.update_password', 'Update Password')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentSecuritySettings;
