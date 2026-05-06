import React from 'react';
import { Loader2 } from 'lucide-react';
// Fix the import path - it should likely be:
import { useLoadingContext } from '../../contexts/LoadingContext';
// Or if the context is in a different location, update accordingly

const GlobalLoadingIndicator: React.FC = () => {
  const { isGlobalLoading, loadingMessage } = useLoadingContext();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4 min-w-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-700 text-center">
          {loadingMessage || 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export default GlobalLoadingIndicator;