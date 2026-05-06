import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';

const TeacherSecuritySettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security</h2>
        <p className="text-gray-500 dark:text-gray-400">Manage your password and multi-factor authentication</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            Password
          </CardTitle>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/profile')}>
            Open Profile to change password
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Multi‑Factor Authentication
          </CardTitle>
          <CardDescription>Secure your account with MFA</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/auth/mfa/setup')}>
            Set up MFA
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherSecuritySettings;

