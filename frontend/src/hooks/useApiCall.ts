import { useState, useEffect, useCallback, useRef } from 'react';
import { useLoadingState } from './useLoadingState';

export interface UseApiCallOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheDuration?: number;
}

export const useApiCall = <T>(
  apiFunction: () => Promise<T>,
  options: UseApiCallOptions<T> = {}
) => {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000 // 5 minutes
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  
  // Declare executeRef before useLoadingState to break circular TDZ
  const executeRef = useRef<(() => Promise<T | null | undefined>) | null>(null);

  const loadingState = useLoadingState({
    maxRetries,
    retryDelay,
    onError,
    onRetry: () => executeRef.current?.()
  });

  // Destructure stable methods from loadingState so they are safe to put in the useCallback dependency array
  const { setLoading, clearError, setError: setLoadingError, reset: resetLoading, isRetrying } = loadingState;

  // Cache management
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    
    try {
      const cached = localStorage.getItem(`api_cache_${cacheKey}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheDuration) {
          return cachedData;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
    }
    
    return null;
  }, [cacheKey, cacheDuration]);

  const setCachedData = useCallback((data: T) => {
    if (!cacheKey) return;
    
    try {
      localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }, [cacheKey]);

  const executeCall = useCallback(async () => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData && !isRetrying) {
      setData(cachedData);
      return cachedData;
    }

    setLoading(true);
    clearError();

    try {
      const result = await apiFunction();
      setData(result);
      setLastFetch(Date.now());
      
      // Cache the result
      setCachedData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setLoadingError(errorMessage);
      
      if (!retryOnError) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunction, getCachedData, setCachedData, onSuccess, retryOnError, setLoading, clearError, setLoadingError, isRetrying]);

  // Keep executeRef updated with the latest executeCall reference
  useEffect(() => {
    executeRef.current = executeCall;
  }, [executeCall]);

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      executeCall().catch(() => {});
    }
  }, [immediate, executeCall]);

  const refetch = useCallback(() => {
    resetLoading();
    return executeCall();
  }, [executeCall, resetLoading]);

  return {
    data,
    ...loadingState,
    execute: executeCall,
    refetch,
    lastFetch,
    isCached: !!getCachedData()
  };
};