import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useToast } from '../ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  School, 
  Globe, 
  Calendar, 
  Clock, 
  Palette, 
  Bell, 
  Save, 
  RefreshCw
} from 'lucide-react';
import { settingsService } from '../../services';

interface SchoolSettings {
  // Basic Information
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  
  // Academic Settings
  academicYear: string;
  currentTerm: string;
  gradingSystem: string;
  passingGrade: number;
  maxStudentsPerClass: number;
  
  // System Settings
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  
  // Features
  enableSMS: boolean;
  enableEmail: boolean;
  enableParentPortal: boolean;
  enableOnlinePayments: boolean;
  enableAttendanceTracking: boolean;
  enableGradeBook: boolean;
  
  // Branding
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  favicon: string;
}

const SchoolSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [settings, setSettings] = useState<SchoolSettings>({
    name: 'ADMIPAEDIA Academy',
    code: 'ADM-12345',
    type: 'Secondary School',
    address: '123 Education Street',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-123-4567',
    phone: '+233 20 123 4567',
    email: 'info@admipaedia-academy.edu.gh',
    website: 'https://admipaedia-academy.edu.gh',
    academicYear: '2024/2025',
    currentTerm: 'First Term',
    gradingSystem: 'GES',
    passingGrade: 50,
    maxStudentsPerClass: 40,
    timezone: 'Africa/Accra',
    language: 'en',
    currency: 'GHS',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    enableSMS: true,
    enableEmail: true,
    enableParentPortal: true,
    enableOnlinePayments: false,
    enableAttendanceTracking: true,
    enableGradeBook: true,
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    logo: '',
    favicon: ''
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => settingsService.getSchoolSettings(),
  });

  useEffect(() => {
    if (currentSettings) setSettings(currentSettings as any)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: SchoolSettings) => settingsService.updateSchoolSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('school_settings.updated_title', 'Settings Updated'),
        description: t('school_settings.updated_desc', 'School settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
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

  const handleInputChange = (field: keyof SchoolSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
          <h2 className="text-2xl font-bold tracking-tight">{t('school_settings.title', 'School Settings')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('school_settings.subtitle', "Configure your school's information and preferences")}</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="flex items-center gap-2">
          {updateSettingsMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettingsMutation.isPending ? t('school_settings.saving', 'Saving...') : t('school_settings.save_changes', 'Save Changes')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="basic" className="min-w-[120px]">{t('school_settings.tabs.basic', 'Basic Info')}</TabsTrigger>
          <TabsTrigger value="academic" className="min-w-[120px]">{t('school_settings.tabs.academic', 'Academic')}</TabsTrigger>
          <TabsTrigger value="system" className="min-w-[120px]">{t('school_settings.tabs.system', 'System')}</TabsTrigger>
          <TabsTrigger value="features" className="min-w-[120px]">{t('school_settings.tabs.features', 'Features')}</TabsTrigger>
          <TabsTrigger value="branding" className="min-w-[120px]">{t('school_settings.tabs.branding', 'Branding')}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                {t('school_settings.basic.title', 'School Information')}
              </CardTitle>
              <CardDescription>{t('school_settings.basic.description', 'Basic information about your institution')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">{t('admin_settings.school_name', 'School Name')}</Label>
                  <Input
                    id="school-name"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-code">{t('admin_settings.school_code', 'School Code')}</Label>
                  <Input
                    id="school-code"
                    value={settings.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-type">{t('admin_settings.school_type', 'School Type')}</Label>
                  <Select value={settings.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary School">{t('admin_settings.primary_school', 'Primary School')}</SelectItem>
                      <SelectItem value="Junior High School">{t('admin_settings.junior_high_school', 'Junior High School')}</SelectItem>
                      <SelectItem value="Senior High School">{t('admin_settings.senior_high_school', 'Senior High School')}</SelectItem>
                      <SelectItem value="Technical School">{t('admin_settings.technical_school', 'Technical School')}</SelectItem>
                      <SelectItem value="International School">{t('admin_settings.international_school', 'International School')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('admin_settings.phone_number', 'Phone Number')}</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('admin_settings.email_address', 'Email Address')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t('admin_settings.website', 'Website')}</Label>
                  <Input
                    id="website"
                    value={settings.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('admin_settings.address_label', 'Address')}</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('admin_settings.city_label', 'City')}</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">{t('admin_settings.region_label', 'Region')}</Label>
                  <Select value={settings.region} onValueChange={(value) => handleInputChange('region', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Greater Accra">{t('admin_settings.greater_accra', 'Greater Accra')}</SelectItem>
                      <SelectItem value="Ashanti">{t('admin_settings.ashanti', 'Ashanti')}</SelectItem>
                      <SelectItem value="Western">{t('admin_settings.western', 'Western')}</SelectItem>
                      <SelectItem value="Central">{t('admin_settings.central', 'Central')}</SelectItem>
                      <SelectItem value="Eastern">{t('admin_settings.eastern', 'Eastern')}</SelectItem>
                      <SelectItem value="Volta">{t('admin_settings.volta', 'Volta')}</SelectItem>
                      <SelectItem value="Northern">{t('admin_settings.northern', 'Northern')}</SelectItem>
                      <SelectItem value="Upper East">{t('admin_settings.upper_east', 'Upper East')}</SelectItem>
                      <SelectItem value="Upper West">{t('admin_settings.upper_west', 'Upper West')}</SelectItem>
                      <SelectItem value="Brong Ahafo">{t('admin_settings.brong_ahafo', 'Brong Ahafo')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('admin_settings.country_label', 'Country')}</Label>
                  <Input
                    id="country"
                    value={settings.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code">{t('admin_settings.postal_code_label', 'Postal Code')}</Label>
                  <Input
                    id="postal-code"
                    value={settings.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('admin_settings.academic_config', 'Academic Configuration')}
              </CardTitle>
              <CardDescription>{t('admin_settings.academic_config_desc', 'Configure academic year and grading settings')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic-year">{t('admin_settings.academic_year_label', 'Academic Year')}</Label>
                  <Input
                    id="academic-year"
                    value={settings.academicYear}
                    onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-term">{t('admin_settings.current_term_label', 'Current Term')}</Label>
                  <Select value={settings.currentTerm} onValueChange={(value) => handleInputChange('currentTerm', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">{t('admin_settings.first_term', 'First Term')}</SelectItem>
                      <SelectItem value="Second Term">{t('admin_settings.second_term', 'Second Term')}</SelectItem>
                      <SelectItem value="Third Term">{t('admin_settings.third_term', 'Third Term')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grading-system">{t('admin_settings.grading_system_label', 'Grading System')}</Label>
                  <Select value={settings.gradingSystem} onValueChange={(value) => handleInputChange('gradingSystem', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GES">{t('admin_settings.ges_grading', 'Ghana Education Service (GES)')}</SelectItem>
                      <SelectItem value="WAEC">{t('admin_settings.waec_grading', 'West African Examinations Council (WAEC)')}</SelectItem>
                      <SelectItem value="IB">{t('admin_settings.ib_grading', 'International Baccalaureate (IB)')}</SelectItem>
                      <SelectItem value="Cambridge">{t('admin_settings.cambridge_grading', 'Cambridge International')}</SelectItem>
                      <SelectItem value="Custom">{t('admin_settings.custom_grading', 'Custom Grading System')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing-grade">{t('admin_settings.passing_grade_label', 'Passing Grade (%)')}</Label>
                  <Input
                    id="passing-grade"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.passingGrade}
                    onChange={(e) => handleInputChange('passingGrade', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-students">{t('admin_settings.max_students_label', 'Max Students per Class')}</Label>
                  <Input
                    id="max-students"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxStudentsPerClass}
                    onChange={(e) => handleInputChange('maxStudentsPerClass', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('admin_settings.system_config', 'System Configuration')}
              </CardTitle>
              <CardDescription>{t('admin_settings.system_config_desc', 'Configure system-wide settings and preferences')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t('admin_settings.timezone_label', 'Timezone')}</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="language">{t('admin_settings.default_language_label', 'Default Language')}</Label>
                  <Select value={settings.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('admin_settings.lang_en', 'English')}</SelectItem>
                      <SelectItem value="tw">{t('admin_settings.lang_tw', 'Twi')}</SelectItem>
                      <SelectItem value="ga">{t('admin_settings.lang_ga', 'Ga')}</SelectItem>
                      <SelectItem value="ewe">{t('admin_settings.lang_ewe', 'Ewe')}</SelectItem>
                      <SelectItem value="fr">{t('admin_settings.lang_fr', 'French')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('admin_settings.currency_label', 'Currency')}</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">{t('admin_settings.currency_ghs', 'Ghana Cedi (GHS)')}</SelectItem>
                      <SelectItem value="USD">{t('admin_settings.currency_usd', 'US Dollar (USD)')}</SelectItem>
                      <SelectItem value="EUR">{t('admin_settings.currency_eur', 'Euro (EUR)')}</SelectItem>
                      <SelectItem value="GBP">{t('admin_settings.currency_gbp', 'British Pound (GBP)')}</SelectItem>
                      <SelectItem value="NGN">{t('admin_settings.currency_ngn', 'Nigerian Naira (NGN)')}</SelectItem>
                      <SelectItem value="XOF">{t('admin_settings.currency_xof', 'West African CFA franc (XOF)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-format">{t('admin_settings.date_format_label', 'Date Format')}</Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => handleInputChange('dateFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-format">{t('admin_settings.time_format_label', 'Time Format')}</Label>
                  <Select value={settings.timeFormat} onValueChange={(value) => handleInputChange('timeFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">{t('admin_settings.time_12h', '12 Hour (AM/PM)')}</SelectItem>
                      <SelectItem value="24h">{t('admin_settings.time_24h', '24 Hour')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('admin_settings.feature_config', 'Feature Configuration')}
              </CardTitle>
              <CardDescription>{t('admin_settings.feature_config_desc', 'Enable or disable system features')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.sms_notifications', 'SMS Notifications')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.sms_notifications_desc', 'Send SMS notifications to parents and students')}</p>
                  </div>
                  <Switch
                    checked={settings.enableSMS}
                    onCheckedChange={(checked) => handleInputChange('enableSMS', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.email_notifications', 'Email Notifications')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.email_notifications_desc', 'Send email notifications and reports')}</p>
                  </div>
                  <Switch
                    checked={settings.enableEmail}
                    onCheckedChange={(checked) => handleInputChange('enableEmail', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.parent_portal_feature', 'Parent Portal')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.parent_portal_feature_desc', 'Allow parents to access student information')}</p>
                  </div>
                  <Switch
                    checked={settings.enableParentPortal}
                    onCheckedChange={(checked) => handleInputChange('enableParentPortal', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.online_payments_feature', 'Online Payments')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.online_payments_feature_desc', 'Accept online fee payments')}</p>
                  </div>
                  <Switch
                    checked={settings.enableOnlinePayments}
                    onCheckedChange={(checked) => handleInputChange('enableOnlinePayments', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.attendance_tracking_feature', 'Attendance Tracking')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.attendance_tracking_feature_desc', 'Track student and staff attendance')}</p>
                  </div>
                  <Switch
                    checked={settings.enableAttendanceTracking}
                    onCheckedChange={(checked) => handleInputChange('enableAttendanceTracking', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('admin_settings.grade_book_feature', 'Grade Book')}</Label>
                    <p className="text-sm text-gray-500">{t('admin_settings.grade_book_feature_desc', 'Enable digital grade book functionality')}</p>
                  </div>
                  <Switch
                    checked={settings.enableGradeBook}
                    onCheckedChange={(checked) => handleInputChange('enableGradeBook', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('admin_settings.branding_appearance', 'Branding & Appearance')}
              </CardTitle>
              <CardDescription>{t('admin_settings.branding_desc', 'Customize the look and feel of your system')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">{t('admin_settings.primary_color', 'Primary Color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">{t('admin_settings.secondary_color', 'Secondary Color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('admin_settings.school_logo', 'School Logo')}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <School className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          {t('admin_settings.upload_logo', 'Upload Logo')}
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('admin_settings.logo_requirements', 'PNG, JPG up to 2MB. Recommended: 200x200px')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_settings.favicon', 'Favicon')}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <div className="mx-auto w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          {t('admin_settings.upload_favicon', 'Upload Favicon')}
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('admin_settings.favicon_requirements', 'ICO, PNG 16x16px or 32x32px')}
                        </p>
                      </div>
                    </div>
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

export default SchoolSettings;
