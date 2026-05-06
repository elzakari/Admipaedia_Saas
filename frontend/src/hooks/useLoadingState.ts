import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
}

export interface LoadingActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  retry: () => void;
  reset: () => void;
}

export interface UseLoadingStateOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: () => void | Promise<void>;
  onError?: (error: string) => void;
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const { maxRetries = 3, retryDelay = 1000, onRetry, onError } = options;
  
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    isRetrying: false,
    retryCount: 0
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
    if (error && onError) {
      onError(error);
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      error: null
    }));

    try {
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setState(prev => ({ ...prev, isRetrying: false }));
    }
  }, [state.retryCount, maxRetries, retryDelay, onRetry, setError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isRetrying: false,
      retryCount: 0
    });
  }, []);

  const actions: LoadingActions = {
    setLoading,
    setError,
    clearError,
    retry,
    reset
  };

  return { ...state, ...actions, canRetry: state.retryCount < maxRetries };
};