import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Save, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { profileService, UserProfileData } from '@/services/profileService';

type Props = {
  profile: UserProfileData;
  email: string;
  emailVerified: boolean;
};

function normalizeNullable(value: string) {
  const v = value.trim();
  return v.length ? v : null;
}

export default function ProfileTab({ profile, email, emailVerified }: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState({
    display_name: profile.display_name || '',
    legal_name: profile.legal_name || '',
    phone: profile.phone || '',
    country: profile.country || '',
    timezone: profile.timezone || '',
  });

  const [dirty, setDirty] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setForm({
      display_name: profile.display_name || '',
      legal_name: profile.legal_name || '',
      phone: profile.phone || '',
      country: profile.country || '',
      timezone: profile.timezone || '',
    });
    setDirty(false);
  }, [
    profile.display_name,
    profile.legal_name,
    profile.phone,
    profile.country,
    profile.timezone,
  ]);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return profileService.updateProfile({
        display_name: form.display_name.trim(),
        legal_name: normalizeNullable(form.legal_name),
        phone: normalizeNullable(form.phone),
        country: normalizeNullable(form.country),
        timezone: normalizeNullable(form.timezone),
      });
    },
    onSuccess: async () => {
      toast.success('Profile updated');
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      setDirty(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update profile');
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      return profileService.uploadAvatar(file);
    },
    onSuccess: async () => {
      toast.success('Avatar updated');
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to upload avatar');
    }
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      return profileService.removeAvatar();
    },
    onSuccess: async () => {
      toast.success('Avatar removed');
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to remove avatar');
    }
  });

  const canSave = form.display_name.trim().length >= 2 && dirty && !updateMutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Update how your profile appears across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => {
                  setForm(s => ({ ...s, display_name: e.target.value }));
                  setDirty(true);
                }}
                placeholder="e.g., Alex Mensah"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal name</Label>
              <Input
                id="legal_name"
                value={form.legal_name}
                onChange={(e) => {
                  setForm(s => ({ ...s, legal_name: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => {
                  setForm(s => ({ ...s, phone: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country/Region</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => {
                  setForm(s => ({ ...s, country: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(e) => {
                  setForm(s => ({ ...s, timezone: e.target.value }));
                  setDirty(true);
                }}
                placeholder="e.g., Africa/Accra"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {dirty ? 'You have unsaved changes.' : 'Your profile is up to date.'}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm({
                    display_name: profile.display_name || '',
                    legal_name: profile.legal_name || '',
                    phone: profile.phone || '',
                    country: profile.country || '',
                    timezone: profile.timezone || '',
                  });
                  setDirty(false);
                }}
                disabled={!dirty || updateMutation.isPending}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" onClick={() => updateMutation.mutate()} disabled={!canSave}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>Upload a profile photo (PNG/JPG/WEBP).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error('Max avatar size is 2MB');
                    e.target.value = '';
                    return;
                  }
                  uploadAvatarMutation.mutate(file);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
              >
                {uploadAvatarMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Upload
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700"
              onClick={() => removeAvatarMutation.mutate()}
              disabled={!profile.avatar_url || removeAvatarMutation.isPending}
            >
              {removeAvatarMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
              Remove avatar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Basic contact and verification status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 break-all">{email}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {emailVerified ? 'Verified' : 'Not verified'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

