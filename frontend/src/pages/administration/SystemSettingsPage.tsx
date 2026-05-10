import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Save, 
  Loader2, 
  Globe, 
  Bell,
  Shield,
  RotateCcw,
  KeyRound,
  Building2,
  ClipboardList
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
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [termsUrl, setTermsUrl] = useState<string>('');
  const [privacyUrl, setPrivacyUrl] = useState<string>('');

  const [defaultCountryCode, setDefaultCountryCode] = useState<string>('GH');
  const [defaultTimezone, setDefaultTimezone] = useState<string>('Africa/Accra');
  const [defaultLanguage, setDefaultLanguage] = useState<string>('en');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('GHS');
  const [defaultInviteExpiryDays, setDefaultInviteExpiryDays] = useState<string>('7');
  const [allowPublicRegistration, setAllowPublicRegistration] = useState<boolean>(false);

  const [defaultPlan, setDefaultPlan] = useState<string>('trial');
  const [trialDays, setTrialDays] = useState<string>('14');
  const [defaultStudentLimit, setDefaultStudentLimit] = useState<string>('0');

  const [superAdminMfaRequired, setSuperAdminMfaRequired] = useState<boolean>(false);

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

  const asString = (v: any, fallback: string) => {
    if (v === undefined || v === null) return fallback;
    return String(v);
  };

  const asIntString = (v: any, fallback: string) => {
    if (v === undefined || v === null || String(v).trim() === '') return fallback;
    const n = Number.parseInt(String(v), 10);
    if (Number.isNaN(n)) return fallback;
    return String(n);
  };

  // Fetch settings
  const { isLoading, data: rawSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/platform/settings');
      return response.data.data;
    }
  });

  const settings = useMemo(() => {
    return rawSettings || {};
  }, [rawSettings]);

  useEffect(() => {
    if (!settings) return;
    setMaintenanceMode(asBool((settings as any).maintenance_mode, false));
    setSupportEmail(asString((settings as any).platform_support_email, ''));
    setTermsUrl(asString((settings as any).platform_terms_url, ''));
    setPrivacyUrl(asString((settings as any).platform_privacy_url, ''));

    setDefaultCountryCode(asString((settings as any).tenancy_default_country_code, 'GH').toUpperCase());
    setDefaultTimezone(asString((settings as any).tenancy_default_timezone, 'Africa/Accra'));
    setDefaultLanguage(asString((settings as any).tenancy_default_language, 'en'));
    setDefaultCurrency(asString((settings as any).tenancy_default_currency, 'GHS').toUpperCase());
    setDefaultInviteExpiryDays(asIntString((settings as any).tenancy_default_invite_expiry_days, '7'));
    setAllowPublicRegistration(asBool((settings as any).platform_allow_public_registration, false));

    setDefaultPlan(asString((settings as any).licensing_default_plan, 'trial'));
    setTrialDays(asIntString((settings as any).licensing_trial_days, '14'));
    setDefaultStudentLimit(asIntString((settings as any).licensing_default_student_limit, '0'));

    setSuperAdminMfaRequired(asBool((settings as any).platform_super_admin_mfa_required, false));
  }, [settings]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async (payload: { key: string, value: string, setting_type?: string }) => {
      const response = await api.post('/platform/settings/update', payload);
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

  const handleUpdateTextSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value, setting_type: 'string' });
  };

  const handleUpdateIntSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value, setting_type: 'int' });
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
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global platform parameters, tenant defaults, and licensing</p>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="bg-white border p-1 h-auto grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="platform" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Settings size={16} className="mr-2" /> Platform
          </TabsTrigger>
          <TabsTrigger value="tenancy" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <Building2 size={16} className="mr-2" /> Tenancy
          </TabsTrigger>
          <TabsTrigger value="licensing" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <ClipboardList size={16} className="mr-2" /> Licensing
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2">
            <KeyRound size={16} className="mr-2" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="animate-in fade-in duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>Global operational parameters (not school-specific)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Maintenance Mode</p>
                  <p className="text-xs text-gray-500">Temporarily disable user access platform-wide</p>
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
                  <Label>Support email</Label>
                  <Input
                    placeholder="support@admipaedia.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    onBlur={() => handleUpdateTextSetting('platform_support_email', supportEmail.trim())}
                  />
                  {isSaved('platform_support_email') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Terms of Service URL</Label>
                  <Input
                    placeholder="https://admipaedia.com/terms"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    onBlur={() => handleUpdateTextSetting('platform_terms_url', termsUrl.trim())}
                  />
                  {isSaved('platform_terms_url') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Privacy Policy URL</Label>
                  <Input
                    placeholder="https://admipaedia.com/privacy"
                    value={privacyUrl}
                    onChange={(e) => setPrivacyUrl(e.target.value)}
                    onBlur={() => handleUpdateTextSetting('platform_privacy_url', privacyUrl.trim())}
                  />
                  {isSaved('platform_privacy_url') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-sm">Allow Public Registration</p>
                    <p className="text-xs text-gray-500">If disabled, registration is invite-only</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSaving('platform_allow_public_registration') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                    {isSaved('platform_allow_public_registration') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                    <Switch
                      checked={allowPublicRegistration}
                      onCheckedChange={(checked) => {
                        setAllowPublicRegistration(checked)
                        updateBooleanSetting('platform_allow_public_registration', checked)
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMaintenanceMode(false);
                    setAllowPublicRegistration(false);
                    updateBooleanSetting('maintenance_mode', false);
                    updateBooleanSetting('platform_allow_public_registration', false);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset platform defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenancy">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Defaults</CardTitle>
              <CardDescription>Defaults applied when creating new schools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default country code</Label>
                  <Select
                    value={defaultCountryCode}
                    onValueChange={(v) => {
                      setDefaultCountryCode(v.toUpperCase())
                      handleUpdateTextSetting('tenancy_default_country_code', v.toUpperCase())
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GH">Ghana (GH)</SelectItem>
                      <SelectItem value="NG">Nigeria (NG)</SelectItem>
                      <SelectItem value="KE">Kenya (KE)</SelectItem>
                      <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                      <SelectItem value="US">United States (US)</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('tenancy_default_country_code') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Default timezone</Label>
                  <Select
                    value={defaultTimezone}
                    onValueChange={(v) => {
                      setDefaultTimezone(v)
                      handleUpdateTextSetting('tenancy_default_timezone', v)
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
                  {isSaved('tenancy_default_timezone') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Default language</Label>
                  <Select
                    value={defaultLanguage}
                    onValueChange={(v) => {
                      setDefaultLanguage(v)
                      handleUpdateTextSetting('tenancy_default_language', v)
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
                  {isSaved('tenancy_default_language') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Default currency</Label>
                  <Select
                    value={defaultCurrency}
                    onValueChange={(v) => {
                      setDefaultCurrency(v.toUpperCase())
                      handleUpdateTextSetting('tenancy_default_currency', v.toUpperCase())
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
                  {isSaved('tenancy_default_currency') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Default invite expiry (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={defaultInviteExpiryDays}
                    onChange={(e) => setDefaultInviteExpiryDays(e.target.value)}
                    onBlur={() => handleUpdateIntSetting('tenancy_default_invite_expiry_days', defaultInviteExpiryDays)}
                  />
                  {isSaved('tenancy_default_invite_expiry_days') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDefaultCountryCode('GH')
                    setDefaultTimezone('Africa/Accra')
                    setDefaultLanguage('en')
                    setDefaultCurrency('GHS')
                    setDefaultInviteExpiryDays('7')
                    handleUpdateTextSetting('tenancy_default_country_code', 'GH')
                    handleUpdateTextSetting('tenancy_default_timezone', 'Africa/Accra')
                    handleUpdateTextSetting('tenancy_default_language', 'en')
                    handleUpdateTextSetting('tenancy_default_currency', 'GHS')
                    handleUpdateIntSetting('tenancy_default_invite_expiry_days', '7')
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset tenant defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="licensing">
          <Card>
            <CardHeader>
              <CardTitle>Licensing & Plans</CardTitle>
              <CardDescription>Defaults for new tenants and high-level license rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default plan</Label>
                  <Select
                    value={defaultPlan}
                    onValueChange={(v) => {
                      setDefaultPlan(v)
                      handleUpdateTextSetting('licensing_default_plan', v)
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSaved('licensing_default_plan') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Trial days</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    onBlur={() => handleUpdateIntSetting('licensing_trial_days', trialDays)}
                  />
                  {isSaved('licensing_trial_days') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>

                <div className="space-y-2">
                  <Label>Default student limit (0 = unlimited)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={defaultStudentLimit}
                    onChange={(e) => setDefaultStudentLimit(e.target.value)}
                    onBlur={() => handleUpdateIntSetting('licensing_default_student_limit', defaultStudentLimit)}
                  />
                  {isSaved('licensing_default_student_limit') ? <div className="text-xs text-emerald-600">Saved</div> : null}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDefaultPlan('trial')
                    setTrialDays('14')
                    setDefaultStudentLimit('0')
                    handleUpdateTextSetting('licensing_default_plan', 'trial')
                    handleUpdateIntSetting('licensing_trial_days', '14')
                    handleUpdateIntSetting('licensing_default_student_limit', '0')
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset licensing defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Platform Security</CardTitle>
              <CardDescription>Controls for super admin access and platform hardening</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Require MFA for Super Admins</p>
                  <p className="text-xs text-gray-500">Enforce MFA policy at the platform level</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('platform_super_admin_mfa_required') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('platform_super_admin_mfa_required') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                    checked={superAdminMfaRequired}
                    onCheckedChange={(checked) => {
                      setSuperAdminMfaRequired(checked);
                      updateBooleanSetting('platform_super_admin_mfa_required', checked);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Global alerts</p>
                  <p className="text-xs text-gray-500">Enable platform-level alerting features</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('platform_alerts_enabled') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('platform_alerts_enabled') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                    checked={asBool((settings as any).platform_alerts_enabled, true)}
                    onCheckedChange={(checked) => {
                      updateBooleanSetting('platform_alerts_enabled', checked)
                    }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuperAdminMfaRequired(false);
                    updateBooleanSetting('platform_super_admin_mfa_required', false);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset security defaults
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
