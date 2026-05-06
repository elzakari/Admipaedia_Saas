import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
}) => {
  const sizeMap = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 flex justify-center items-center bg-white/80 dark:bg-gray-900/80 z-50'
    : 'flex justify-center items-center h-full w-full py-8';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center">
        <Loader className={`${sizeMap[size]} animate-spin text-primary`} />
        {message && <span className="mt-2 text-gray-600 dark:text-gray-300">{message}</span>}
      </div>
    </div>
  );
};

export default LoadingState;