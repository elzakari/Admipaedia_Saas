import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/common/tabs';
import { Card, CardContent } from '@components/common/card';
import GeneralSettings from '@components/settings/GeneralSettings';
import UserRoleManagement from '@components/settings/UserRoleManagement';
import AcademicConfiguration from '@components/settings/AcademicConfiguration';
import NotificationSettings from '@components/settings/NotificationSettings';
import AISettings from '@components/settings/AISettings';
import IntegrationSettings from '@components/settings/IntegrationSettings';
import SecuritySettings from '@components/settings/SecuritySettings';
import BackupSettings from '@components/settings/BackupSettings';
import ThemeSettings from '@components/settings/ThemeSettings';
import AuditLogs from '@components/settings/AuditLogs';
import SettingsSidebar from '@components/settings/SettingsSidebar';

type SettingsTab = 
  | 'general' 
  | 'users' 
  | 'academic' 
  | 'notifications' 
  | 'ai' 
  | 'integrations' 
  | 'security' 
  | 'backup' 
  | 'theme' 
  | 'audit';

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab = 'general' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure and customize your ADMIPAEDIA experience</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
                <TabsContent value="notifications" className="p-6 m-0">
                  <NotificationSettings />
                </TabsContent>
                <TabsContent value="ai" className="p-6 m-0">
                  <AISettings />
                </TabsContent>
                <TabsContent value="integrations" className="p-6 m-0">
                  <IntegrationSettings />
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