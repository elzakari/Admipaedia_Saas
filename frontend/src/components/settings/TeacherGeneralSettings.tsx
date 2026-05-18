import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, User, Phone, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { applyDocumentLanguage, markLanguageOverride } from '@/lib/countryLanguage';
import teacherService from '../../services/teacherService';
import api from '../../lib/api';

const supportedLanguages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' }
];

const TeacherGeneralSettings: React.FC = () => {
  const { i18n } = useTranslation();

  const initialLanguage = useMemo(() => {
    const current = String(i18n.language || 'en').split('-')[0];
    return supportedLanguages.some((l) => l.value === current) ? current : 'en';
  }, [i18n.language]);

  const [language, setLanguage] = useState<string>(initialLanguage);
  const [profile, setProfile] = useState<any>(null);
  
  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await teacherService.getOwnProfile();
        if (active && data) {
          setProfile(data);
          setFirstName(data.user?.first_name || '');
          setLastName(data.user?.last_name || '');
          setEmail(data.user?.email || '');
          setPhone(data.phone_number || '');
        }
      } catch (err: any) {
        console.error('Failed to fetch profile', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchProfile();
    return () => { active = false; };
  }, []);

  const onChangeLanguage = (value: string) => {
    setLanguage(value);
    markLanguageOverride();
    void i18n.changeLanguage(value);
    applyDocumentLanguage(value);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.put('/users/profile', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      });

      if (res.data?.success) {
        setSuccessMsg('Profile updated successfully.');
      } else {
        setErrorMsg(res.data?.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'An error occurred during profile update.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">Profile & General Settings</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your active identity preferences and contact details</p>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Personal Details
          </CardTitle>
          <CardDescription>Update your name, email address, and phone number below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm border border-rose-100 dark:border-rose-900/50">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first-name">First Name</Label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="last-name">Last Name</Label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email-addr" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address</Label>
                <input
                  id="email-addr"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  required
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone-num" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number</Label>
                <input
                  id="phone-num"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Choose how ADMIPEDIA is displayed for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="teacher-preferred-language">Preferred language</Label>
          <Select value={language} onValueChange={onChangeLanguage}>
            <SelectTrigger id="teacher-preferred-language" className="max-w-sm rounded-xl">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherGeneralSettings;
