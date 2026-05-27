import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorHandler, AppError } from '../utils/errorHandling';
import { useLoadingState } from './useLoadingState';
import { toast } from 'sonner';

export interface UseEnhancedApiCallOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheDuration?: number;
  optimisticUpdate?: T;
  fallbackData?: T; // Add this line
}

export const useEnhancedApiCall = <T>(
  apiFunction: () => Promise<T>,
  options: UseEnhancedApiCallOptions<T> = {}
) => {
  const {
    immediate = false,
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000,
    optimisticUpdate,
    fallbackData // Add this line
  } = options;

  const [data, setData] = useState<T | null>(optimisticUpdate || fallbackData || null);
  const [error, setError] = useState<AppError | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  // Store mutable handlers in refs to protect against component dependency invalidation loops
  const apiFunctionRef = useRef(apiFunction);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    apiFunctionRef.current = apiFunction;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [apiFunction, onSuccess, onError]);
  
  const handleError = useCallback((appError: AppError) => {
    setError(appError);
    ErrorHandler.logError(appError, 'API Call');
    
    if (showErrorToast) {
      toast.error(appError.message);
    }
    
    if (onErrorRef.current) {
      onErrorRef.current(appError);
    }
  }, [showErrorToast]);

  const executeCall = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      try {
        const cached = localStorage.getItem(`api_cache_${cacheKey}`);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheDuration) {
            setData(cachedData);
            return cachedData;
          }
        }
      } catch (e) {
        console.warn('Cache retrieval failed:', e);
      }
    }

    loadingState.setLoading(true);
    setError(null);

    try {
      const result = await apiFunctionRef.current();
      setData(result);
      setLastFetch(Date.now());
      
      // Cache the result
      if (cacheKey) {
        try {
          localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Cache storage failed:', e);
        }
      }
      
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }
      
      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }
      
      return result;
    } catch (error: any) {
      const appError = ErrorHandler.parseApiError(error);
      handleError(appError);
      
      if (!retryOnError || !appError.retryable) {
        throw appError;
      }
    } finally {
      loadingState.setLoading(false);
    }
  }, [cacheKey, cacheDuration, loadingState, handleError, showSuccessToast, successMessage, retryOnError]);

  const loadingState = useLoadingState({
    maxRetries,
    retryDelay,
    onError: (errorMsg) => {
      const appError = ErrorHandler.createError('CLIENT' as any, errorMsg);
      handleError(appError);
    },
    onRetry: () => executeCall()
  });

  const refetch = useCallback(() => {
    loadingState.reset();
    setError(null);
    return executeCall();
  }, [executeCall, loadingState]);

  return {
    data,
    error,
    isLoading: loadingState.isLoading,
    isRetrying: loadingState.isRetrying,
    retryCount: loadingState.retryCount,
    canRetry: loadingState.canRetry,
    setLoading: loadingState.setLoading,
    setError: loadingState.setError,
    clearError: loadingState.clearError,
    retry: loadingState.retry,
    reset: loadingState.reset,
    execute: executeCall,
    refetch,
    lastFetch,
    isCached: !!cacheKey && !!localStorage.getItem(`api_cache_${cacheKey}`)
  };
};