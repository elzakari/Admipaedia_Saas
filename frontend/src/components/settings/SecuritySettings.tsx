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
  Shield, 
  Lock, 
  Key, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Globe,
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('authentication');
  const [newIpAddress, setNewIpAddress] = useState('');

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
        title: t('admin_settings.security_updated', 'Security Settings Updated'),
        description: t('admin_settings.security_updated_desc', 'Security settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.security_update_failed', 'Failed to update security settings'),
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
        title: t('common.validation_error', 'Validation Error'),
        description: t('admin_settings.enter_valid_ip', 'Please enter a valid IP address'),
        variant: "destructive"
      });
      return;
    }
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIpAddress.trim())) {
      toast({
        title: t('common.validation_error', 'Validation Error'),
        description: t('admin_settings.enter_valid_ip_format', 'Please enter a valid IP address format (e.g., 192.168.1.1 or 192.168.1.0/24)'),
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
      title: t('admin_settings.ip_added', 'IP Address Added'),
      description: t('admin_settings.ip_added_desc', 'IP address has been added to the whitelist.'),
      variant: "default"
    });
  };

  const handleRemoveIpAddress = (ipToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(ip => ip !== ipToRemove)
    }));
    
    toast({
      title: t('admin_settings.ip_removed', 'IP Address Removed'),
      description: t('admin_settings.ip_removed_desc', 'IP address has been removed from the whitelist.'),
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
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.security_settings', 'Paramètres de sécurité')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.security_settings_desc', 'Configurer les paramètres de sécurité et les contrôles d\'accès')}</p>
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
          {updateSettingsMutation.isPending ? t('common.saving', 'Enregistrement…') : t('school_settings.save_changes', 'Enregistrer')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="authentication" className="flex items-center gap-2 min-w-[170px]">
            <Fingerprint className="h-4 w-4" />
            {t('admin_settings.authentication', 'Authentification')}
          </TabsTrigger>
          <TabsTrigger value="login" className="flex items-center gap-2 min-w-[170px]">
            <Lock className="h-4 w-4" />
            {t('admin_settings.login_security', 'Sécurité de connexion')}
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2 min-w-[160px]">
            <Globe className="h-4 w-4" />
            {t('admin_settings.access_control', 'Contrôle d\'accès')}
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2 min-w-[150px]">
            <Key className="h-4 w-4" />
            {t('admin_settings.api_security', 'Sécurité API')}
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2 min-w-[150px]">
            <Shield className="h-4 w-4" />
            {t('admin_settings.monitoring', 'Surveillance')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                {t('admin_settings.two_factor_auth', 'Authentification à deux facteurs')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.two_factor_desc', 'Ajouter une couche de sécurité supplémentaire aux comptes utilisateurs')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="2fa-enabled">{t('admin_settings.enable_two_factor', 'Activer l\'authentification à deux facteurs')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.require_second_auth', 'Exiger des utilisateurs une deuxième forme d\'authentification')}
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
                    <Label htmlFor="2fa-method">{t('admin_settings.two_factor_method', 'Méthode à deux facteurs')}</Label>
                    <Select value={settings.twoFactorMethod} onValueChange={(value) => handleInputChange('twoFactorMethod', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="authenticator">{t('admin_settings.authenticator_app', 'Application d\'authentification (OTP)')}</SelectItem>
                        <SelectItem value="sms">{t('admin_settings.sms', 'SMS')}</SelectItem>
                        <SelectItem value="email">{t('common.email', 'E-mail')}</SelectItem>
                        <SelectItem value="both">{t('admin_settings.sms_email', 'SMS + E-mail')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">{t('admin_settings.session_timeout', 'Délai d\'expiration de session (minutes)')}</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      min="5"
                      max="480"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">{t('admin_settings.session_timeout_desc', 'Déconnecter automatiquement les utilisateurs inactifs')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-expiry">{t('admin_settings.password_expiry', 'Expiration du mot de passe (jours)')}</Label>
                    <Input
                      id="password-expiry"
                      type="number"
                      min="0"
                      max="365"
                      value={settings.passwordExpiry}
                      onChange={(e) => handleInputChange('passwordExpiry', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">{t('admin_settings.never_expire', '0 = n\'expire jamais')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password-complexity">{t('admin_settings.password_complexity', 'Complexité du mot de passe')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.password_complexity_desc', 'Exiger des mots de passe forts contenant des majuscules, chiffres et symboles')}
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
                {t('admin_settings.login_security', 'Sécurité de connexion')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.captcha_desc', 'Exiger une vérification CAPTCHA pour les tentatives de connexion')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-attempts">{t('admin_settings.max_login_attempts', 'Tentatives de connexion maximales')}</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">{t('admin_settings.max_attempts_desc', 'Verrouiller le compte après autant d\'échecs')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">{t('admin_settings.lockout_duration', 'Durée de verrouillage (minutes)')}</Label>
                  <Input
                    id="lockout-duration"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.lockoutDuration}
                    onChange={(e) => handleInputChange('lockoutDuration', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">{t('admin_settings.lockout_duration_desc', 'Durée de blocage du compte')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="captcha-enabled">{t('admin_settings.enable_captcha', 'Activer le CAPTCHA')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.captcha_desc', 'Exiger une vérification CAPTCHA pour les tentatives de connexion')}
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
                  <Label htmlFor="captcha-threshold">{t('admin_settings.captcha_threshold', 'Seuil d\'affichage du CAPTCHA')}</Label>
                  <Input
                    id="captcha-threshold"
                    type="number"
                    min="1"
                    max="5"
                    value={settings.captchaThreshold}
                    onChange={(e) => handleInputChange('captchaThreshold', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">{t('admin_settings.captcha_threshold_desc', 'Afficher le CAPTCHA après autant de tentatives échouées')}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-logout-enabled">{t('admin_settings.auto_logout', 'Déconnexion automatique')}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('admin_settings.auto_logout_desc', 'Déconnecter automatiquement les utilisateurs en cas d\'inactivité')}
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
                    <Label htmlFor="auto-logout-time">{t('admin_settings.auto_logout_time', 'Délai de déconnexion automatique (minutes)')}</Label>
                    <Input
                      id="auto-logout-time"
                      type="number"
                      min="5"
                      max="120"
                      value={settings.autoLogoutTime}
                      onChange={(e) => handleInputChange('autoLogoutTime', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500">{t('admin_settings.auto_logout_time_desc', 'Déconnecter après autant de minutes d\'inactivité')}</p>
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
                {t('admin_settings.ip_access_control', 'IP et contrôle d\'accès')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.ip_access_desc', 'Contrôler l\'accès selon les adresses IP et la géolocalisation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ip-whitelist-enabled">{t('admin_settings.enable_ip_whitelist', 'Activer la liste blanche d\'IP')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.ip_whitelist_desc', 'Autoriser l\'accès uniquement depuis les adresses IP spécifiées')}
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
                    <Label htmlFor="new-ip-address">{t('admin_settings.add_ip_address', 'Ajouter une adresse IP')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-ip-address"
                        value={newIpAddress}
                        onChange={(e) => setNewIpAddress(e.target.value)}
                        placeholder="192.168.1.1 ou 192.168.1.0/24"
                        className="flex-1"
                      />
                      <Button onClick={handleAddIpAddress} size="sm">
                        {t('common.add', 'Ajouter')}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin_settings.whitelisted_ips', 'Adresses IP autorisées (Liste blanche)')}</Label>
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
                  <Label htmlFor="geo-blocking-enabled">{t('admin_settings.enable_geo_blocking', 'Activer le blocage géographique')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.geo_blocking_desc', 'Bloquer l\'accès depuis des pays spécifiques')}
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
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('admin_settings.geographic_blocking', 'Blocage géographique')}</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        {t('admin_settings.geo_blocking_alert', 'Le blocage géographique est activé. Veuillez configurer la liste des pays bloqués dans la configuration système.')}
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
                {t('admin_settings.api_security', 'Sécurité API')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.api_key_rotation_desc', 'Renouveler automatiquement les clés API')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-rate-limit">{t('admin_settings.api_rate_limit', 'Limite de requêtes API (requêtes par heure)')}</Label>
                <Input
                  id="api-rate-limit"
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.apiRateLimit}
                  onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">{t('admin_settings.rate_limit_desc', 'Nombre maximal de requêtes API par heure et par utilisateur')}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="api-key-rotation">{t('admin_settings.api_key_rotation', 'Rotation des clés API')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.api_key_rotation_desc', 'Renouveler automatiquement les clés API')}
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
                  <Label htmlFor="api-key-expiry">{t('admin_settings.api_key_expiry', 'Expiration des clés API (jours)')}</Label>
                  <Input
                    id="api-key-expiry"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.apiKeyExpiry}
                    onChange={(e) => handleInputChange('apiKeyExpiry', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500">{t('admin_settings.api_key_expiry_desc', 'Les clés API expireront après ce nombre de jours')}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="encryption-enabled">{t('admin_settings.data_encryption', 'Chiffrement des données')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.encryption_desc', 'Chiffrer les données sensibles au repos')}
                  </p>
                </div>
                <Switch
                  id="encryption-enabled"
                  checked={settings.encryptionEnabled}
                  onCheckedChange={(checked) => handleInputChange('encryptionEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-retention">{t('admin_settings.data_retention', 'Rétention des données (jours)')}</Label>
                <Input
                  id="data-retention"
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.dataRetentionDays}
                  onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">{t('admin_settings.data_retention_desc', 'Durée de conservation des données utilisateurs')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('admin_settings.security_monitoring', 'Surveillance de la sécurité')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.security_monitoring_desc', 'Configurer les alertes de sécurité et la surveillance')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="login-alerts">{t('admin_settings.login_alerts', 'Alertes de connexion')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.login_alerts_desc', 'Envoyer des alertes pour les tentatives de connexion réussies et échouées')}
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
                  <Label htmlFor="suspicious-alerts">{t('admin_settings.suspicious_alerts', 'Alertes d\'activité suspecte')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.suspicious_alerts_desc', 'Avertir les administrateurs en cas d\'activité utilisateur suspecte')}
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
                  <Label htmlFor="security-audit">{t('admin_settings.security_audit', 'Journalisation de l\'audit de sécurité')}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin_settings.security_audit_desc', 'Enregistrer tous les événements liés à la sécurité')}
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
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">{t('admin_settings.security_status', 'Statut de sécurité')}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      {t('admin_settings.security_status_desc', 'Vos paramètres de sécurité sont actuellement au niveau {{level}}.', { level: settings.twoFactorEnabled ? 'renforcé' : 'standard' })}
                      {settings.twoFactorEnabled && t('admin_settings.two_factor_active_note', ' L\'authentification à deux facteurs est activée pour tous les utilisateurs.')}
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
