import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { 
  Shield, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Clock,
  Globe,
  Smartphone,
  Mail,
  Fingerprint
} from 'lucide-react';
import { settingsService } from '../../services';

interface SecuritySettings {
  // Authentication
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  sessionTimeout: number;
  passwordExpiry: number;
  passwordComplexity: boolean;
  
  // Login Security
  maxLoginAttempts: number;
  lockoutDuration: number;
  captchaEnabled: boolean;
  captchaThreshold: number;
  
  // IP & Access Control
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  geoBlockingEnabled: boolean;
  blockedCountries: string[];
  
  // API Security
  apiRateLimit: number;
  apiKeyRotation: boolean;
  apiKeyExpiry: number;
  
  // Data Protection
  encryptionEnabled: boolean;
  dataRetentionDays: number;
  autoLogoutEnabled: boolean;
  autoLogoutTime: number;
  
  // Monitoring
  loginAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  securityAuditEnabled: boolean;
}

const SecuritySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('authentication');
  const [newIpAddress, setNewIpAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [settings, setSettings] = useState<SecuritySettings>({
    // Authentication
    twoFactorEnabled: false,
    twoFactorMethod: 'authenticator',
    sessionTimeout: 30,
    passwordExpiry: 90,
    passwordComplexity: true,
    
    // Login Security
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    captchaEnabled: true,
    captchaThreshold: 3,
    
    // IP & Access Control
    ipWhitelistEnabled: false,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    geoBlockingEnabled: false,
    blockedCountries: [],
    
    // API Security
    apiRateLimit: 1000,
    apiKeyRotation: true,
    apiKeyExpiry: 30,
    
    // Data Protection
    encryptionEnabled: true,
    dataRetentionDays: 365,
    autoLogoutEnabled: true,
    autoLogoutTime: 15,
    
    // Monitoring
    loginAlerts: true,
    suspiciousActivityAlerts: true,
    securityAuditEnabled: true
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: () => settingsService.getSecuritySettings(),
  } as any);

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: SecuritySettings) => settingsService.updateSecuritySettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: "Security Settings Updated",
        description: "Security settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update security settings",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof SecuritySettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAddIpAddress = () => {
    if (!newIpAddress.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid IP address",
        variant: "destructive"
      });
      return;
    }
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIpAddress.trim())) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid IP address format (e.g., 192.168.1.1 or 192.168.1.0/24)",
        variant: "destructive"
      });
      return;
    }

    setSettings(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, newIpAddress.trim()]
    }));
    setNewIpAddress('');
    
    toast({
      title: "IP Address Added",
      description: "IP address has been added to the whitelist.",
      variant: "default"
    });
  };

  const handleRemoveIpAddress = (ipToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(ip => ip !== ipToRemove)
    }));
    
    toast({
      title: "IP Address Removed",
      description: "IP address has been removed from the whitelist.",
      variant: "default"
    });
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure security settings and access controls</p>
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
          <TabsTrigger value="authentication" className="flex items-center gap-2 min-w-[170px]">
            <Fingerprint className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="login" className="flex items-center gap-2 min-w-[170px]">
            <Lock className="h-4 w-4" />
            Login Security
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2 min-w-[160px]">
            <Globe className="h-4 w-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2 min-w-[150px]">
            <Key className="h-4 w-4" />
            API Security
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2 min-w-[150px]">
            <Shield className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to user accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="2fa-enabled">Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Require users to provide a second form of authentication
                  </p>
                </div>
                <Switch
                  id="2fa-enabled"
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
                />
              </div>

              {settings.twoFactorEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="2fa-method">Two-Factor Method</Label>
                    <Select value={settings.twoFactorMethod} onValueChange={(value) => handleInputChange('twoFactorMethod', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="authenticator">Authenticator App</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="both">SMS + Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      min="5"
                      max="480"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">Automatically log out inactive users</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                    <Input
                      id="password-expiry"
                      type="number"
                      min="0"
                      max="365"
                      value={settings.passwordExpiry}
                      onChange={(e) => handleInputChange('passwordExpiry', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">0 = never expire</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password-complexity">Password Complexity</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Require strong passwords with mixed case, numbers, and symbols
                  </p>
                </div>
                <Switch
                  id="password-complexity"
                  checked={settings.passwordComplexity}
                  onCheckedChange={(checked) => handleInputChange('passwordComplexity', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Login Security
              </CardTitle>
              <CardDescription>
                Configure login attempt limits and CAPTCHA settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Maximum Login Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Lock account after this many failed attempts</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-duration"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.lockoutDuration}
                    onChange={(e) => handleInputChange('lockoutDuration', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">How long to lock the account</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="captcha-enabled">Enable CAPTCHA</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Require CAPTCHA verification for login attempts
                  </p>
                </div>
                <Switch
                  id="captcha-enabled"
                  checked={settings.captchaEnabled}
                  onCheckedChange={(checked) => handleInputChange('captchaEnabled', checked)}
                />
              </div>

              {settings.captchaEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="captcha-threshold">CAPTCHA Threshold</Label>
                  <Input
                    id="captcha-threshold"
                    type="number"
                    min="1"
                    max="5"
                    value={settings.captchaThreshold}
                    onChange={(e) => handleInputChange('captchaThreshold', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">Show CAPTCHA after this many failed attempts</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-logout-enabled">Auto Logout</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically log out users after inactivity
                    </p>
                  </div>
                  <Switch
                    id="auto-logout-enabled"
                    checked={settings.autoLogoutEnabled}
                    onCheckedChange={(checked) => handleInputChange('autoLogoutEnabled', checked)}
                  />
                </div>

                {settings.autoLogoutEnabled && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="auto-logout-time">Auto Logout Time (minutes)</Label>
                    <Input
                      id="auto-logout-time"
                      type="number"
                      min="5"
                      max="120"
                      value={settings.autoLogoutTime}
                      onChange={(e) => handleInputChange('autoLogoutTime', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">Log out after this many minutes of inactivity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                IP & Access Control
              </CardTitle>
              <CardDescription>
                Control access based on IP addresses and geographic location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ip-whitelist-enabled">Enable IP Whitelist</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Only allow access from specified IP addresses
                  </p>
                </div>
                <Switch
                  id="ip-whitelist-enabled"
                  checked={settings.ipWhitelistEnabled}
                  onCheckedChange={(checked) => handleInputChange('ipWhitelistEnabled', checked)}
                />
              </div>

              {settings.ipWhitelistEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-ip-address">Add IP Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-ip-address"
                        value={newIpAddress}
                        onChange={(e) => setNewIpAddress(e.target.value)}
                        placeholder="192.168.1.1 or 192.168.1.0/24"
                        className="flex-1"
                      />
                      <Button onClick={handleAddIpAddress} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Whitelisted IP Addresses</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {settings.ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm font-mono">{ip}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveIpAddress(ip)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="geo-blocking-enabled">Enable Geographic Blocking</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Block access from specific countries
                  </p>
                </div>
                <Switch
                  id="geo-blocking-enabled"
                  checked={settings.geoBlockingEnabled}
                  onCheckedChange={(checked) => handleInputChange('geoBlockingEnabled', checked)}
                />
              </div>

              {settings.geoBlockingEnabled && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Geographic Blocking</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        Geographic blocking is enabled. Please configure the list of blocked countries in the system configuration.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Security
              </CardTitle>
              <CardDescription>
                Configure API rate limiting and key management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-rate-limit">API Rate Limit (requests per hour)</Label>
                <Input
                  id="api-rate-limit"
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.apiRateLimit}
                  onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">Maximum API requests per hour per user</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="api-key-rotation">API Key Rotation</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically rotate API keys
                  </p>
                </div>
                <Switch
                  id="api-key-rotation"
                  checked={settings.apiKeyRotation}
                  onCheckedChange={(checked) => handleInputChange('apiKeyRotation', checked)}
                />
              </div>

              {settings.apiKeyRotation && (
                <div className="space-y-2">
                  <Label htmlFor="api-key-expiry">API Key Expiry (days)</Label>
                  <Input
                    id="api-key-expiry"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.apiKeyExpiry}
                    onChange={(e) => handleInputChange('apiKeyExpiry', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">API keys will expire after this many days</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="encryption-enabled">Data Encryption</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Encrypt sensitive data at rest
                  </p>
                </div>
                <Switch
                  id="encryption-enabled"
                  checked={settings.encryptionEnabled}
                  onCheckedChange={(checked) => handleInputChange('encryptionEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention (days)</Label>
                <Input
                  id="data-retention"
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.dataRetentionDays}
                  onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">How long to retain user data</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Monitoring
              </CardTitle>
              <CardDescription>
                Configure security alerts and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="login-alerts">Login Alerts</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Send alerts for successful and failed login attempts
                  </p>
                </div>
                <Switch
                  id="login-alerts"
                  checked={settings.loginAlerts}
                  onCheckedChange={(checked) => handleInputChange('loginAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="suspicious-alerts">Suspicious Activity Alerts</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Alert administrators about suspicious user activity
                  </p>
                </div>
                <Switch
                  id="suspicious-alerts"
                  checked={settings.suspiciousActivityAlerts}
                  onCheckedChange={(checked) => handleInputChange('suspiciousActivityAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="security-audit">Security Audit Logging</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Log all security-related events
                  </p>
                </div>
                <Switch
                  id="security-audit"
                  checked={settings.securityAuditEnabled}
                  onCheckedChange={(checked) => handleInputChange('securityAuditEnabled', checked)}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Security Status</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Your security settings are currently {settings.twoFactorEnabled ? 'enhanced' : 'standard'} level. 
                      {settings.twoFactorEnabled && ' Two-factor authentication is enabled for all users.'}
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

export default SecuritySettings;
