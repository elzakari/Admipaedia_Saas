import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { KeyRound, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const TeacherSecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/users/profile', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.data?.success) {
        setSuccessMsg('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.data?.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'An error occurred while changing your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">Security Settings</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your credentials and MFA devices</p>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            Change Password
          </CardTitle>
          <CardDescription>Update your secure account password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
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

            <div className="space-y-1">
              <Label htmlFor="current-pw">Current Password</Label>
              <div className="relative max-w-md">
                <input
                  id="current-pw"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 pl-3 pr-10 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1">
                <Label htmlFor="new-pw">New Password</Label>
                <div className="relative">
                  <input
                    id="new-pw"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 chars"
                    required
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 pl-3 pr-10 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <div className="relative">
                  <input
                    id="confirm-pw"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 pl-3 pr-10 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Multi-Factor Authentication
          </CardTitle>
          <CardDescription>Secure your account with MFA for premium level protection</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate('/auth/mfa/setup')}>
            Set up MFA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherSecuritySettings;
