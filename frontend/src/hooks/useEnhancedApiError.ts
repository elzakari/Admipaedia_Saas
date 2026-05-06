import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ErrorHandler, ErrorType, AppError } from '../utils/errorHandling';

export interface ApiErrorOptions {
  showToast?: boolean;
  customMessage?: string;
  retryCallback?: () => void;
  redirectOnAuth?: boolean;
  logError?: boolean;
}

export function useEnhancedApiError() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleApiError = useCallback(
    (error: any, options: ApiErrorOptions = {}) => {
      const {
        showToast = true,
        customMessage,
        retryCallback,
        redirectOnAuth = true,
        logError = true
      } = options;

      // Parse the error using our error handler
      const appError = ErrorHandler.parseApiError(error);
      
      if (logError) {
        ErrorHandler.logError(appError, 'API_CALL');
      }

      // Handle specific error types
      switch (appError.type) {
        case ErrorType.AUTHENTICATION:
          if (showToast) {
            toast.error('Session Expired', {
              description: 'Please log in again to continue.',
              action: {
                label: 'Login',
                onClick: () => navigate('/login')
              },
              duration: 10000
            });
          }
          if (redirectOnAuth) {
            logout();
          }
          break;

        case ErrorType.AUTHORIZATION:
          if (showToast) {
            toast.error('Access Denied', {
              description: 'You don\'t have permission to perform this action.',
              duration: 5000
            });
          }
          break;

        case ErrorType.NETWORK:
          if (showToast) {
            toast.error('Connection Problem', {
              description: 'Please check your internet connection and try again.',
              action: retryCallback ? {
                label: 'Retry',
                onClick: retryCallback
              } : undefined,
              duration: 8000
            });
          }
          break;

        case ErrorType.SERVER:
          if (showToast) {
            toast.error('Server Error', {
              description: 'Something went wrong on our end. Please try again later.',
              action: retryCallback ? {
                label: 'Retry',
                onClick: retryCallback
              } : undefined,
              duration: 8000
            });
          }
          break;

        case ErrorType.VALIDATION:
          if (showToast) {
            toast.error('Invalid Data', {
              description: customMessage || appError.message,
              duration: 5000
            });
          }
          break;

        default:
          if (showToast) {
            toast.error('Error', {
              description: customMessage || appError.message || 'An unexpected error occurred.',
              action: retryCallback ? {
                label: 'Retry',
                onClick: retryCallback
              } : undefined,
              duration: 5000
            });
          }
      }

      return appError;
    },
    [navigate, logout]
  );

  return { handleApiError };
}