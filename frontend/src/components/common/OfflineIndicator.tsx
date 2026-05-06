import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import useOffline from '../../hooks/useOffline';

const OfflineIndicator: React.FC = () => {
  const { isOnline, hasPendingItems, isSyncing, syncOfflineData } = useOffline();

  // Don't render anything if online and no pending items
  if (isOnline && !hasPendingItems) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg ${isOnline ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
      {isOnline ? (
        <>
          <Wifi size={18} />
          <span className="text-sm font-medium">
            {isSyncing ? 'Syncing...' : 'Pending offline changes'}
          </span>
          {!isSyncing && hasPendingItems && (
            <button
              onClick={syncOfflineData}
              className="ml-2 rounded-full bg-amber-200 p-1 hover:bg-amber-300"
              title="Sync now"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOff size={18} />
          <span className="text-sm font-medium">You are offline</span>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;