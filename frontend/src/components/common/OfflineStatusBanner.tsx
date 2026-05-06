import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { getSyncQueueStatus } from '../../utils/offline';

const OfflineStatusBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState({ total: 0, details: { grades: 0, attendance: 0, exams: 0 } });
    const [isSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check and periodic refresh of sync status
        updateSyncStatus();
        const interval = setInterval(updateSyncStatus, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const updateSyncStatus = async () => {
        const status = await getSyncQueueStatus();
        setSyncStatus(status);

        // If we transition from having data to no data while online, it means a sync likely finished
        if (isOnline && status.total === 0 && syncStatus.total > 0) {
            setLastSyncResult('success');
            setTimeout(() => setLastSyncResult(null), 5000);
        }
    };

    if (isOnline && syncStatus.total === 0 && !lastSyncResult) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
            >
                <div className={`rounded-lg shadow-lg border p-3 flex items-center justify-between ${!isOnline ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    lastSyncResult === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                    <div className="flex items-center gap-3">
                        {!isOnline ? (
                            <WifiOff className="h-5 w-5 text-amber-500" />
                        ) : lastSyncResult === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <RefreshCcw className={`h-5 w-5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                        )}

                        <div>
                            <p className="font-medium text-sm">
                                {!isOnline ? 'You are currently offline' :
                                    lastSyncResult === 'success' ? 'All data successfully synced' :
                                        'Data synchronization in progress'}
                            </p>
                            {syncStatus.total > 0 && (
                                <p className="text-xs opacity-80">
                                    {syncStatus.total} item(s) pending sync
                                    ({syncStatus.details.grades > 0 ? `${syncStatus.details.grades} grades ` : ''}
                                    {syncStatus.details.attendance > 0 ? `${syncStatus.details.attendance} attendance ` : ''}
                                    {syncStatus.details.exams > 0 ? `${syncStatus.details.exams} exams` : ''})
                                </p>
                            )}
                        </div>
                    </div>

                    {!isOnline && (
                        <div className="flex items-center gap-1 bg-amber-200/50 px-2 py-1 rounded text-[10px] uppercase font-bold">
                            <AlertCircle className="h-3 w-3" />
                            Offline Mode
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OfflineStatusBanner;
