import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Clock, 
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { settingsService } from '../../services';

interface NotificationSettings {
  // Email Settings
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: string;
  fromEmail: string;
  fromName: string;
  
  // SMS Settings
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  
  // Notification Types
  studentRegistration: boolean;
  examResults: boolean;
  feePayment: boolean;
  attendanceAlerts: boolean;
  disciplinaryActions: boolean;
  generalAnnouncements: boolean;
  
  // Recipients
  notifyStudents: boolean;
  notifyParents: boolean;
  notifyTeachers: boolean;
  notifyAdmin: boolean;
  
  // Timing
  sendImmediately: boolean;
  dailyDigest: boolean;
  digestTime: string;
  quietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const NotificationSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('email');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const [settings, setSettings] = useState<NotificationSettings>({
    // Email Settings
    emailEnabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    fromEmail: 'noreply@admipaedia-academy.edu.gh',
    fromName: 'ADMIPAEDIA Academy',
    
    // SMS Settings
    smsEnabled: true,
    smsProvider: 'twilio',
    smsApiKey: '',
    smsSenderId: 'ADMIPAEDIA',
    
    // Notification Types
    studentRegistration: true,
    examResults: true,
    feePayment: true,
    attendanceAlerts: true,
    disciplinaryActions: true,
    generalAnnouncements: true,
    
    // Recipients
    notifyStudents: true,
    notifyParents: true,
    notifyTeachers: true,
    notifyAdmin: true,
    
    // Timing
    sendImmediately: true,
    dailyDigest: false,
    digestTime: '08:00',
    quietHours: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  });

  // Fetch current settings
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => settingsService.getNotificationSettings(),
  } as any);

  // Fetch current status and credits balance
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['tenant-notification-status'],
    queryFn: () => settingsService.getTenantNotificationStatus(),
  } as any);

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: NotificationSettings) => settingsService.updateNotificationSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('school_settings.updated_title', 'Settings Updated'),
        description: t('admin_settings.updated_desc', 'Notification settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('school_settings.update_failed', 'Failed to update settings'),
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const renderGatewayStatus = (type: 'email' | 'sms') => {
    const data = statusData?.[type];
    if (!data) return null;
    
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
              Platform {type === 'email' ? 'Mail' : 'SMS'} Gateway: {data.status}
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Centrally managed by Super Admin
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900 px-3 py-1.5 rounded-md shadow-sm text-center">
          <span className="text-xs text-zinc-500 block">Remaining Credits</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {data.remaining}
          </span>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingSettings || isLoadingStatus;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.notifications_alerts', 'Notifications & Alerts')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.notifications_alerts_desc', 'Configure how and when notifications are sent')}</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          {updateSettingsMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettingsMutation.isPending ? t('common.saving', 'Saving...') : t('school_settings.save_changes', 'Save Changes')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="email" className="flex items-center gap-2 min-w-[120px]">
            <Mail className="h-4 w-4" />
            {t('admin_settings.email', 'Email')}
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2 min-w-[120px]">
            <MessageSquare className="h-4 w-4" />
            {t('admin_settings.sms', 'SMS')}
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2 min-w-[180px]">
            <Bell className="h-4 w-4" />
            {t('admin_settings.notification_types', 'Notification Types')}
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-2 min-w-[180px]">
            <Clock className="h-4 w-4" />
            {t('admin_settings.timing_delivery', 'Timing & Delivery')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('admin_settings.email_config', 'Email Configuration')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.email_config_desc', 'Configure your email server settings for sending notifications')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderGatewayStatus('email')}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled">{t('admin_settings.enable_email_notifications', 'Enable Email Notifications')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.send_notifications_via_email', 'Send notifications via email')}
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => handleInputChange('emailEnabled', checked)}
                />
              </div>

              {settings.emailEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-email">{t('admin_settings.from_email', 'From Email')}</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={settings.fromEmail}
                        onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                        placeholder="noreply@your-school.edu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">{t('admin_settings.from_name', 'From Name')}</Label>
                      <Input
                        id="from-name"
                        value={settings.fromName}
                        onChange={(e) => handleInputChange('fromName', e.target.value)}
                        placeholder="Your School Name"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium bg-blue-50 dark:bg-blue-900/20 p-2.5 border border-blue-200 dark:border-blue-800/50 rounded">
                    Ensure your custom domain has verified SPF/DKIM records pointing to the platform's central mail relay.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {t('admin_settings.sms_config', 'SMS Configuration')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.sms_config_desc', 'Configure your SMS provider settings for text message notifications')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderGatewayStatus('sms')}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled">{t('admin_settings.enable_sms_notifications', 'Enable SMS Notifications')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.send_notifications_via_sms', 'Send notifications via SMS')}
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={settings.smsEnabled}
                  onCheckedChange={(checked) => handleInputChange('smsEnabled', checked)}
                />
              </div>

              {settings.smsEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-sender-id">{t('admin_settings.sender_id', 'Sender ID')}</Label>
                    <Input
                      id="sms-sender-id"
                      value={settings.smsSenderId}
                      onChange={(e) => handleInputChange('smsSenderId', e.target.value)}
                      placeholder="ADMIPAEDIA"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-500">{t('admin_settings.sender_id_hint', 'Maximum 11 characters')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('admin_settings.notification_types', 'Notification Types')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.notification_types_desc', 'Configure which events trigger notifications')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t('admin_settings.student_notifications', 'Student Notifications')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="student-registration" className="text-base">{t('admin_settings.student_registration', 'Student Registration')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.student_registration_desc', 'Notify when new students register')}</p>
                      </div>
                      <Switch
                        id="student-registration"
                        checked={settings.studentRegistration}
                        onCheckedChange={(checked) => handleInputChange('studentRegistration', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="exam-results" className="text-base">{t('admin_settings.exam_results', 'Exam Results')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.exam_results_desc', 'Notify when exam results are published')}</p>
                      </div>
                      <Switch
                        id="exam-results"
                        checked={settings.examResults}
                        onCheckedChange={(checked) => handleInputChange('examResults', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="attendance-alerts" className="text-base">{t('admin_settings.attendance_alerts', 'Attendance Alerts')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.attendance_alerts_desc', 'Notify about attendance issues')}</p>
                      </div>
                      <Switch
                        id="attendance-alerts"
                        checked={settings.attendanceAlerts}
                        onCheckedChange={(checked) => handleInputChange('attendanceAlerts', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t('admin_settings.admin_notifications', 'Administrative Notifications')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="fee-payment" className="text-base">{t('admin_settings.fee_payment', 'Fee Payment')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.fee_payment_desc', 'Notify when fees are paid')}</p>
                      </div>
                      <Switch
                        id="fee-payment"
                        checked={settings.feePayment}
                        onCheckedChange={(checked) => handleInputChange('feePayment', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="disciplinary-actions" className="text-base">{t('admin_settings.disciplinary_actions', 'Disciplinary Actions')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.disciplinary_actions_desc', 'Notify about disciplinary issues')}</p>
                      </div>
                      <Switch
                        id="disciplinary-actions"
                        checked={settings.disciplinaryActions}
                        onCheckedChange={(checked) => handleInputChange('disciplinaryActions', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="general-announcements" className="text-base">{t('admin_settings.general_announcements', 'General Announcements')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.general_announcements_desc', 'Notify about school announcements')}</p>
                      </div>
                      <Switch
                        id="general-announcements"
                        checked={settings.generalAnnouncements}
                        onCheckedChange={(checked) => handleInputChange('generalAnnouncements', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-4">{t('admin_settings.recipients', 'Recipients')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-students" className="text-base">{t('admin_settings.students', 'Students')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.students_desc', 'Send notifications to students')}</p>
                      </div>
                      <Switch
                        id="notify-students"
                        checked={settings.notifyStudents}
                        onCheckedChange={(checked) => handleInputChange('notifyStudents', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-parents" className="text-base">{t('admin_settings.parents', 'Parents')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.parents_desc', 'Send notifications to parents')}</p>
                      </div>
                      <Switch
                        id="notify-parents"
                        checked={settings.notifyParents}
                        onCheckedChange={(checked) => handleInputChange('notifyParents', checked)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-teachers" className="text-base">{t('admin_settings.teachers', 'Teachers')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.teachers_desc', 'Send notifications to teachers')}</p>
                      </div>
                      <Switch
                        id="notify-teachers"
                        checked={settings.notifyTeachers}
                        onCheckedChange={(checked) => handleInputChange('notifyTeachers', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-admin" className="text-base">{t('admin_settings.administrators', 'Administrators')}</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.administrators_desc', 'Send notifications to administrators')}</p>
                      </div>
                      <Switch
                        id="notify-admin"
                        checked={settings.notifyAdmin}
                        onCheckedChange={(checked) => handleInputChange('notifyAdmin', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('admin_settings.timing_delivery', 'Timing & Delivery')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.timing_delivery_desc', 'Configure when notifications are sent and delivery preferences')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="send-immediately" className="text-base">{t('admin_settings.send_immediately', 'Send Immediately')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.send_immediately_desc', 'Send notifications as soon as events occur')}</p>
                  </div>
                  <Switch
                    id="send-immediately"
                    checked={settings.sendImmediately}
                    onCheckedChange={(checked) => handleInputChange('sendImmediately', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-digest" className="text-base">{t('admin_settings.daily_digest', 'Daily Digest')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.daily_digest_desc', 'Send a daily summary of notifications')}</p>
                  </div>
                  <Switch
                    id="daily-digest"
                    checked={settings.dailyDigest}
                    onCheckedChange={(checked) => handleInputChange('dailyDigest', checked)}
                  />
                </div>

                {settings.dailyDigest && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-time">{t('admin_settings.digest_time', 'Digest Time')}</Label>
                    <Input
                      id="digest-time"
                      type="time"
                      value={settings.digestTime}
                      onChange={(e) => handleInputChange('digestTime', e.target.value)}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.digest_time_desc', 'Time when daily digest will be sent')}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiet-hours" className="text-base">{t('admin_settings.quiet_hours', 'Quiet Hours')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.quiet_hours_desc', 'Pause notifications during specified hours')}</p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={settings.quietHours}
                    onCheckedChange={(checked) => handleInputChange('quietHours', checked)}
                  />
                </div>

                {settings.quietHours && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-hours-start">{t('admin_settings.start_time', 'Start Time')}</Label>
                      <Input
                        id="quiet-hours-start"
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => handleInputChange('quietHoursStart', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-hours-end">{t('admin_settings.end_time', 'End Time')}</Label>
                      <Input
                        id="quiet-hours-end"
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => handleInputChange('quietHoursEnd', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">{t('admin_settings.delivery_notes', 'Delivery Notes')}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      {t('admin_settings.delivery_notes_desc', 'Notifications will be queued and sent according to your timing preferences. During quiet hours, notifications will be held and delivered when quiet hours end.')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationSettings;
