import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import GeneralSettings from '@/components/settings/GeneralSettings';
import UserRoleManagement from '@/components/settings/UserRoleManagement';
import AcademicConfiguration from '@/components/settings/AcademicConfiguration';
import SecuritySettings from '@/components/settings/SecuritySettings';
import BackupSettings from '@/components/settings/BackupSettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AuditLogs from '@/components/settings/AuditLogs';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

type SettingsTab = 
  | 'general' 
  | 'users' 
  | 'academic' 
  | 'security' 
  | 'backup' 
  | 'theme' 
  | 'audit';

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab = 'general' }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const categories = [
    { id: 'general', name: t('admin_settings.general', 'Général'), icon: 'settings' },
    { id: 'users', name: t('admin_settings.users', 'Utilisateurs & Rôles'), icon: 'users' },
    { id: 'academic', name: t('admin_settings.academic', 'Académique'), icon: 'graduation' },
    { id: 'security', name: t('admin_settings.security', 'Sécurité'), icon: 'shield' },
    { id: 'backup', name: t('admin_settings.backup', 'Sauvegarde & Restauration'), icon: 'database' },
    { id: 'theme', name: t('admin_settings.theme', 'Thème'), icon: 'palette' },
    { id: 'audit', name: t('admin_settings.audit', 'Journaux d\'audit'), icon: 'file' }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin_settings.title', 'Paramètres')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.description', 'Configurez et personnalisez votre expérience ADMIPAEDIA')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsSidebar categories={categories} activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as SettingsTab)} />
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="w-full">
                <TabsContent value="general" className="p-6 m-0">
                  <GeneralSettings />
                </TabsContent>
                <TabsContent value="users" className="p-6 m-0">
                  <UserRoleManagement />
                </TabsContent>
                <TabsContent value="academic" className="p-6 m-0">
                  <AcademicConfiguration />
                </TabsContent>
                <TabsContent value="security" className="p-6 m-0">
                  <SecuritySettings />
                </TabsContent>
                <TabsContent value="backup" className="p-6 m-0">
                  <BackupSettings />
                </TabsContent>
                <TabsContent value="theme" className="p-6 m-0">
                  <ThemeSettings />
                </TabsContent>
                <TabsContent value="audit" className="p-6 m-0">
                  <AuditLogs />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
