export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  OFFLINE = 'OFFLINE'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Safely extracts error message from unknown error types
 * @param error - The caught error of unknown type
 * @returns A string error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unexpected error occurred';
};

/**
 * Safely extracts error name from unknown error types
 * @param error - The caught error of unknown type
 * @returns A string error name
 */
export const getErrorName = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name;
  }
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as any).name);
  }
  return 'UnknownError';
};

export class ErrorHandler {
  static createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      retryable: this.isRetryable(type)
    };
  }

  static isRetryable(type: ErrorType): boolean {
    return [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.OFFLINE].includes(type);
  }

  static parseApiError(error: any): AppError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        return this.createError(ErrorType.AUTHENTICATION, 'Authentication required');
      }
      if (status === 403) {
        return this.createError(ErrorType.AUTHORIZATION, 'Access denied');
      }
      if (status >= 400 && status < 500) {
        return this.createError(ErrorType.VALIDATION, data.message || 'Invalid request', data.errors);
      }
      if (status >= 500) {
        return this.createError(ErrorType.SERVER, 'Server error occurred');
      }
    }
    
    if (error.request) {
      return this.createError(ErrorType.NETWORK, 'Network connection failed');
    }
    
    return this.createError(ErrorType.CLIENT, error.message || 'An unexpected error occurred');
  }

  static logError(error: AppError, context?: string) {
    console.error(`[${error.type}] ${context || 'Error'}:`, {
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    });
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(error, context);
    }
  }

  private static async sendToMonitoring(error: AppError, context?: string) {
    try {
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error, context, userAgent: navigator.userAgent, url: window.location.href })
      });
    } catch (e) {
      console.warn('Failed to send error to monitoring service:', e);
    }
  }
}

// Enhanced API Error Handling Utility

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ApiErrorHandler {
  static handleFormError(
    error: any,
    fieldMapping: Record<string, string> = {},
    toast: any
  ): Record<string, string> {
    const newErrors: Record<string, string> = {};

    if (error?.response?.data?.errors) {
      const backendErrors = error.response.data.errors;
      
      Object.entries(backendErrors).forEach(([backendField, errorMessages]) => {
        const frontendField = fieldMapping[backendField] || backendField;
        if (Array.isArray(errorMessages) && errorMessages.length > 0) {
          newErrors[frontendField] = errorMessages[0];
        } else if (typeof errorMessages === 'string') {
          newErrors[frontendField] = errorMessages;
        }
      });
      
      toast({
        title: "Validation Error",
        description: "Please check the form for errors and try again.",
        variant: "destructive",
      });
    } else {
      // Handle different HTTP status codes
      switch (error?.response?.status) {
        case 400:
          toast({
            title: "Bad Request",
            description: "Invalid data provided. Please check your input.",
            variant: "destructive",
          });
          break;
        case 401:
          toast({
            title: "Authentication Error",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          break;
        case 403:
          toast({
            title: "Permission Error",
            description: "You don't have permission to perform this action.",
            variant: "destructive",
          });
          break;
        case 404:
          toast({
            title: "Not Found",
            description: "The requested resource was not found.",
            variant: "destructive",
          });
          break;
        case 409:
          toast({
            title: "Conflict Error",
            description: "This record already exists or conflicts with existing data.",
            variant: "destructive",
          });
          break;
        case 422:
          toast({
            title: "Validation Error",
            description: "The provided data is invalid.",
            variant: "destructive",
          });
          break;
        case 500:
          toast({
            title: "Server Error",
            description: "An internal server error occurred. Please try again later.",
            variant: "destructive",
          });
          break;
        default:
          toast({
            title: "Error",
            description: error?.message || "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
      }
    }

    return newErrors;
  }

  static handleNetworkError(toast: any): void {
    toast({
      title: "Network Error",
      description: "Please check your internet connection and try again.",
      variant: "destructive",
    });
  }

  static handleTimeoutError(toast: any): void {
    toast({
      title: "Request Timeout",
      description: "The request took too long. Please try again.",
      variant: "destructive",
    });
  }
}