import api from '@/lib/api';

export type ProfileTabKey = 'profile' | 'security' | 'preferences';

export type ThemeMode = 'system' | 'light' | 'dark' | 'gradient' | 'casaos';
export type DateTimeFormat = 'auto' | '12h' | '24h';

export interface UserProfileData {
  display_name: string;
  legal_name: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at: string | null;
}

export interface UserPreferencesData {
  theme_mode: ThemeMode;
  language: string;
  date_time_format: DateTimeFormat;
  default_profile_tab: ProfileTabKey;
  notify_product_updates: boolean;
  notify_security_alerts: boolean;
  updated_at: string | null;
  created_at: string | null;
}

export interface ProfileMeResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    email_verified: boolean;
    mfa_enabled: boolean;
    created_at: string | null;
    last_login: string | null;
    password_changed_at: string | null;
  };
  profile: UserProfileData;
  preferences: UserPreferencesData;
}

export interface SessionInfo {
  id: number;
  token_type: string;
  ip_address: string | null;
  user_agent: string | null;
  issued_at: string;
  expires_at: string;
  last_used_at: string | null;
  is_current: boolean;
  revocation_reason?: string | null;
}

export interface SecurityEventInfo {
  id: number;
  event_type: string;
  severity: string;
  created_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any> | null;
}

export const profileService = {
  getMe: async (): Promise<ProfileMeResponse> => {
    const res = await api.get('/profile/me');
    return res.data;
  },

  updateProfile: async (payload: Pick<UserProfileData, 'display_name' | 'legal_name' | 'phone' | 'country' | 'timezone'>) => {
    const res = await api.put('/profile/me', payload);
    return res.data as { success: boolean; profile: UserProfileData };
  },

  getPreferences: async (): Promise<UserPreferencesData> => {
    const res = await api.get('/profile/preferences');
    return (res.data?.preferences ?? res.data) as UserPreferencesData;
  },

  updatePreferences: async (payload: Partial<UserPreferencesData>) => {
    const res = await api.put('/profile/preferences', payload);
    return res.data as { success: boolean; preferences: UserPreferencesData };
  },

  listSessions: async (): Promise<SessionInfo[]> => {
    const res = await api.get('/profile/sessions');
    return res.data.sessions;
  },

  revokeSession: async (sessionId: number) => {
    const res = await api.delete(`/profile/sessions/${sessionId}`);
    return res.data;
  },

  revokeOtherSessions: async () => {
    const res = await api.post('/profile/sessions/revoke-others');
    return res.data;
  },

  listSecurityEvents: async (limit = 20): Promise<SecurityEventInfo[]> => {
    const res = await api.get('/profile/security-events', { params: { limit } });
    return res.data.events;
  },

  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data as { success: boolean; avatar_url: string };
  },

  removeAvatar: async () => {
    const res = await api.delete('/profile/avatar');
    return res.data as { success: boolean };
  }
};

