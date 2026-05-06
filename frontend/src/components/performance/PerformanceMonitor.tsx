import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
  isOnline: boolean;
}

interface ComponentMetrics {
  name: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: number;
}

export const PerformanceMonitor: React.FC<{
  isVisible?: boolean;
  onToggle?: () => void;
}> = ({ isVisible = false, onToggle }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    errorRate: 0,
    isOnline: navigator.onLine
  });

  const [componentMetrics, setComponentMetrics] = useState<ComponentMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Collect performance metrics
  const collectMetrics = useCallback(async () => {
    try {
      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;

      // Memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;

      // Network latency estimation
      const networkLatency = navigation.responseStart - navigation.requestStart;

      // Bundle size estimation
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const bundleSize = jsResources.reduce((total, resource) => {
        return total + (resource as PerformanceResourceTiming).transferSize || 0;
      }, 0) / 1024; // KB

      // Cache hit rate calculation
      const cachedResources = resources.filter(r => 
        (r as PerformanceResourceTiming).transferSize === 0
      );
      const cacheHitRate = resources.length > 0 ? 
        (cachedResources.length / resources.length) * 100 : 0;

      setMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime),
        memoryUsage: Math.round(memoryUsage),
        networkLatency: Math.round(networkLatency),
        bundleSize: Math.round(bundleSize),
        cacheHitRate: Math.round(cacheHitRate),
        isOnline: navigator.onLine
      }));

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }, []);

  // Monitor component performance
  const monitorComponents = useCallback(() => {
    if (!isMonitoring) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'measure' && entry.name.startsWith('React')) {
          const componentName = entry.name.replace('React ', '');
          
          setComponentMetrics(prev => {
            const existing = prev.find(c => c.name === componentName);
            
            if (existing) {
              return prev.map(c => 
                c.name === componentName 
                  ? {
                      ...c,
                      renderTime: entry.duration,
                      updateCount: c.updateCount + 1,
                      lastUpdate: Date.now()
                    }
                  : c
              );
            } else {
              return [...prev, {
                name: componentName,
                renderTime: entry.duration,
                mountTime: entry.duration,
                updateCount: 1,
                lastUpdate: Date.now()
              }];
            }
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }, [isMonitoring]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setMetrics(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setMetrics(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize monitoring
  useEffect(() => {
    if (isVisible) {
      collectMetrics();
      const cleanup = monitorComponents();
      
      const interval = setInterval(collectMetrics, 5000);
      
      return () => {
        clearInterval(interval);
        cleanup?.();
      };
    }
  }, [isVisible, collectMetrics, monitorComponents]);

  // Performance score calculation
  const calculatePerformanceScore = () => {
    let score = 100;
    
    // Deduct points for slow load times
    if (metrics.loadTime > 3000) score -= 20;
    else if (metrics.loadTime > 2000) score -= 10;
    
    // Deduct points for high memory usage
    if (metrics.memoryUsage > 100) score -= 15;
    else if (metrics.memoryUsage > 50) score -= 8;
    
    // Deduct points for slow network
    if (metrics.networkLatency > 1000) score -= 15;
    else if (metrics.networkLatency > 500) score -= 8;
    
    // Add points for good cache hit rate
    if (metrics.cacheHitRate > 80) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const performanceScore = calculatePerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        size="sm"
        variant="outline"
        className={cn(
          "fixed bottom-4 z-[55] bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg border-slate-200/60 dark:border-slate-700 rounded-xl",
          "right-4"
        )}
        style={{ right: 'calc(1rem + var(--admiperf-panel-width, 0px))' }}
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-4 z-[55] w-96 max-h-[80vh] overflow-y-auto"
      style={{ right: 'calc(1rem + var(--admiperf-panel-width, 0px))' }}
    >
      <Card className="shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? 'Stop' : 'Start'}
              </Button>
              <Button size="sm" variant="ghost" onClick={onToggle}>
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getScoreIcon(performanceScore)}
              <span className={`font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {metrics.isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-600">
                {metrics.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Core Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Load Time</span>
                <Badge variant={metrics.loadTime > 3000 ? 'destructive' : 'secondary'}>
                  {metrics.loadTime}ms
                </Badge>
              </div>
              <Progress 
                value={Math.min(100, (metrics.loadTime / 5000) * 100)} 
                className="h-2"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Memory</span>
                <Badge variant={metrics.memoryUsage > 100 ? 'destructive' : 'secondary'}>
                  {metrics.memoryUsage}MB
                </Badge>
              </div>
              <Progress 
                value={Math.min(100, (metrics.memoryUsage / 200) * 100)} 
                className="h-2"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bundle Size</span>
                <Badge variant="secondary">
                  {metrics.bundleSize}KB
                </Badge>
              </div>
              <Progress 
                value={Math.min(100, (metrics.bundleSize / 1000) * 100)} 
                className="h-2"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cache Hit</span>
                <Badge variant={metrics.cacheHitRate > 80 ? 'default' : 'secondary'}>
                  {metrics.cacheHitRate}%
                </Badge>
              </div>
              <Progress 
                value={metrics.cacheHitRate} 
                className="h-2"
              />
            </div>
          </div>

          {/* Component Performance */}
          {componentMetrics.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Component Performance</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {componentMetrics
                  .sort((a, b) => b.renderTime - a.renderTime)
                  .slice(0, 5)
                  .map((component, index) => (
                    <div key={component.name} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{component.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={component.renderTime > 16 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {component.renderTime.toFixed(1)}ms
                        </Badge>
                        <span className="text-gray-500">×{component.updateCount}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={collectMetrics}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // Clear performance entries
                performance.clearResourceTimings();
                performance.clearMeasures();
                setComponentMetrics([]);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;
