import React from 'react';
import { RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useNavigate } from 'react-router-dom';
import { AppError } from '../../utils/errorHandling';
import ErrorDisplay from './ErrorDisplay';

interface ErrorRecoveryProps {
  error: AppError;
  onRetry?: () => void;
  showNavigation?: boolean;
  customActions?: React.ReactNode;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  showNavigation = true,
  customActions
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <ErrorDisplay 
          error={error} 
          onRetry={onRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
        
        {(showNavigation || customActions) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                {customActions}
                
                {showNavigation && (
                  <>
                    <Button variant="outline" onClick={handleGoBack} className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Go Back
                    </Button>
                    <Button variant="outline" onClick={handleGoHome} className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ErrorRecovery;