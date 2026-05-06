import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  Zap, 
  Clock, 
  Wifi, 
  HardDrive, 
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: {
    good: number;
    warning: number;
    critical: number;
  };
  trend: number[];
  icon: React.ComponentType<any>;
  description: string;
}

interface PerformanceMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showTrends?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000,
  showTrends = true
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(autoRefresh);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Performance metrics collection
  const collectMetrics = useCallback(async (): Promise<PerformanceMetric[]> => {
    const performance = window.performance;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;

    // Page load metrics
    const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;

    // Network metrics
    const connection = (navigator as any).connection;
    const networkSpeed = connection?.downlink || 0;
    const networkType = connection?.effectiveType || 'unknown';

    // Memory metrics (Chrome only)
    const memoryUsed = memory ? (memory.usedJSHeapSize / 1024 / 1024) : 0;
    const memoryTotal = memory ? (memory.totalJSHeapSize / 1024 / 1024) : 0;

    // Bundle size estimation
    const resources = performance.getEntriesByType('resource');
    const totalResourceSize = resources.reduce((total, resource) => {
      // Type assertion for PerformanceResourceTiming which has transferSize property
      const resourceTiming = resource as PerformanceResourceTiming;
      return total + (resourceTiming.transferSize || 0);
    }, 0) / 1024; // KB

    return [
      {
        id: 'page-load',
        name: 'Page Load Time',
        value: Math.round(pageLoadTime),
        unit: 'ms',
        threshold: { good: 2000, warning: 4000, critical: 6000 },
        trend: [],
        icon: Clock,
        description: 'Time taken to fully load the page'
      },
      {
        id: 'dom-ready',
        name: 'DOM Ready',
        value: Math.round(domContentLoaded),
        unit: 'ms',
        threshold: { good: 1500, warning: 3000, critical: 5000 },
        trend: [],
        icon: Zap,
        description: 'Time until DOM content is loaded'
      },
      {
        id: 'fcp',
        name: 'First Contentful Paint',
        value: Math.round(firstContentfulPaint),
        unit: 'ms',
        threshold: { good: 1800, warning: 3000, critical: 4000 },
        trend: [],
        icon: Activity,
        description: 'Time until first content is painted'
      },
      {
        id: 'network-speed',
        name: 'Network Speed',
        value: networkSpeed,
        unit: 'Mbps',
        threshold: { good: 10, warning: 5, critical: 1 },
        trend: [],
        icon: Wifi,
        description: `Connection type: ${networkType}`
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        value: Math.round(memoryUsed),
        unit: 'MB',
        threshold: { good: 50, warning: 100, critical: 200 },
        trend: [],
        icon: MemoryStick,
        description: `Total allocated: ${Math.round(memoryTotal)}MB`
      },
      {
        id: 'bundle-size',
        name: 'Resource Size',
        value: Math.round(totalResourceSize),
        unit: 'KB',
        threshold: { good: 500, warning: 1000, critical: 2000 },
        trend: [],
        icon: HardDrive,
        description: 'Total size of loaded resources'
      }
    ];
  }, []);

  // Update metrics with trend data
  const updateMetrics = useCallback(async () => {
    try {
      const newMetrics = await collectMetrics();
      
      setMetrics(prevMetrics => {
        return newMetrics.map(newMetric => {
          const prevMetric = prevMetrics.find(m => m.id === newMetric.id);
          const trend = prevMetric ? [...prevMetric.trend, newMetric.value].slice(-10) : [newMetric.value];
          
          return {
            ...newMetric,
            trend
          };
        });
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }, [collectMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isMonitoring) {
      // Initial collection
      updateMetrics();
      
      // Set up interval
      intervalId = setInterval(updateMetrics, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isMonitoring, refreshInterval, updateMetrics]);

  // Get status color based on thresholds
  const getStatusColor = (value: number, threshold: PerformanceMetric['threshold']) => {
    if (value <= threshold.good) return 'text-green-600 bg-green-50 border-green-200';
    if (value <= threshold.warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Get status icon
  const getStatusIcon = (value: number, threshold: PerformanceMetric['threshold']) => {
    if (value <= threshold.good) return CheckCircle;
    if (value <= threshold.warning) return AlertTriangle;
    return AlertTriangle;
  };

  // Calculate trend direction
  const getTrendDirection = (trend: number[]) => {
    if (trend.length < 2) return 0;
    const recent = trend.slice(-3);
    const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const previous = trend.slice(-6, -3);
    const prevAvg = previous.length > 0 ? previous.reduce((sum, val) => sum + val, 0) / previous.length : avg;
    
    return avg - prevAvg;
  };

  // Overall performance score
  const overallScore = useMemo(() => {
    if (metrics.length === 0) return 0;
    
    const scores = metrics.map(metric => {
      const { value, threshold } = metric;
      if (value <= threshold.good) return 100;
      if (value <= threshold.warning) return 70;
      return 30;
    });
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <Badge variant="outline" className={getScoreColor(overallScore)}>
              Score: {overallScore}/100
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center gap-2 ${isMonitoring ? 'bg-green-50 text-green-700' : ''}`}
            >
              {isMonitoring ? (
                <>
                  <Eye className="h-4 w-4" />
                  Monitoring
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Paused
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={updateMetrics}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Performance Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Performance</span>
            <span className={`text-sm font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
          </div>
          <Progress 
            value={overallScore} 
            className={`h-2 ${
              overallScore >= 80 ? 'bg-green-100' : 
              overallScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {metrics.map((metric) => {
              const StatusIcon = getStatusIcon(metric.value, metric.threshold);
              const trendDirection = getTrendDirection(metric.trend);
              const isExpanded = expandedMetric === metric.id;
              
              return (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor(metric.value, metric.threshold)}`}
                    onClick={() => setExpandedMetric(isExpanded ? null : metric.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <metric.icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusIcon className="h-4 w-4" />
                          {showTrends && trendDirection !== 0 && (
                            trendDirection > 0 ? (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            )
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-lg font-bold">
                          {metric.value} {metric.unit}
                        </div>
                        <div className="text-xs text-gray-600">
                          {metric.description}
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && showTrends && metric.trend.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t"
                        >
                          <div className="h-20">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={metric.trend.map((value, index) => ({ index, value }))}>
                                <XAxis dataKey="index" hide />
                                <YAxis hide />
                                <Tooltip 
                                  formatter={(value) => [`${value} ${metric.unit}`, metric.name]}
                                  labelFormatter={(index) => `Point ${index + 1}`}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#3b82f6" 
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Trend over last {metric.trend.length} measurements
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Performance Recommendations */}
        {overallScore < 80 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Performance Tips:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                {metrics.filter(m => m.value > m.threshold.warning).map(metric => (
                  <li key={metric.id}>
                    • {metric.name} is above recommended levels. Consider optimizing this area.
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Browser Support Notice */}
        {!(window.performance && (window.performance as any).memory) && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Some performance metrics may not be available in your browser. 
              For full monitoring capabilities, use Chrome or Edge.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;