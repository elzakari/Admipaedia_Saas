import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Save, 
  Loader2, 
  CreditCard, 
  Globe, 
  Bell,
  Shield,
  Smartphone,
  RotateCcw,
  Send
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const SystemSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [admissionPrice, setAdmissionPrice] = useState<string>('');
  const [onlineSubmissions, setOnlineSubmissions] = useState<boolean>(true);
  const [autoGenerateIds, setAutoGenerateIds] = useState<boolean>(true);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState<boolean>(true);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [mobileAppEnabled, setMobileAppEnabled] = useState<boolean>(true);

  const [timezone, setTimezone] = useState<string>('Africa/Accra');
  const [language, setLanguage] = useState<string>('en');
  const [currency, setCurrency] = useState<string>('GHS');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');

  const [testEmail, setTestEmail] = useState<string>('');
  const [testPhone, setTestPhone] = useState<string>('');

  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({});

  const markSaved = (key: string) => {
    const now = Date.now();
    setSavedKeys((prev) => ({ ...prev, [key]: now }));
    window.setTimeout(() => {
      setSavedKeys((prev) => {
        if (prev[key] !== now) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1500);
  };

  const asBool = (v: any, fallback: boolean) => {
    if (v === undefined || v === null) return fallback;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return fallback;
  };

  // Fetch settings
  const { isLoading, data: rawSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/settings/');
      const data = response.data.data;
      if (data.admission_form_price) {
        setAdmissionPrice(data.admission_form_price);
      }
      if (data.admissions_online_submissions !== undefined) {
        setOnlineSubmissions(asBool(data.admissions_online_submissions, true));
      }
      if (data.admissions_auto_generate_ids !== undefined) {
        setAutoGenerateIds(asBool(data.admissions_auto_generate_ids, true));
      }
      if (data.maintenance_mode !== undefined) {
        setMaintenanceMode(asBool(data.maintenance_mode, false));
      }
      if (data.notifications_email_enabled !== undefined) {
        setEmailAlertsEnabled(asBool(data.notifications_email_enabled, true));
      }
      if (data.notifications_sms_enabled !== undefined) {
        setSmsAlertsEnabled(asBool(data.notifications_sms_enabled, true));
      }
      if (data.security_mfa_enabled !== undefined) {
        setMfaEnabled(asBool(data.security_mfa_enabled, false));
      }
      if (data.mobile_app_enabled !== undefined) {
        setMobileAppEnabled(asBool(data.mobile_app_enabled, true));
      }

      if (data.general_timezone) setTimezone(String(data.general_timezone));
      if (data.general_language) setLanguage(String(data.general_language));
      if (data.general_currency) setCurrency(String(data.general_currency));
      if (data.general_date_format) setDateFormat(String(data.general_date_format));
      return data;
    }
  });

  const settings = useMemo(() => {
    return rawSettings || {};
  }, [rawSettings]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async (payload: { key: string, value: string, setting_type?: string }) => {
      const response = await api.post('/settings/update', payload);
      return response.data;
    },
    onMutate: async (vars) => {
      setSavingKeys((prev) => ({ ...prev, [vars.key]: true }));
      return { key: vars.key };
    },
    onSuccess: (_data, vars) => {
      markSaved(vars.key);
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admission-price'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update setting');
    },
    onSettled: (_data, _error, vars) => {
      setSavingKeys((prev) => {
        const next = { ...prev };
        delete next[vars.key];
        return next;
      });
    }
  });

  const handleUpdatePrice = () => {
    if (!admissionPrice || isNaN(parseFloat(admissionPrice))) {
      toast.error('Please enter a valid price');
      return;
    }
    updateSettingMutation.mutate({
      key: 'admission_form_price',
      value: admissionPrice,
      setting_type: 'float'
    });
  };

  const handleUpdateTextSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value, setting_type: 'string' });
  };

  const updateBooleanSetting = (key: string, value: boolean) => {
    updateSettingMutation.mutate({ key, value: value ? 'true' : 'false', setting_type: 'boolean' });
  };

  const isSaving = (key: string) => Boolean(savingKeys[key]);
  const isSaved = (key: string) => Boolean(savedKeys[key]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="mt-4 text-gray-500">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure global school parameters and preferences</p>
      </div>

      <Tabs defaultValue="admissions" className="space-y-6">
        <TabsList className="bg-white border p-1 h-auto grid grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="admissions" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <CreditCard size={16} className="mr-2" /> Admissions
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Globe size={16} className="mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Bell size={16} className="mr-2" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Shield size={16} className="mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="mobile" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Smartphone size={16} className="mr-2" /> Mobile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admissions" className="animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Admission Configuration</CardTitle>
              <CardDescription>Set the cost and basic rules for student applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <Label htmlFor="admissionPrice">Admission Form Price (GHS)</Label>
                <div className="flex gap-3">
                  <Input 
                    id="admissionPrice"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={admissionPrice}
                    onChange={(e) => setAdmissionPrice(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdatePrice}
                    disabled={updateSettingMutation.isPending || isSaving('admission_form_price')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                  >
                    {isSaving('admission_form_price') ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} className="mr-2" />
                    )}
                    Save Price
                  </Button>
                </div>
                {isSaved('admission_form_price') ? (
                  <div className="text-xs text-emerald-600">Saved</div>
                ) : null}
                <p className="text-[11px] text-gray-400 italic">
                  This price will be displayed to parents when they purchase a new admission form.
                </p>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold mb-4">Other Admission Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">Online Submissions</p>
                      <p className="text-xs text-gray-500">Allow parents to submit forms online</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSaving('admissions_online_submissions') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                      {isSaved('admissions_online_submissions') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                      <Switch
                      checked={onlineSubmissions}
                      onCheckedChange={(checked) => {
                        setOnlineSubmissions(checked);
                        updateBooleanSetting('admissions_online_submissions', checked);
                      }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">Auto-generate IDs</p>
                      <p className="text-xs text-gray-500">Assign application IDs automatically</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSaving('admissions_auto_generate_ids') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                      {isSaved('admissions_auto_generate_ids') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                      <Switch
                      checked={autoGenerateIds}
                      onCheckedChange={(checked) => {
                        setAutoGenerateIds(checked);
                        updateBooleanSetting('admissions_auto_generate_ids', checked);
                      }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOnlineSubmissions(true);
                      setAutoGenerateIds(true);
                      updateBooleanSetting('admissions_online_submissions', true);
                      updateBooleanSetting('admissions_auto_generate_ids', true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset admissions defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure school identity and localization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Maintenance Mode</p>
                  <p className="text-xs text-gray-500">Temporarily disable user access for maintenance</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('maintenance_mode') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('maintenance_mode') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const ok = confirm('Enable Maintenance Mode? This may block normal user access.');
                        if (!ok) return;
                      }
                      setMaintenanceMode(checked);
                      updateBooleanSetting('maintenance_mode', checked);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={timezone}
                    onValueChange={(v) => {
                      setTimezone(v);
                      handleUpdateTextSetting('general_timezone', v);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Accra">Africa/Accra</SelectItem>
                      <SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('general_timezone') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => {
                      setLanguage(v);
                      handleUpdateTextSetting('general_language', v);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('general_language') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(v) => {
                      setCurrency(v);
                      handleUpdateTextSetting('general_currency', v);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHS">GHS</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('general_currency') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Date format</Label>
                  <Select
                    value={dateFormat}
                    onValueChange={(v) => {
                      setDateFormat(v);
                      handleUpdateTextSetting('general_date_format', v);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('general_date_format') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>
              </div>

              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTimezone('Africa/Accra');
                    setLanguage('en');
                    setCurrency('GHS');
                    setDateFormat('DD/MM/YYYY');
                    handleUpdateTextSetting('general_timezone', 'Africa/Accra');
                    handleUpdateTextSetting('general_language', 'en');
                    handleUpdateTextSetting('general_currency', 'GHS');
                    handleUpdateTextSetting('general_date_format', 'DD/MM/YYYY');
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset localization defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Alert Settings</CardTitle>
              <CardDescription>Enable or disable system-wide alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Email Alerts</p>
                  <p className="text-xs text-gray-500">Allow email-based alerts</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('notifications_email_enabled') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('notifications_email_enabled') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                  checked={emailAlertsEnabled}
                  onCheckedChange={(checked) => {
                    setEmailAlertsEnabled(checked);
                    updateBooleanSetting('notifications_email_enabled', checked);
                  }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">SMS Alerts</p>
                  <p className="text-xs text-gray-500">Allow SMS-based alerts</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('notifications_sms_enabled') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('notifications_sms_enabled') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                  checked={smsAlertsEnabled}
                  onCheckedChange={(checked) => {
                    setSmsAlertsEnabled(checked);
                    updateBooleanSetting('notifications_sms_enabled', checked);
                  }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label>Test email</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="name@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!testEmail.trim()}
                      onClick={() => {
                        toast.promise(
                          api.post('/settings/notifications/test-email', { testEmail: testEmail.trim() }),
                          {
                            loading: 'Sending test email…',
                            success: 'Email test OK',
                            error: 'Email test failed'
                          }
                        );
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Test SMS</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+233201234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!testPhone.trim()}
                      onClick={() => {
                        toast.promise(
                          api.post('/settings/notifications/test-sms', { testPhone: testPhone.trim() }),
                          {
                            loading: 'Sending test SMS…',
                            success: 'SMS test OK',
                            error: 'SMS test failed'
                          }
                        );
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailAlertsEnabled(true);
                    setSmsAlertsEnabled(true);
                    updateBooleanSetting('notifications_email_enabled', true);
                    updateBooleanSetting('notifications_sms_enabled', true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset alerts defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Basic security configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Multi-factor Authentication</p>
                  <p className="text-xs text-gray-500">Require MFA for sign-in</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('security_mfa_enabled') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('security_mfa_enabled') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                  checked={mfaEnabled}
                  onCheckedChange={(checked) => {
                    setMfaEnabled(checked);
                    updateBooleanSetting('security_mfa_enabled', checked);
                  }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMfaEnabled(false);
                    updateBooleanSetting('security_mfa_enabled', false);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset security defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Settings</CardTitle>
              <CardDescription>Mobile app availability and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Enable Mobile App</p>
                  <p className="text-xs text-gray-500">Allow mobile clients to connect</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('mobile_app_enabled') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('mobile_app_enabled') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                  checked={mobileAppEnabled}
                  onCheckedChange={(checked) => {
                    setMobileAppEnabled(checked);
                    updateBooleanSetting('mobile_app_enabled', checked);
                  }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileAppEnabled(true);
                    updateBooleanSetting('mobile_app_enabled', true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset mobile defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettingsPage;
