import React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface LoadingStateProps {
  message?: string;
  progress?: number;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  showOfflineIndicator?: boolean;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  progress,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  showOfflineIndicator = false,
  className = ''
}) => {
  return (
    <Card className={`${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {showOfflineIndicator && (
            <div className="absolute -top-1 -right-1">
              <WifiOff className="w-4 h-4 text-orange-500" />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900">
            {isRetrying ? `Retrying... (${retryCount}/${maxRetries})` : message}
          </p>
          
          {progress !== undefined && (
            <div className="w-64">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
            </div>
          )}
          
          {isRetrying && (
            <Badge variant="outline" className="text-xs">
              <Wifi className="w-3 h-3 mr-1" />
              Reconnecting...
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingState;