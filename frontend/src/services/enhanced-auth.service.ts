/**
 * Enhanced Authentication Service
 * Type-safe API service for enhanced authentication features
 */

import api from '@/lib/api';
import {
  EnhancedLoginRequest,
  EnhancedLoginResponse,
  MFASetupRequest,
  MFASetupResponse,
  MFAVerifyRequest,
  MFAVerifyResponse,
  MFADevice,
  TrustedDevice,
  UserSecuritySettings,
  SecuritySettingsUpdateRequest,
  DeviceManagementRequest,
  DeviceManagementResponse,
  UserSession,
  StandardApiResponse,
  StandardPaginatedResponse
} from '@/types';
import {
  isEnhancedLoginResponse,
  isStandardApiResponse,
  isStandardPaginatedResponse,
  isMFADevice,
  isTrustedDevice,
  assertType
} from '@/utils/type-guards';

class EnhancedAuthService {
  private readonly baseUrl = '/auth/enhanced';

  /**
   * Enhanced login with MFA and device tracking
   */
  async login(credentials: EnhancedLoginRequest): Promise<EnhancedLoginResponse> {
    const response = await api.post(`${this.baseUrl}/login-enhanced`, credentials);
    
    return assertType(
      response.data,
      isEnhancedLoginResponse,
      'Invalid enhanced login response format'
    );
  }

  /**
   * Setup MFA device
   */
  async setupMFA(request: MFASetupRequest): Promise<StandardApiResponse<MFASetupResponse['data']>> {
    const response = await api.post(`${this.baseUrl}/mfa/setup`, request);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<MFASetupResponse['data']> => 
        isStandardApiResponse(obj),
      'Invalid MFA setup response format'
    );
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(request: MFAVerifyRequest): Promise<StandardApiResponse<MFAVerifyResponse['data']>> {
    const response = await api.post(`${this.baseUrl}/mfa/verify`, request);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<MFAVerifyResponse['data']> => 
        isStandardApiResponse(obj),
      'Invalid MFA verification response format'
    );
  }

  /**
   * Get user's MFA devices
   */
  async getMFADevices(): Promise<StandardPaginatedResponse<MFADevice>> {
    const response = await api.get(`${this.baseUrl}/mfa/devices`);
    
    return assertType(
      response.data,
      (obj): obj is StandardPaginatedResponse<MFADevice> => 
        isStandardPaginatedResponse(obj, isMFADevice),
      'Invalid MFA devices response format'
    );
  }

  /**
   * Get user's trusted devices
   */
  async getTrustedDevices(): Promise<StandardPaginatedResponse<TrustedDevice>> {
    const response = await api.get(`${this.baseUrl}/devices/trusted`);
    
    return assertType(
      response.data,
      (obj): obj is StandardPaginatedResponse<TrustedDevice> => 
        isStandardPaginatedResponse(obj, isTrustedDevice),
      'Invalid trusted devices response format'
    );
  }

  /**
   * Manage device trust status
   */
  async manageDevice(request: DeviceManagementRequest): Promise<StandardApiResponse<DeviceManagementResponse['data']>> {
    const response = await api.post(`${this.baseUrl}/devices/manage`, request);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<DeviceManagementResponse['data']> => 
        isStandardApiResponse(obj),
      'Invalid device management response format'
    );
  }

  /**
   * Get user security settings
   */
  async getSecuritySettings(): Promise<StandardApiResponse<UserSecuritySettings>> {
    const response = await api.get(`${this.baseUrl}/security/settings`);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<UserSecuritySettings> => 
        isStandardApiResponse(obj),
      'Invalid security settings response format'
    );
  }

  /**
   * Update user security settings
   */
  async updateSecuritySettings(settings: SecuritySettingsUpdateRequest): Promise<StandardApiResponse<UserSecuritySettings>> {
    const response = await api.put(`${this.baseUrl}/security/settings`, settings);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<UserSecuritySettings> => 
        isStandardApiResponse(obj),
      'Invalid security settings update response format'
    );
  }

  /**
   * Get user sessions
   */
  async getUserSessions(): Promise<StandardPaginatedResponse<UserSession>> {
    const response = await api.get(`${this.baseUrl}/sessions`);
    
    return assertType(
      response.data,
      (obj): obj is StandardPaginatedResponse<UserSession> => 
        isStandardPaginatedResponse(obj),
      'Invalid user sessions response format'
    );
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string): Promise<StandardApiResponse<{ revoked: boolean }>> {
    const response = await api.delete(`${this.baseUrl}/sessions/${sessionId}`);
    
    return assertType(
      response.data,
      (obj): obj is StandardApiResponse<{ revoked: boolean }> => 
        isStandardApiResponse(obj),
      'Invalid session revocation response format'
    );
  }
}

export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;