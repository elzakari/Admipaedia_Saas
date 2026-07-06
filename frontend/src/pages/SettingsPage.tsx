import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import GeneralSettings from '../components/settings/GeneralSettings';
import UserRoleManagement from '../components/settings/UserRoleManagement';
import AcademicConfiguration from '../components/settings/AcademicConfiguration';
import NotificationSettings from '../components/settings/NotificationSettings';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import BackupSettings from '../components/settings/BackupSettings';
import ThemeSettings from '../components/settings/ThemeSettings';
import AuditLogs from '../components/settings/AuditLogs';
import AdmissionSettings from '../components/settings/AdmissionSettings';
import NotificationLogs from '../components/settings/NotificationLogs';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import ParentGeneralSettings from '../components/settings/ParentGeneralSettings';
import ParentNotificationPreferences from '../components/settings/ParentNotificationPreferences';
import PrivacySettings from '../components/settings/PrivacySettings';
import StudentProfileSettings from '../components/settings/StudentProfileSettings';
import StudentPreferencesSettings from '../components/settings/StudentPreferencesSettings';
import StudentSecuritySettings from '../components/settings/StudentSecuritySettings';
import TeacherGeneralSettings from '../components/settings/TeacherGeneralSettings';
import TeacherNotificationPreferences from '../components/settings/TeacherNotificationPreferences';
import TeacherSecuritySettings from '../components/settings/TeacherSecuritySettings';
import TeacherPrivacySettings from '../components/settings/TeacherPrivacySettings';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const allowedTabs = useMemo(() => {
    if (user?.role === 'parent') return ['general', 'notifications', 'theme', 'privacy'] as const;
    if (user?.role === 'student') return ['profile', 'preferences', 'security'] as const;
    if (user?.role === 'teacher') return ['general', 'notifications', 'theme', 'privacy', 'security'] as const;
    return ['general', 'users', 'academic', 'admissions', 'notifications', 'notification-logs', 'integrations', 'security', 'backup', 'theme', 'audit'] as const;
  }, [user?.role]);

  const paramTab = searchParams.get('tab');
  const defaultTab = allowedTabs[0];
  const initialTab = paramTab && (allowedTabs as readonly string[]).includes(paramTab) ? paramTab : defaultTab;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const nextTab = tab && (allowedTabs as readonly string[]).includes(tab) ? tab : defaultTab;
    if (nextTab !== activeTab) setActiveTab(nextTab);
    if (tab !== nextTab) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      }, { replace: true });
    }
  }, [activeTab, allowedTabs, defaultTab, searchParams, setSearchParams]);

  const categories = useMemo(() => {
    if (user?.role === 'parent') {
      return [
        { id: 'general', name: t('parent_settings.tabs.profile_general', 'Profile & General'), icon: 'user' },
        { id: 'notifications', name: t('parent_settings.tabs.notifications', 'Notifications'), icon: 'bell' },
        { id: 'theme', name: t('parent_settings.tabs.theme', 'Theme'), icon: 'palette' },
        { id: 'privacy', name: t('parent_settings.tabs.privacy', 'Privacy'), icon: 'shield' }
      ];
    }

    if (user?.role === 'student') {
      return [
        { id: 'profile', name: t('student_settings.profile_parameters', 'Profile Parameters'), icon: 'user' },
        { id: 'preferences', name: t('student_settings.system_preferences', 'System Preferences'), icon: 'settings' },
        { id: 'security', name: t('student_settings.security_options', 'Security Options'), icon: 'lock' }
      ];
    }

    if (user?.role === 'teacher') {
      return [
        { id: 'general', name: 'Profile & General', icon: 'user' },
        { id: 'notifications', name: 'Notifications', icon: 'bell' },
        { id: 'theme', name: 'Theme', icon: 'palette' },
        { id: 'privacy', name: 'Privacy', icon: 'shield' },
        { id: 'security', name: 'Security', icon: 'lock' }
      ];
    }

    return [
      { id: 'general', name: 'General', icon: 'settings' },
      { id: 'users', name: 'User & Roles', icon: 'users' },
      { id: 'academic', name: 'Academic', icon: 'graduation' },
      { id: 'admissions', name: 'Admissions', icon: 'file' },
      { id: 'notifications', name: 'Notifications', icon: 'bell' },
      { id: 'notification-logs', name: 'Notification Logs', icon: 'notification-logs' },
      { id: 'integrations', name: 'Integrations', icon: 'integrations' },
      { id: 'security', name: 'Security', icon: 'lock' },
      { id: 'backup', name: 'Backup & Restore', icon: 'database' },
      { id: 'theme', name: 'Theme', icon: 'palette' },
      { id: 'audit', name: 'Audit Logs', icon: 'file' }
    ];
  }, [user?.role, t]);

  const onTabChange = (nextTab: string) => {
    if (!(allowedTabs as readonly string[]).includes(nextTab)) return;
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user?.role === 'student' ? t('student_settings.title', 'Settings') : t('parent_settings.title', 'Settings')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{user?.role === 'student' ? t('student_settings.subtitle', 'Configure your preferences and profile') : t('parent_settings.subtitle', 'Configure and customize your ADMIPAEDIA experience')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsSidebar categories={categories} activeTab={activeTab} setActiveTab={onTabChange} />
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsContent value="general" className="p-6 m-0">
                  {user?.role === 'parent'
                    ? <ParentGeneralSettings />
                    : user?.role === 'teacher'
                      ? <TeacherGeneralSettings />
                    : <GeneralSettings />}
                </TabsContent>

                <TabsContent value="profile" className="p-6 m-0">
                  {user?.role === 'student' && <StudentProfileSettings />}
                </TabsContent>
                <TabsContent value="preferences" className="p-6 m-0">
                  {user?.role === 'student' && <StudentPreferencesSettings />}
                </TabsContent>

                <TabsContent value="users" className="p-6 m-0">
                  <UserRoleManagement />
                </TabsContent>
                <TabsContent value="academic" className="p-6 m-0">
                  <AcademicConfiguration />
                </TabsContent>
                <TabsContent value="admissions" className="p-6 m-0">
                  <AdmissionSettings />
                </TabsContent>
                <TabsContent value="notifications" className="p-6 m-0">
                  {user?.role === 'parent'
                    ? <ParentNotificationPreferences />
                    : user?.role === 'teacher'
                      ? <TeacherNotificationPreferences />
                    : <NotificationSettings />}
                </TabsContent>
                <TabsContent value="integrations" className="p-6 m-0">
                  <IntegrationSettings />
                </TabsContent>
                <TabsContent value="security" className="p-6 m-0">
                  {user?.role === 'student'
                    ? <StudentSecuritySettings />
                    : user?.role === 'teacher'
                      ? <TeacherSecuritySettings />
                      : <SecuritySettings />}
                </TabsContent>
                <TabsContent value="backup" className="p-6 m-0">
                  <BackupSettings />
                </TabsContent>
                <TabsContent value="theme" className="p-6 m-0">
                  <ThemeSettings />
                </TabsContent>
                <TabsContent value="privacy" className="p-6 m-0">
                  {user?.role === 'teacher'
                      ? <TeacherPrivacySettings />
                      : <PrivacySettings />}
                </TabsContent>
                <TabsContent value="audit" className="p-6 m-0">
                  <AuditLogs />
                </TabsContent>
                <TabsContent value="notification-logs" className="p-6 m-0">
                  <NotificationLogs />
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
