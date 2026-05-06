export type User = {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName?: string;
  lastName?: string;
  name?: string; // This is already added
  created_at?: string;
  last_login?: string;
};

export type LoginResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  success: boolean;
};

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token?: string;
};