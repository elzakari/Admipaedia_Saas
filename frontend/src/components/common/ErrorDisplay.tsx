import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Shield, Server } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AppError, ErrorType } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: AppError | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const appError = typeof error === 'string' 
    ? { type: ErrorType.CLIENT, message: error, timestamp: new Date(), retryable: false }
    : error;

  const getErrorIcon = () => {
    switch (appError.type) {
      case ErrorType.NETWORK:
      case ErrorType.OFFLINE:
        return <WifiOff className="w-6 h-6" />;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return <Shield className="w-6 h-6" />;
      case ErrorType.SERVER:
        return <Server className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getErrorColor = () => {
    switch (appError.type) {
      case ErrorType.NETWORK:
      case ErrorType.OFFLINE:
        return 'text-orange-600 bg-orange-100';
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return 'text-purple-600 bg-purple-100';
      case ErrorType.SERVER:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${getErrorColor()}`}>
          {getErrorIcon()}
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900">
          {appError.type === ErrorType.NETWORK ? 'Connection Problem' :
           appError.type === ErrorType.AUTHENTICATION ? 'Authentication Required' :
           appError.type === ErrorType.AUTHORIZATION ? 'Access Denied' :
           appError.type === ErrorType.SERVER ? 'Server Error' :
           'Something went wrong'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-center">{appError.message}</p>
        
        <div className="flex justify-center">
          <Badge variant="outline">{appError.type}</Badge>
        </div>

        {showDetails && appError.details && (
          <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify(appError.details, null, 2)}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2 justify-center">
          {appError.retryable && onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;