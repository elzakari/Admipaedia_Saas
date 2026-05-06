import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Loading...</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please wait while we prepare your experience</p>
      </div>
    </div>
  );
};

export default LoadingScreen;