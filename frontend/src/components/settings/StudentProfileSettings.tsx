import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { studentService } from '../../services/studentService';

const StudentProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getDashboardSummary();
        setProfile(data.student);
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="p-4">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('student_settings.profile_parameters', 'Profile Parameters')}</CardTitle>
          <CardDescription>View and manage your student profile data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Full Name</label>
              <div className="mt-1 text-sm">{profile?.full_name || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Admission Number</label>
              <div className="mt-1 text-sm">{profile?.admission_number || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Date of Birth</label>
              <div className="mt-1 text-sm">{profile?.date_of_birth || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Gender</label>
              <div className="mt-1 text-sm">{profile?.gender || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfileSettings;
