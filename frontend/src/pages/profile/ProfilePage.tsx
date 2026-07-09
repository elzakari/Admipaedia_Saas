import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Shield, SlidersHorizontal, User as UserIcon } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { profileService, ProfileTabKey } from '@/services/profileService';
import { resolveAvatarUrl } from '@/utils/avatar';
import ProfileHeader from './components/ProfileHeader';
import ProfileTab from './components/ProfileTab';
import SecurityTab from './components/SecurityTab';
import PreferencesTab from './components/PreferencesTab';

const VALID_TABS: ProfileTabKey[] = ['profile', 'security', 'preferences'];

function getTabFromParams(raw: string | null): ProfileTabKey | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  return (VALID_TABS as string[]).includes(v) ? (v as ProfileTabKey) : null;
}

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = getTabFromParams(searchParams.get('tab'));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile-me'],
    queryFn: profileService.getMe,
  });

  const prefsDefault = data?.preferences?.default_profile_tab;
  const activeTab: ProfileTabKey = urlTab || prefsDefault || 'profile';

  const setTab = (tab: ProfileTabKey) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="font-semibold">Failed to load your profile</div>
          <div className="text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</div>
        </div>
      </div>
    );
  }

  const avatarUrl = resolveAvatarUrl(data.profile.avatar_url);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <ProfileHeader
        avatarUrl={avatarUrl}
        displayName={data.profile.display_name || data.user.username}
        email={data.user.email}
        role={data.user.role}
        emailVerified={data.user.email_verified}
        mfaEnabled={data.user.mfa_enabled}
        updatedAt={data.profile.updated_at}
      />

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab
            profile={data.profile}
            email={data.user.email}
            emailVerified={data.user.email_verified}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecurityTab
            mfaEnabled={data.user.mfa_enabled}
            passwordChangedAt={data.user.password_changed_at}
          />
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <PreferencesTab preferences={data.preferences} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
