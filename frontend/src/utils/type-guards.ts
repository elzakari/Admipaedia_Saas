/**
 * TypeScript Type Guards and Runtime Validation
 * Ensures type safety at runtime for API responses
 */

import { 
  User, 
  StandardApiResponse, 
  StandardPaginatedResponse,
  MFADevice,
  TrustedDevice,
  EnhancedLoginResponse
} from '@/types';

// User type guard
export function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string' &&
    ['super_admin', 'super_manager', 'admin', 'teacher', 'student', 'parent', 'user'].includes(obj.role)
  );
}

// Standard API Response type guard
export function isStandardApiResponse<T>(
  obj: any,
  dataValidator?: (data: any) => data is T
): obj is StandardApiResponse<T> {
  const isValidBase = (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    'data' in obj
  );

  if (!isValidBase) return false;
  
  if (dataValidator) {
    return dataValidator(obj.data);
  }
  
  return true;
}

// Paginated Response type guard
export function isStandardPaginatedResponse<T>(
  obj: any,
  itemValidator?: (item: any) => item is T
): obj is StandardPaginatedResponse<T> {
  const isValidBase = (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    Array.isArray(obj.data) &&
    typeof obj.pagination === 'object' &&
    obj.pagination !== null
  );

  if (!isValidBase) return false;

  if (itemValidator) {
    return obj.data.every((item: any) => itemValidator(item));
  }

  return true;
}

// MFA Device type guard
export function isMFADevice(obj: any): obj is MFADevice {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.user_id === 'number' &&
    typeof obj.device_name === 'string' &&
    ['totp', 'sms', 'email'].includes(obj.device_type) &&
    typeof obj.is_active === 'boolean' &&
    typeof obj.is_verified === 'boolean'
  );
}

// Trusted Device type guard
export function isTrustedDevice(obj: any): obj is TrustedDevice {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.user_id === 'number' &&
    typeof obj.device_fingerprint === 'string' &&
    typeof obj.is_trusted === 'boolean'
  );
}

// Enhanced Login Response type guard
export function isEnhancedLoginResponse(obj: any): obj is EnhancedLoginResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    isUser(obj.data.user) &&
    typeof obj.data.access_token === 'string' &&
    typeof obj.data.refresh_token === 'string'
  );
}

// Generic array validator
export function isArrayOf<T>(
  arr: any,
  validator: (item: any) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(validator);
}

// Validation error handler
export class TypeValidationError extends Error {
  constructor(message: string, public readonly receivedData: any) {
    super(`Type validation failed: ${message}`);
    this.name = 'TypeValidationError';
  }
}

// Safe type assertion with validation
export function assertType<T>(
  data: any,
  validator: (obj: any) => obj is T,
  errorMessage: string
): T {
  if (validator(data)) {
    return data;
  }
  throw new TypeValidationError(errorMessage, data);
}
