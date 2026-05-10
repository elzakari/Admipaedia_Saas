import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
        title: "Settings Updated",
        description: "General settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['general-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
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
      title: "Settings Reset",
      description: "Settings have been reset to defaults.",
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
          <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure basic system settings and defaults</p>
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

      {/* AI Recommendations Banner */}
      {settings.aiRecommendations && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">AI Recommendations</h3>
              <div className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">
                <p>Based on your location, we recommend using Ghana Education Service (GES) grading system and West Africa Time (GMT+0).</p>
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
                    title: "Recommendations Applied",
                    description: "Settings updated based on AI recommendations.",
                    variant: "default"
                  });
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>Basic information about your institution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name</Label>
              <Input 
                id="school-name" 
                value={settings.schoolName} 
                onChange={(e) => handleInputChange('schoolName', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-code">School Code</Label>
              <Input 
                id="school-code" 
                value={settings.schoolCode}
                onChange={(e) => handleInputChange('schoolCode', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-email">School Email</Label>
              <Input 
                id="school-email" 
                type="email" 
                value={settings.schoolEmail}
                onChange={(e) => handleInputChange('schoolEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone">School Phone</Label>
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
          <CardTitle>System Defaults</CardTitle>
          <CardDescription>Default settings for the entire system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
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
              <Label htmlFor="language">Default Language</Label>
              <Select value={settings.language} onValueChange={(value) => handleInputChange('language', value)}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
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
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
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
              <Label htmlFor="date-format">Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => handleInputChange('dateFormat', value)}>
                <SelectTrigger id="date-format">
                  <SelectValue placeholder="Select date format" />
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
                <Label htmlFor="ai-recommendations">AI Recommendations</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow AI to suggest optimal settings based on your usage
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
                <Label htmlFor="auto-backup">Automatic Backups</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create daily backups of your system data
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
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Temporarily disable access for non-admin users
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
          Reset to Defaults
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
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
