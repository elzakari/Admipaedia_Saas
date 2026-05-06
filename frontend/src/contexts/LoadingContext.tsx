import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  loadingMessage: string | null;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  loadingTasks: Set<string>;
  addLoadingTask: (taskId: string, message?: string) => void;
  removeLoadingTask: (taskId: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const setGlobalLoading = (loading: boolean, message?: string) => {
    if (loading) {
      setLoadingMessage(message || null);
      setLoadingTasks(prev => new Set(prev).add('global'));
    } else {
      setLoadingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete('global');
        return newSet;
      });
      if (loadingTasks.size <= 1) {
        setLoadingMessage(null);
      }
    }
  };

  const addLoadingTask = (taskId: string, message?: string) => {
    setLoadingTasks(prev => new Set(prev).add(taskId));
    if (message) {
      setLoadingMessage(message);
    }
  };

  const removeLoadingTask = (taskId: string) => {
    setLoadingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    
    if (loadingTasks.size <= 1) {
      setLoadingMessage(null);
    }
  };

  const isGlobalLoading = loadingTasks.size > 0;

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      loadingMessage,
      setGlobalLoading,
      loadingTasks,
      addLoadingTask,
      removeLoadingTask
    }}>
      {children}
    </LoadingContext.Provider>
  );
};