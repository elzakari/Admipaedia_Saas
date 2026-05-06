import React from 'react';

const LoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-5 rounded-lg shadow-lg">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-3 text-center">Loading...</p>
    </div>
  </div>
);

export default LoadingOverlay;