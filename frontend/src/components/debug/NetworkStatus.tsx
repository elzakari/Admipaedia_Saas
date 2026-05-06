import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    // Check connection type if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
        setLastChecked(new Date());
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'destructive';
    if (connectionType === 'slow-2g' || connectionType === '2g') return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (connectionType === 'slow-2g' || connectionType === '2g') return <AlertTriangle className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getStatusColor()} className="text-xs">
        {getStatusIcon()}
        <span className="ml-1">
          {isOnline ? `Online (${connectionType})` : 'Offline'}
        </span>
      </Badge>
      <span className="text-xs text-gray-500">
        {lastChecked.toLocaleTimeString()}
      </span>
    </div>
  );
};

export default NetworkStatus;