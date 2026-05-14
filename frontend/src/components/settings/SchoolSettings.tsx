import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Clock, 
  DollarSign,
  Palette,
  Shield,
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
    if (currentSettings) setSettings(currentSettings)
  }, [currentSettings])

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: SchoolSettings) => settingsService.updateSchoolSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "School settings have been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
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
          <h2 className="text-2xl font-bold tracking-tight">School Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure your school's information and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="flex items-center gap-2">
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
          <TabsTrigger value="basic" className="min-w-[120px]">Basic Info</TabsTrigger>
          <TabsTrigger value="academic" className="min-w-[120px]">Academic</TabsTrigger>
          <TabsTrigger value="system" className="min-w-[120px]">System</TabsTrigger>
          <TabsTrigger value="features" className="min-w-[120px]">Features</TabsTrigger>
          <TabsTrigger value="branding" className="min-w-[120px]">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                School Information
              </CardTitle>
              <CardDescription>Basic information about your institution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-code">School Code</Label>
                  <Input
                    id="school-code"
                    value={settings.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-type">School Type</Label>
                  <Select value={settings.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary School">Primary School</SelectItem>
                      <SelectItem value="Junior High School">Junior High School</SelectItem>
                      <SelectItem value="Senior High School">Senior High School</SelectItem>
                      <SelectItem value="Technical School">Technical School</SelectItem>
                      <SelectItem value="International School">International School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={settings.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select value={settings.region} onValueChange={(value) => handleInputChange('region', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Greater Accra">Greater Accra</SelectItem>
                      <SelectItem value="Ashanti">Ashanti</SelectItem>
                      <SelectItem value="Western">Western</SelectItem>
                      <SelectItem value="Central">Central</SelectItem>
                      <SelectItem value="Eastern">Eastern</SelectItem>
                      <SelectItem value="Volta">Volta</SelectItem>
                      <SelectItem value="Northern">Northern</SelectItem>
                      <SelectItem value="Upper East">Upper East</SelectItem>
                      <SelectItem value="Upper West">Upper West</SelectItem>
                      <SelectItem value="Brong Ahafo">Brong Ahafo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={settings.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postal Code</Label>
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
                Academic Configuration
              </CardTitle>
              <CardDescription>Configure academic year and grading settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic-year">Academic Year</Label>
                  <Input
                    id="academic-year"
                    value={settings.academicYear}
                    onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-term">Current Term</Label>
                  <Select value={settings.currentTerm} onValueChange={(value) => handleInputChange('currentTerm', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grading-system">Grading System</Label>
                  <Select value={settings.gradingSystem} onValueChange={(value) => handleInputChange('gradingSystem', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GES">Ghana Education Service (GES)</SelectItem>
                      <SelectItem value="WAEC">West African Examinations Council (WAEC)</SelectItem>
                      <SelectItem value="IB">International Baccalaureate (IB)</SelectItem>
                      <SelectItem value="Cambridge">Cambridge International</SelectItem>
                      <SelectItem value="Custom">Custom Grading System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing-grade">Passing Grade (%)</Label>
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
                  <Label htmlFor="max-students">Max Students per Class</Label>
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
                System Configuration
              </CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
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
                  <Label htmlFor="language">Default Language</Label>
                  <Select value={settings.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="tw">Twi</SelectItem>
                      <SelectItem value="ga">Ga</SelectItem>
                      <SelectItem value="ewe">Ewe</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">Ghana Cedi (GHS)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
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
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select value={settings.timeFormat} onValueChange={(value) => handleInputChange('timeFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
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
                Feature Configuration
              </CardTitle>
              <CardDescription>Enable or disable system features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Send SMS notifications to parents and students</p>
                  </div>
                  <Switch
                    checked={settings.enableSMS}
                    onCheckedChange={(checked) => handleInputChange('enableSMS', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Send email notifications and reports</p>
                  </div>
                  <Switch
                    checked={settings.enableEmail}
                    onCheckedChange={(checked) => handleInputChange('enableEmail', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Parent Portal</Label>
                    <p className="text-sm text-gray-500">Allow parents to access student information</p>
                  </div>
                  <Switch
                    checked={settings.enableParentPortal}
                    onCheckedChange={(checked) => handleInputChange('enableParentPortal', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Online Payments</Label>
                    <p className="text-sm text-gray-500">Accept online fee payments</p>
                  </div>
                  <Switch
                    checked={settings.enableOnlinePayments}
                    onCheckedChange={(checked) => handleInputChange('enableOnlinePayments', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Attendance Tracking</Label>
                    <p className="text-sm text-gray-500">Track student and staff attendance</p>
                  </div>
                  <Switch
                    checked={settings.enableAttendanceTracking}
                    onCheckedChange={(checked) => handleInputChange('enableAttendanceTracking', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Grade Book</Label>
                    <p className="text-sm text-gray-500">Enable digital grade book functionality</p>
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
                Branding & Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of your system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
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
                  <Label htmlFor="secondary-color">Secondary Color</Label>
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
                  <Label>School Logo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <School className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          Upload Logo
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 2MB. Recommended: 200x200px
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <div className="mx-auto w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          Upload Favicon
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          ICO, PNG 16x16px or 32x32px
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
