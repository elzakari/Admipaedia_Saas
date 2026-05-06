/**
 * Enhanced Authentication TypeScript Interfaces
 * Aligned with backend enhanced authentication models
 */

// Base User Interface (aligned with backend User model)
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  profile_image?: string;
  
  // Enhanced security fields
  mfa_enabled: boolean;
  security_settings?: UserSecuritySettings;
  
  // Legacy compatibility
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PARENT = 'parent'
}

// MFA Device Interface
export interface MFADevice {
  id: number;
  user_id: number;
  device_name: string;
  device_type: 'totp' | 'sms' | 'email';
  secret_key?: string;
  backup_codes?: string[];
  phone_number?: string;
  email_address?: string;
  is_active: boolean;
  is_verified: boolean;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

// Trusted Device Interface
export interface TrustedDevice {
  id: number;
  user_id: number;
  device_fingerprint: string;
  device_name?: string;
  user_agent?: string;
  ip_address?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  is_trusted: boolean;
  trust_expires_at?: string;
  last_seen: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

// Authentication Attempt Interface
export interface AuthenticationAttempt {
  id: number;
  user_id?: number;
  identifier: string;
  attempt_type: 'login' | 'mfa' | 'password_reset';
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  country?: string;
  city?: string;
  risk_score: number;
  is_suspicious: boolean;
  blocked_reason?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  attempted_at: string;
}

// User Security Settings Interface
export interface UserSecuritySettings {
  id: number;
  user_id: number;
  mfa_enabled: boolean;
  mfa_method: 'totp' | 'sms' | 'email' | null;
  session_timeout: number;
  max_concurrent_sessions: number;
  require_password_change: boolean;
  password_expires_at?: string;
  two_factor_backup_codes?: string[];
  login_notifications: boolean;
  suspicious_activity_alerts: boolean;
  created_at: string;
  updated_at: string;
}

// Password Reset Token Interface
export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Enhanced Login Request Interface
export interface EnhancedLoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  device_info?: {
    name?: string;
    type?: string;
    os?: string;
    browser?: string;
  };
  mfa_code?: string;
  trust_device?: boolean;
}

// Enhanced Login Response Interface
export interface EnhancedLoginResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    session_info: {
      session_id: string;
      expires_at: string;
      device_fingerprint: string;
    };
    mfa_required?: boolean;
    mfa_token?: string;
    trusted_device?: boolean;
    security_alerts?: SecurityAlert[];
  };
}

// MFA Setup Request Interface
export interface MFASetupRequest {
  device_name: string;
  device_type: 'totp' | 'sms' | 'email';
  phone_number?: string;
  email_address?: string;
}

// MFA Setup Response Interface
export interface MFASetupResponse {
  success: boolean;
  message?: string;
  data: {
    device_id: number;
    qr_code?: string;
    secret_key?: string;
    backup_codes?: string[];
    setup_token: string;
  };
}

// MFA Verification Request Interface
export interface MFAVerifyRequest {
  mfa_token: string;
  code: string;
  is_backup_code?: boolean;
  trust_device?: boolean;
}

// MFA Verification Response Interface
export interface MFAVerifyResponse {
  success: boolean;
  message?: string;
  data: {
    verified: boolean;
    access_token?: string;
    refresh_token?: string;
    trusted_device_created?: boolean;
  };
}

// Security Alert Interface
export interface SecurityAlert {
  id: number;
  user_id: number;
  alert_type: 'login_from_new_device' | 'suspicious_activity' | 'password_change' | 'mfa_disabled';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

// Session Management Interface
export interface UserSession {
  id: string;
  user_id: number;
  jti: string;
  device_fingerprint: string;
  device_info?: {
    name?: string;
    type?: string;
    os?: string;
    browser?: string;
  };
  ip_address?: string;
  location?: {
    country?: string;
    city?: string;
  };
  is_active: boolean;
  is_revoked: boolean;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

// Security Settings Update Request
export interface SecuritySettingsUpdateRequest {
  mfa_enabled?: boolean;
  mfa_method?: 'totp' | 'sms' | 'email';
  session_timeout?: number;
  max_concurrent_sessions?: number;
  login_notifications?: boolean;
  suspicious_activity_alerts?: boolean;
}

// Device Management Interfaces
export interface DeviceManagementRequest {
  device_id: number;
  action: 'trust' | 'untrust' | 'remove';
}

export interface DeviceManagementResponse {
  success: boolean;
  message?: string;
  data: {
    device: TrustedDevice;
    action_performed: string;
  };
}