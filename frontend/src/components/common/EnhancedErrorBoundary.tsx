import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home, 
  ChevronDown, 
  ChevronUp,
  Copy,
  CheckCircle
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  retryCount: number;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRetry = () => {
    // Add a small delay to prevent rapid retries
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 100);
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo } = this.state;
    
    if (!error) return;

    const errorText = `
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy error to clipboard:', err);
    }
  };

  render() {
    const { hasError, error, errorInfo, showDetails, copied, retryCount } = this.state;
    const { children, fallback, showDetails: showDetailsDefault = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6">
            <div className="text-center space-y-4">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>

              {/* Error Title */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600">
                  We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <Alert className="text-left">
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {error.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                  {retryCount > 0 && (
                    <span className="text-xs opacity-75">({retryCount})</span>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
              </div>

              {/* Error Details Toggle */}
              {(error || errorInfo) && (
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Bug className="h-4 w-4" />
                    {showDetails ? 'Hide' : 'Show'} Error Details
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {showDetails && (
                    <div className="mt-4 space-y-4">
                      {/* Copy Button */}
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={this.copyErrorToClipboard}
                          className="flex items-center gap-2"
                          disabled={copied}
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Error Details
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Error Stack */}
                      {error?.stack && (
                        <div className="text-left">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            Error Stack:
                          </h4>
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40 text-gray-800">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      {/* Component Stack */}
                      {errorInfo?.componentStack && (
                        <div className="text-left">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            Component Stack:
                          </h4>
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40 text-gray-800">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="text-left">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          Additional Information:
                        </h4>
                        <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
                          <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                          <div><strong>URL:</strong> {window.location.href}</div>
                          <div><strong>User Agent:</strong> {navigator.userAgent}</div>
                          <div><strong>Retry Count:</strong> {retryCount}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Help Text */}
              <div className="text-sm text-gray-500 border-t pt-4">
                If this error persists, please contact our support team with the error details above.
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default EnhancedErrorBoundary;

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary context
export function useErrorHandler() {
  return {
    captureError: (error: Error, context?: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error in ${context || 'component'}:`, error);
      }
      
      // In production, send to error reporting service
      if (process.env.NODE_ENV === 'production') {
        // errorReportingService.captureException(error, { tags: { context } });
      }
    }
  };
}