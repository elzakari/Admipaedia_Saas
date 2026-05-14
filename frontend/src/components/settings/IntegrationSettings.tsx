import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Mail, 
  MessageSquare, 
  CreditCard, 
  Cloud, 
  Database, 
  Globe,
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Key,
  Link,
  Unlink,
  TestTube,
  Shield,
  Zap,
  BarChart3,
  Users,
  BookOpen,
  Calendar,
  Camera,
  FileText,
  Smartphone
} from 'lucide-react';
import { settingsService } from '../../services';

interface IntegrationSettings {
  // Email Services
  emailProvider: 'smtp' | 'sendgrid' | 'mailgun' | 'aws-ses' | 'gmail';
  emailApiKey: string;
  emailFromAddress: string;
  emailFromName: string;
  emailEnabled: boolean;
  
  // SMS Services
  smsProvider: 'twilio' | 'nexmo' | 'plivo' | 'aws-sns';
  smsApiKey: string;
  smsApiSecret: string;
  smsFromNumber: string;
  smsEnabled: boolean;
  
  // Payment Gateways
  paymentGateway: 'stripe' | 'paypal' | 'flutterwave' | 'paystack' | 'momo';
  paymentApiKey: string;
  paymentApiSecret: string;
  paymentWebhookSecret: string;
  paymentEnabled: boolean;
  
  // Cloud Storage
  cloudStorageProvider: 'aws-s3' | 'google-cloud' | 'azure' | 'digitalocean';
  cloudStorageKey: string;
  cloudStorageSecret: string;
  cloudStorageBucket: string;
  cloudStorageRegion: string;
  cloudStorageEnabled: boolean;
  
  // Analytics
  analyticsProvider: 'google-analytics' | 'mixpanel' | 'amplitude' | 'custom';
  analyticsApiKey: string;
  analyticsEnabled: boolean;
  
  // Communication
  communicationPlatform: 'slack' | 'teams' | 'discord' | 'telegram';
  communicationWebhook: string;
  communicationEnabled: boolean;
  
  // Learning Management
  lmsProvider: 'moodle' | 'canvas' | 'blackboard' | 'google-classroom';
  lmsApiKey: string;
  lmsApiSecret: string;
  lmsUrl: string;
  lmsEnabled: boolean;
  
  // Video Conferencing
  videoProvider: 'zoom' | 'google-meet' | 'teams' | 'webex';
  videoApiKey: string;
  videoApiSecret: string;
  videoWebhookSecret: string;
  videoEnabled: boolean;
}

interface IntegrationTest {
  id: string;
  service: string;
  type: 'email' | 'sms' | 'payment' | 'storage' | 'analytics' | 'communication' | 'lms' | 'video';
  status: 'pending' | 'success' | 'failed';
  message: string;
  timestamp: string;
}

const IntegrationSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('communication');
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const [settings, setSettings] = useState<IntegrationSettings>({
    // Email Services
    emailProvider: 'smtp',
    emailApiKey: '',
    emailFromAddress: 'noreply@admipaedia.edu.gh',
    emailFromName: 'ADMIPAEDIA',
    emailEnabled: false,
    
    // SMS Services
    smsProvider: 'twilio',
    smsApiKey: '',
    smsApiSecret: '',
    smsFromNumber: '',
    smsEnabled: false,
    
    // Payment Gateways
    paymentGateway: 'stripe',
    paymentApiKey: '',
    paymentApiSecret: '',
    paymentWebhookSecret: '',
    paymentEnabled: false,
    
    // Cloud Storage
    cloudStorageProvider: 'aws-s3',
    cloudStorageKey: '',
    cloudStorageSecret: '',
    cloudStorageBucket: 'admipaedia-files',
    cloudStorageRegion: 'us-east-1',
    cloudStorageEnabled: false,
    
    // Analytics
    analyticsProvider: 'google-analytics',
    analyticsApiKey: '',
    analyticsEnabled: false,
    
    // Communication
    communicationPlatform: 'slack',
    communicationWebhook: '',
    communicationEnabled: false,
    
    // Learning Management
    lmsProvider: 'moodle',
    lmsApiKey: '',
    lmsApiSecret: '',
    lmsUrl: '',
    lmsEnabled: false,
    
    // Video Conferencing
    videoProvider: 'zoom',
    videoApiKey: '',
    videoApiSecret: '',
    videoWebhookSecret: '',
    videoEnabled: false
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['integration-settings'],
    queryFn: () => settingsService.getIntegrationSettings(),
  } as any);

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Fetch integration tests
  const { data: integrationTests = [] } = useQuery({
    queryKey: ['integration-tests'],
    queryFn: () => settingsService.getIntegrationTests()
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: IntegrationSettings) => settingsService.updateIntegrationSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: "Integration Settings Updated",
        description: "Integration settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['integration-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update integration settings",
        variant: "destructive"
      });
    }
  });

  // Test integration mutation
  const testIntegrationMutation = useMutation({
    mutationFn: ({ service, type }: { service: string; type: string }) => 
      settingsService.testIntegration(service, type),
    onSuccess: (result) => {
      toast({
        title: "Test Successful",
        description: `${result.service} integration test passed.`,
        variant: "default"
      });
      setIsTesting(null);
      queryClient.invalidateQueries({ queryKey: ['integration-tests'] });
    },
    onError: (error: any, { service }) => {
      toast({
        title: "Test Failed",
        description: `${service} integration test failed: ${error.message}`,
        variant: "destructive"
      });
      setIsTesting(null);
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof IntegrationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleTestIntegration = async (service: string, type: string) => {
    setIsTesting(service);
    try {
      await testIntegrationMutation.mutateAsync({ service, type });
    } catch (error) {
      console.error('Integration test failed:', error);
    }
  };

  const toggleApiKeyVisibility = (field: string) => {
    setShowApiKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getProviderOptions = (type: string) => {
    switch (type) {
      case 'email':
        return [
          { value: 'smtp', label: 'SMTP' },
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'mailgun', label: 'Mailgun' },
          { value: 'aws-ses', label: 'AWS SES' },
          { value: 'gmail', label: 'Gmail API' }
        ];
      case 'sms':
        return [
          { value: 'twilio', label: 'Twilio' },
          { value: 'nexmo', label: 'Nexmo (Vonage)' },
          { value: 'plivo', label: 'Plivo' },
          { value: 'aws-sns', label: 'AWS SNS' }
        ];
      case 'payment':
        return [
          { value: 'stripe', label: 'Stripe' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'flutterwave', label: 'Flutterwave' },
          { value: 'paystack', label: 'Paystack' },
          { value: 'momo', label: 'MTN Mobile Money' }
        ];
      case 'storage':
        return [
          { value: 'aws-s3', label: 'AWS S3' },
          { value: 'google-cloud', label: 'Google Cloud Storage' },
          { value: 'azure', label: 'Azure Blob Storage' },
          { value: 'digitalocean', label: 'DigitalOcean Spaces' }
        ];
      case 'analytics':
        return [
          { value: 'google-analytics', label: 'Google Analytics' },
          { value: 'mixpanel', label: 'Mixpanel' },
          { value: 'amplitude', label: 'Amplitude' },
          { value: 'custom', label: 'Custom Analytics' }
        ];
      case 'communication':
        return [
          { value: 'slack', label: 'Slack' },
          { value: 'teams', label: 'Microsoft Teams' },
          { value: 'discord', label: 'Discord' },
          { value: 'telegram', label: 'Telegram' }
        ];
      case 'lms':
        return [
          { value: 'moodle', label: 'Moodle' },
          { value: 'canvas', label: 'Canvas LMS' },
          { value: 'blackboard', label: 'Blackboard' },
          { value: 'google-classroom', label: 'Google Classroom' }
        ];
      case 'video':
        return [
          { value: 'zoom', label: 'Zoom' },
          { value: 'google-meet', label: 'Google Meet' },
          { value: 'teams', label: 'Microsoft Teams' },
          { value: 'webex', label: 'Cisco Webex' }
        ];
      default:
        return [];
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'sms': return <MessageSquare className="h-5 w-5" />;
      case 'payment': return <CreditCard className="h-5 w-5" />;
      case 'storage': return <Cloud className="h-5 w-5" />;
      case 'analytics': return <BarChart3 className="h-5 w-5" />;
      case 'communication': return <Users className="h-5 w-5" />;
      case 'lms': return <BookOpen className="h-5 w-5" />;
      case 'video': return <Camera className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage third-party integrations and APIs</p>
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
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Integration Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-2xl font-bold">{settings.emailEnabled ? 'Active' : 'Inactive'}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">SMS</p>
                <p className="text-2xl font-bold">{settings.smsEnabled ? 'Active' : 'Inactive'}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Payments</p>
                <p className="text-2xl font-bold">{settings.paymentEnabled ? 'Active' : 'Inactive'}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Storage</p>
                <p className="text-2xl font-bold">{settings.cloudStorageEnabled ? 'Active' : 'Inactive'}</p>
              </div>
              <Cloud className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="communication" className="flex items-center gap-2 min-w-[160px]">
            <Mail className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 min-w-[130px]">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2 min-w-[130px]">
            <Cloud className="h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 min-w-[130px]">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Configuration
                </CardTitle>
                <CardDescription>Configure email service provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled">Enable Email Service</Label>
                    <p className="text-sm text-gray-500">Send emails to users</p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={settings.emailEnabled}
                    onCheckedChange={(checked) => handleInputChange('emailEnabled', checked)}
                  />
                </div>

                {settings.emailEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email-provider">Email Provider</Label>
                      <Select value={settings.emailProvider} onValueChange={(value) => handleInputChange('emailProvider', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getProviderOptions('email').map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-api-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email-api-key"
                          type={showApiKeys.emailApiKey ? 'text' : 'password'}
                          value={settings.emailApiKey}
                          onChange={(e) => handleInputChange('emailApiKey', e.target.value)}
                          placeholder="Enter your email service API key"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleApiKeyVisibility('emailApiKey')}
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-from">From Address</Label>
                        <Input
                          id="email-from"
                          type="email"
                          value={settings.emailFromAddress}
                          onChange={(e) => handleInputChange('emailFromAddress', e.target.value)}
                          placeholder="noreply@yourdomain.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-from-name">From Name</Label>
                        <Input
                          id="email-from-name"
                          value={settings.emailFromName}
                          onChange={(e) => handleInputChange('emailFromName', e.target.value)}
                          placeholder="Your School Name"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleTestIntegration(settings.emailProvider, 'email')}
                      disabled={isTesting === settings.emailProvider}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting === settings.emailProvider ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Email Configuration
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* SMS Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Configuration
                </CardTitle>
                <CardDescription>Configure SMS service provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-enabled">Enable SMS Service</Label>
                    <p className="text-sm text-gray-500">Send SMS notifications</p>
                  </div>
                  <Switch
                    id="sms-enabled"
                    checked={settings.smsEnabled}
                    onCheckedChange={(checked) => handleInputChange('smsEnabled', checked)}
                  />
                </div>

                {settings.smsEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sms-provider">SMS Provider</Label>
                      <Select value={settings.smsProvider} onValueChange={(value) => handleInputChange('smsProvider', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getProviderOptions('sms').map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-api-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sms-api-key"
                          type={showApiKeys.smsApiKey ? 'text' : 'password'}
                          value={settings.smsApiKey}
                          onChange={(e) => handleInputChange('smsApiKey', e.target.value)}
                          placeholder="Enter your SMS service API key"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleApiKeyVisibility('smsApiKey')}
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-api-secret">API Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sms-api-secret"
                          type={showApiKeys.smsApiSecret ? 'text' : 'password'}
                          value={settings.smsApiSecret}
                          onChange={(e) => handleInputChange('smsApiSecret', e.target.value)}
                          placeholder="Enter your SMS service API secret"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleApiKeyVisibility('smsApiSecret')}
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-from">From Number</Label>
                      <Input
                        id="sms-from"
                        value={settings.smsFromNumber}
                        onChange={(e) => handleInputChange('smsFromNumber', e.target.value)}
                        placeholder="+1234567890"
                      />
                    </div>
                    <Button
                      onClick={() => handleTestIntegration(settings.smsProvider, 'sms')}
                      disabled={isTesting === settings.smsProvider}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting === settings.smsProvider ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test SMS Configuration
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Gateway Configuration
              </CardTitle>
              <CardDescription>Configure payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-enabled">Enable Payment Processing</Label>
                  <p className="text-sm text-gray-500">Process student fees and payments</p>
                </div>
                <Switch
                  id="payment-enabled"
                  checked={settings.paymentEnabled}
                  onCheckedChange={(checked) => handleInputChange('paymentEnabled', checked)}
                />
              </div>

              {settings.paymentEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payment-gateway">Payment Gateway</Label>
                    <Select value={settings.paymentGateway} onValueChange={(value) => handleInputChange('paymentGateway', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderOptions('payment').map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-api-key">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="payment-api-key"
                        type={showApiKeys.paymentApiKey ? 'text' : 'password'}
                        value={settings.paymentApiKey}
                        onChange={(e) => handleInputChange('paymentApiKey', e.target.value)}
                        placeholder="Enter your payment gateway API key"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('paymentApiKey')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-api-secret">API Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        id="payment-api-secret"
                        type={showApiKeys.paymentApiSecret ? 'text' : 'password'}
                        value={settings.paymentApiSecret}
                        onChange={(e) => handleInputChange('paymentApiSecret', e.target.value)}
                        placeholder="Enter your payment gateway API secret"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('paymentApiSecret')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-webhook">Webhook Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        id="payment-webhook"
                        type={showApiKeys.paymentWebhookSecret ? 'text' : 'password'}
                        value={settings.paymentWebhookSecret}
                        onChange={(e) => handleInputChange('paymentWebhookSecret', e.target.value)}
                        placeholder="Enter webhook secret for payment notifications"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('paymentWebhookSecret')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleTestIntegration(settings.paymentGateway, 'payment')}
                    disabled={isTesting === settings.paymentGateway}
                    variant="outline"
                    className="w-full"
                  >
                    {isTesting === settings.paymentGateway ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Payment Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Cloud Storage Configuration
              </CardTitle>
              <CardDescription>Configure file storage and CDN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="storage-enabled">Enable Cloud Storage</Label>
                  <p className="text-sm text-gray-500">Store files in cloud storage</p>
                </div>
                <Switch
                  id="storage-enabled"
                  checked={settings.cloudStorageEnabled}
                  onCheckedChange={(checked) => handleInputChange('cloudStorageEnabled', checked)}
                />
              </div>

              {settings.cloudStorageEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cloud-provider">Cloud Provider</Label>
                    <Select value={settings.cloudStorageProvider} onValueChange={(value) => handleInputChange('cloudStorageProvider', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderOptions('storage').map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cloud-key">Access Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cloud-key"
                        type={showApiKeys.cloudStorageKey ? 'text' : 'password'}
                        value={settings.cloudStorageKey}
                        onChange={(e) => handleInputChange('cloudStorageKey', e.target.value)}
                        placeholder="Enter your cloud storage access key"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('cloudStorageKey')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cloud-secret">Secret Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cloud-secret"
                        type={showApiKeys.cloudStorageSecret ? 'text' : 'password'}
                        value={settings.cloudStorageSecret}
                        onChange={(e) => handleInputChange('cloudStorageSecret', e.target.value)}
                        placeholder="Enter your cloud storage secret key"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('cloudStorageSecret')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cloud-bucket">Bucket Name</Label>
                      <Input
                        id="cloud-bucket"
                        value={settings.cloudStorageBucket}
                        onChange={(e) => handleInputChange('cloudStorageBucket', e.target.value)}
                        placeholder="admipaedia-files"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cloud-region">Region</Label>
                      <Input
                        id="cloud-region"
                        value={settings.cloudStorageRegion}
                        onChange={(e) => handleInputChange('cloudStorageRegion', e.target.value)}
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleTestIntegration(settings.cloudStorageProvider, 'storage')}
                    disabled={isTesting === settings.cloudStorageProvider}
                    variant="outline"
                    className="w-full"
                  >
                    {isTesting === settings.cloudStorageProvider ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Storage Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Configuration
              </CardTitle>
              <CardDescription>Configure analytics and tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics-enabled">Enable Analytics</Label>
                  <p className="text-sm text-gray-500">Track user behavior and system usage</p>
                </div>
                <Switch
                  id="analytics-enabled"
                  checked={settings.analyticsEnabled}
                  onCheckedChange={(checked) => handleInputChange('analyticsEnabled', checked)}
                />
              </div>

              {settings.analyticsEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="analytics-provider">Analytics Provider</Label>
                    <Select value={settings.analyticsProvider} onValueChange={(value) => handleInputChange('analyticsProvider', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderOptions('analytics').map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="analytics-api-key">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="analytics-api-key"
                        type={showApiKeys.analyticsApiKey ? 'text' : 'password'}
                        value={settings.analyticsApiKey}
                        onChange={(e) => handleInputChange('analyticsApiKey', e.target.value)}
                        placeholder="Enter your analytics API key"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApiKeyVisibility('analyticsApiKey')}
                      >
                        <Key className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleTestIntegration(settings.analyticsProvider, 'analytics')}
                    disabled={isTesting === settings.analyticsProvider}
                    variant="outline"
                    className="w-full"
                  >
                    {isTesting === settings.analyticsProvider ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Analytics Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Test History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Integration Test History
          </CardTitle>
          <CardDescription>Recent integration tests and their results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrationTests.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No integration tests found. Test your integrations to see results here.</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrationTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getIntegrationIcon(test.type)}
                            <span className="font-medium">{test.service}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{test.message}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">{test.timestamp}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationSettings;
