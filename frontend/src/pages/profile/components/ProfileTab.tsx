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
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Mettez à jour l'apparence de votre profil dans l'application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom d'affichage</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => {
                  setForm(s => ({ ...s, display_name: e.target.value }));
                  setDirty(true);
                }}
                placeholder="ex. Alex Mensah"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Nom légal</Label>
              <Input
                id="legal_name"
                value={form.legal_name}
                onChange={(e) => {
                  setForm(s => ({ ...s, legal_name: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => {
                  setForm(s => ({ ...s, phone: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays/Région</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => {
                  setForm(s => ({ ...s, country: e.target.value }));
                  setDirty(true);
                }}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(e) => {
                  setForm(s => ({ ...s, timezone: e.target.value }));
                  setDirty(true);
                }}
                placeholder="ex. Africa/Accra"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {dirty ? 'Vous avez des modifications non enregistrées.' : 'Votre profil est à jour.'}
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
                Annuler
              </Button>
              <Button type="button" onClick={() => updateMutation.mutate()} disabled={!canSave}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>Téléversez une photo de profil (PNG/JPG/WEBP).</CardDescription>
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
                    toast.error('La taille maximale de l\'avatar est de 2 Mo');
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
                Téléverser
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
              Supprimer l'avatar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Coordonnées de base et statut de vérification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">E-mail</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 break-all">{email}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {emailVerified ? 'Vérifié' : 'Non vérifié'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

