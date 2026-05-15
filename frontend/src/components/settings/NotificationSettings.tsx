import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => settingsService.getNotificationSettings(),
  } as any);

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: NotificationSettings) => settingsService.updateNotificationSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Notification settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      });
    }
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: (email: string) => settingsService.testEmailConfiguration({
      ...settings,
      testEmail: email
    }),
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Test email has been sent successfully.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    }
  });

  // Test SMS mutation
  const testSmsMutation = useMutation({
    mutationFn: (phone: string) => settingsService.testSmsConfiguration({
      ...settings,
      testPhone: phone
    }),
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Test SMS has been sent successfully.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send test SMS",
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

  const handleTestEmail = () => {
    if (!testEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a test email address",
        variant: "destructive"
      });
      return;
    }
    testEmailMutation.mutate(testEmail);
  };

  const handleTestSms = () => {
    if (!testPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a test phone number",
        variant: "destructive"
      });
      return;
    }
    testSmsMutation.mutate(testPhone);
  };

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
          <h2 className="text-2xl font-bold tracking-tight">Notifications & Alerts</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure how and when notifications are sent</p>
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
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="email" className="flex items-center gap-2 min-w-[120px]">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2 min-w-[120px]">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2 min-w-[180px]">
            <Bell className="h-4 w-4" />
            Notification Types
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-2 min-w-[180px]">
            <Clock className="h-4 w-4" />
            Timing & Delivery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure your email server settings for sending notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Send notifications via email
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
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input
                        id="smtp-host"
                        value={settings.smtpHost}
                        onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">SMTP Port</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={settings.smtpPort}
                        onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-username">SMTP Username</Label>
                      <Input
                        id="smtp-username"
                        value={settings.smtpUsername}
                        onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">SMTP Password</Label>
                      <Input
                        id="smtp-password"
                        type="password"
                        value={settings.smtpPassword}
                        onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                        placeholder="Your app password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-encryption">Encryption</Label>
                      <Select value={settings.smtpEncryption} onValueChange={(value) => handleInputChange('smtpEncryption', value)}>
                        <SelectTrigger id="smtp-encryption">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-email">From Email</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={settings.fromEmail}
                        onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                        placeholder="noreply@your-school.edu"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      value={settings.fromName}
                      onChange={(e) => handleInputChange('fromName', e.target.value)}
                      placeholder="Your School Name"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter test email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleTestEmail}
                      disabled={testEmailMutation.isPending}
                      variant="outline"
                    >
                      {testEmailMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Test Email
                    </Button>
                  </div>
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
                SMS Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMS provider settings for text message notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Send notifications via SMS
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={settings.smsEnabled}
                  onCheckedChange={(checked) => handleInputChange('smsEnabled', checked)}
                />
              </div>

              {settings.smsEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sms-provider">SMS Provider</Label>
                      <Select value={settings.smsProvider} onValueChange={(value) => handleInputChange('smsProvider', value)}>
                        <SelectTrigger id="sms-provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="nexmo">Nexmo (Vonage)</SelectItem>
                          <SelectItem value="plivo">Plivo</SelectItem>
                          <SelectItem value="africastalking">Africa's Talking</SelectItem>
                          <SelectItem value="custom">Custom Provider</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-sender-id">Sender ID</Label>
                      <Input
                        id="sms-sender-id"
                        value={settings.smsSenderId}
                        onChange={(e) => handleInputChange('smsSenderId', e.target.value)}
                        placeholder="ADMIPAEDIA"
                        maxLength={11}
                      />
                      <p className="text-xs text-gray-500">Maximum 11 characters</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-api-key">API Key</Label>
                    <Input
                      id="sms-api-key"
                      type="password"
                      value={settings.smsApiKey}
                      onChange={(e) => handleInputChange('smsApiKey', e.target.value)}
                      placeholder="Your SMS provider API key"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter test phone number (+1234567890)"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleTestSms}
                      disabled={testSmsMutation.isPending}
                      variant="outline"
                    >
                      {testSmsMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Test SMS
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Configure which events trigger notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Student Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="student-registration" className="text-base">Student Registration</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify when new students register</p>
                      </div>
                      <Switch
                        id="student-registration"
                        checked={settings.studentRegistration}
                        onCheckedChange={(checked) => handleInputChange('studentRegistration', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="exam-results" className="text-base">Exam Results</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify when exam results are published</p>
                      </div>
                      <Switch
                        id="exam-results"
                        checked={settings.examResults}
                        onCheckedChange={(checked) => handleInputChange('examResults', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="attendance-alerts" className="text-base">Attendance Alerts</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify about attendance issues</p>
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
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Administrative Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="fee-payment" className="text-base">Fee Payment</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify when fees are paid</p>
                      </div>
                      <Switch
                        id="fee-payment"
                        checked={settings.feePayment}
                        onCheckedChange={(checked) => handleInputChange('feePayment', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="disciplinary-actions" className="text-base">Disciplinary Actions</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify about disciplinary issues</p>
                      </div>
                      <Switch
                        id="disciplinary-actions"
                        checked={settings.disciplinaryActions}
                        onCheckedChange={(checked) => handleInputChange('disciplinaryActions', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="general-announcements" className="text-base">General Announcements</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify about school announcements</p>
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
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-4">Recipients</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-students" className="text-base">Students</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to students</p>
                      </div>
                      <Switch
                        id="notify-students"
                        checked={settings.notifyStudents}
                        onCheckedChange={(checked) => handleInputChange('notifyStudents', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-parents" className="text-base">Parents</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to parents</p>
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
                        <Label htmlFor="notify-teachers" className="text-base">Teachers</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to teachers</p>
                      </div>
                      <Switch
                        id="notify-teachers"
                        checked={settings.notifyTeachers}
                        onCheckedChange={(checked) => handleInputChange('notifyTeachers', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-admin" className="text-base">Administrators</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to administrators</p>
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
                Timing & Delivery
              </CardTitle>
              <CardDescription>
                Configure when notifications are sent and delivery preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="send-immediately" className="text-base">Send Immediately</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications as soon as events occur</p>
                  </div>
                  <Switch
                    id="send-immediately"
                    checked={settings.sendImmediately}
                    onCheckedChange={(checked) => handleInputChange('sendImmediately', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-digest" className="text-base">Daily Digest</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send a daily summary of notifications</p>
                  </div>
                  <Switch
                    id="daily-digest"
                    checked={settings.dailyDigest}
                    onCheckedChange={(checked) => handleInputChange('dailyDigest', checked)}
                  />
                </div>

                {settings.dailyDigest && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-time">Digest Time</Label>
                    <Input
                      id="digest-time"
                      type="time"
                      value={settings.digestTime}
                      onChange={(e) => handleInputChange('digestTime', e.target.value)}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Time when daily digest will be sent</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiet-hours" className="text-base">Quiet Hours</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pause notifications during specified hours</p>
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
                      <Label htmlFor="quiet-hours-start">Start Time</Label>
                      <Input
                        id="quiet-hours-start"
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => handleInputChange('quietHoursStart', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-hours-end">End Time</Label>
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
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Delivery Notes</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Notifications will be queued and sent according to your timing preferences. 
                      During quiet hours, notifications will be held and delivered when quiet hours end.
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
