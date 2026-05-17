import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/use-toast';
import { Zap, Save, RefreshCw } from 'lucide-react';
import { settingsService } from '../../services';

interface GeneralSettingsData {
  schoolName: string;
  schoolCode: string;
  schoolEmail: string;
  schoolPhone: string;
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  aiRecommendations: boolean;
  autoBackup: boolean;
  maintenanceMode: boolean;
}

const GeneralSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<GeneralSettingsData>({
    schoolName: 'ADMIPAEDIA Academy',
    schoolCode: 'ADM-12345',
    schoolEmail: 'info@admipaedia-academy.edu',
    schoolPhone: '+233 20 123 4567',
    timezone: 'Africa/Accra',
    language: 'en',
    currency: 'GHS',
    dateFormat: 'dd/mm/yyyy',
    aiRecommendations: true,
    autoBackup: true,
    maintenanceMode: false
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['general-settings'],
    queryFn: () => settingsService.getGeneralSettings(),
  } as any);

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: GeneralSettingsData) => settingsService.updateGeneralSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('school_settings.updated_title', 'Settings Updated'),
        description: t('school_settings.updated_desc', 'General settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['general-settings'] });
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

  const handleInputChange = (field: keyof GeneralSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleResetToDefaults = () => {
    const defaultSettings: GeneralSettingsData = {
      schoolName: 'ADMIPAEDIA Academy',
      schoolCode: 'ADM-12345',
      schoolEmail: 'info@admipaedia-academy.edu',
      schoolPhone: '+233 20 123 4567',
      timezone: 'Africa/Accra',
      language: 'en',
      currency: 'GHS',
      dateFormat: 'dd/mm/yyyy',
      aiRecommendations: true,
      autoBackup: true,
      maintenanceMode: false
    };
    setSettings(defaultSettings);
    toast({
      title: t('admin_settings.settings_reset', 'Settings Reset'),
      description: t('admin_settings.settings_reset_desc', 'Settings have been reset to defaults.'),
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
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.general', 'General Settings')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.general_desc', 'Configure basic system settings and defaults')}</p>
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

      {/* AI Recommendations Banner */}
      {settings.aiRecommendations && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">{t('admin_settings.ai_recommendations', 'AI Recommendations')}</h3>
              <div className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">
                <p>{t('admin_settings.ai_rec_desc', 'Based on your location, we recommend using Ghana Education Service (GES) grading system and West Africa Time (GMT+0).')}</p>
              </div>
            </div>
            <div className="ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                onClick={() => {
                  handleInputChange('timezone', 'Africa/Accra');
                  toast({
                    title: t('admin_settings.rec_applied', 'Recommendations Applied'),
                    description: t('admin_settings.rec_applied_desc', 'Settings updated based on AI recommendations.'),
                    variant: "default"
                  });
                }}
              >
                {t('common.apply', 'Apply')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('school_settings.basic.title', 'School Information')}</CardTitle>
          <CardDescription>{t('school_settings.basic.description', 'Basic information about your institution')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">{t('admin_settings.school_name', 'School Name')}</Label>
              <Input 
                id="school-name" 
                value={settings.schoolName} 
                onChange={(e) => handleInputChange('schoolName', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-code">{t('admin_settings.school_code', 'School Code')}</Label>
              <Input 
                id="school-code" 
                value={settings.schoolCode}
                onChange={(e) => handleInputChange('schoolCode', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-email">{t('admin_settings.school_email', 'School Email')}</Label>
              <Input 
                id="school-email" 
                type="email" 
                value={settings.schoolEmail}
                onChange={(e) => handleInputChange('schoolEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone">{t('admin_settings.school_phone', 'School Phone')}</Label>
              <Input 
                id="school-phone" 
                type="tel" 
                value={settings.schoolPhone}
                onChange={(e) => handleInputChange('schoolPhone', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_settings.system_defaults', 'System Defaults')}</CardTitle>
          <CardDescription>{t('admin_settings.system_defaults_desc', 'Default settings for the entire system')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('admin_settings.timezone', 'Timezone')}</Label>
              <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder={t('admin_settings.select_timezone', 'Select timezone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Accra">Africa/Accra (GMT+0)</SelectItem>
                  <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT+0/+1)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (GMT-5/-4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('admin_settings.default_language', 'Default Language')}</Label>
              <Select value={settings.language} onValueChange={(value) => handleInputChange('language', value)}>
                <SelectTrigger id="language">
                  <SelectValue placeholder={t('admin_settings.select_language', 'Select language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t('admin_settings.default_currency', 'Default Currency')}</Label>
              <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder={t('admin_settings.select_currency', 'Select currency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">Ghana Cedi (GHS)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                  <SelectItem value="NGN">Nigerian Naira (NGN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">{t('admin_settings.date_format', 'Date Format')}</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => handleInputChange('dateFormat', value)}>
                <SelectTrigger id="date-format">
                  <SelectValue placeholder={t('admin_settings.select_date_format', 'Select date format')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-recommendations">{t('admin_settings.ai_recommendations', 'AI Recommendations')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_settings.ai_rec_toggle_desc', 'Allow AI to suggest optimal settings based on your usage')}
                </p>
              </div>
              <Switch 
                id="ai-recommendations" 
                checked={settings.aiRecommendations} 
                onCheckedChange={(checked) => handleInputChange('aiRecommendations', checked)} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">{t('admin_settings.auto_backups', 'Automatic Backups')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_settings.auto_backups_desc', 'Create daily backups of your system data')}
                </p>
              </div>
              <Switch 
                id="auto-backup" 
                checked={settings.autoBackup}
                onCheckedChange={(checked) => handleInputChange('autoBackup', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode">{t('admin_settings.maintenance_mode', 'Maintenance Mode')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_settings.maintenance_mode_desc', 'Temporarily disable access for non-admin users')}
                </p>
              </div>
              <Switch 
                id="maintenance-mode" 
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={handleResetToDefaults}
          disabled={updateSettingsMutation.isPending}
        >
          {t('admin_settings.reset_defaults', 'Reset to Defaults')}
        </Button>
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
    </div>
  );
};

export default GeneralSettings;
