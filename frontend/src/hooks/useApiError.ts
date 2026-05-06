import { useCallback } from 'react';
import { toast } from 'react-hot-toast'; // Change this import
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function useApiError() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleApiError = useCallback(
    (error: any, customMessage?: string) => {
      console.error('API Error:', error);
      
      // Extract error message
      const errorMessage = 
        customMessage || 
        error?.response?.data?.message || 
        error?.message || 
        'An unexpected error occurred';
      
      // Handle specific status codes
      const status = error?.response?.status;
      
      if (status === 401 && error?.response?.data?.message !== 'Token is expired') {
        // Only handle 401s that aren't being handled by the token refresh mechanism
        toast.error('Authentication Error: Your session has expired. Please log in again.');
        logout();
        return;
      }
      
      if (status === 403) {
        toast.error('Access Denied: You do not have permission to perform this action.');
        navigate('/dashboard');
        return;
      }
      
      // General error toast
      toast.error(errorMessage);
    },
    [navigate, logout]
  );

  return { handleApiError };
}