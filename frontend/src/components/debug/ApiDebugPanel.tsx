import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

interface ApiDebugPanelProps {
  className?: string;
}

interface DebugResult {
  endpoint: string;
  status: 'success' | 'error' | 'loading';
  statusCode?: number;
  data?: any;
  error?: string;
  timestamp: Date;
  responseTime?: number;
}

export const ApiDebugPanel: React.FC<ApiDebugPanelProps> = ({ className }) => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const endpoints = [
    { path: '/students', name: 'Get Students' },
    { path: '/students?limit=5', name: 'Get Students (Limited)' },
    { path: '/auth/me', name: 'Get Current User' },
    { path: '/classes', name: 'Get Classes' },
  ];

  const testEndpoint = async (endpoint: { path: string; name: string }) => {
    const startTime = Date.now();
    const result: DebugResult = {
      endpoint: endpoint.name,
      status: 'loading',
      timestamp: new Date(),
    };

    setResults(prev => [...prev.filter(r => r.endpoint !== endpoint.name), result]);

    try {
      console.log(`🧪 Testing endpoint: ${endpoint.path}`);
      const response = await api.get(endpoint.path);
      const endTime = Date.now();

      const successResult: DebugResult = {
        ...result,
        status: 'success',
        statusCode: response.status,
        data: response.data,
        responseTime: endTime - startTime,
      };

      setResults(prev => prev.map(r => 
        r.endpoint === endpoint.name ? successResult : r
      ));

      console.log(`✅ ${endpoint.name} successful:`, response.data);
    } catch (error: any) {
      const endTime = Date.now();
      const errorResult: DebugResult = {
        ...result,
        status: 'error',
        statusCode: error.response?.status,
        error: error.message || 'Unknown error',
        responseTime: endTime - startTime,
      };

      setResults(prev => prev.map(r => 
        r.endpoint === endpoint.name ? errorResult : r
      ));

      console.error(`❌ ${endpoint.name} failed:`, error);
    }
  };

  const testAllEndpoints = async () => {
    setIsRunning(true);
    setResults([]);
    
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
  };

  const getEnvironmentInfo = () => {
    return {
      'API Base URL': import.meta.env.VITE_API_URL || '(Relative)',
      'Environment': import.meta.env.MODE,
      'Has Auth Token': !!localStorage.getItem('token'),
      'Has Refresh Token': !!localStorage.getItem('refreshToken'),
      'User Agent': navigator.userAgent,
      'Current URL': window.location.href,
    };
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          <Eye className="h-4 w-4 mr-2" />
          Debug API
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto ${className}`}>
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-blue-800">API Debug Panel</CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Environment Info */}
          <div>
            <h4 className="font-medium text-sm mb-2">Environment</h4>
            <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
              {Object.entries(getEnvironmentInfo()).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-mono text-right ml-2 break-all">
                    {typeof value === 'boolean' ? (value ? '✅' : '❌') : value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button
              onClick={testAllEndpoints}
              disabled={isRunning}
              size="sm"
              className="flex-1"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test All
            </Button>
          </div>

          {/* Individual Endpoint Tests */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Individual Tests</h4>
            {endpoints.map((endpoint) => (
              <Button
                key={endpoint.path}
                onClick={() => testEndpoint(endpoint)}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                disabled={isRunning}
              >
                {endpoint.name}
              </Button>
            ))}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Results</h4>
              {results.map((result, index) => (
                <div key={`${result.endpoint}-${index}`} className="border rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{result.endpoint}</span>
                    <div className="flex items-center gap-2">
                      {result.responseTime && (
                        <span className="text-gray-500">{result.responseTime}ms</span>
                      )}
                      <Badge
                        variant={result.status === 'success' ? 'default' : 
                                result.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {result.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {result.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {result.statusCode || result.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="text-red-600 bg-red-50 p-1 rounded mt-1">
                      {result.error}
                    </div>
                  )}
                  
                  {result.data && (
                    <div className="text-green-700 bg-green-50 p-1 rounded mt-1">
                      {Array.isArray(result.data) ? 
                        `Array with ${result.data.length} items` :
                        typeof result.data === 'object' ?
                          `Object with keys: ${Object.keys(result.data).join(', ')}` :
                          String(result.data)
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDebugPanel;