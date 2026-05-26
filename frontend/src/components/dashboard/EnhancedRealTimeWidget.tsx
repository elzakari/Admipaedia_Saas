import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Activity, Users,
  AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Monitor,
  Bell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../../services/websocketService';
import { AdminDashboardMetrics } from '../../services/saasService';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: Array<{ time: string; value: number }>;
}

interface RealTimeData {
  activeUsers: number;
  onlineTeachers: number;
  currentClasses: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  databaseConnections: number;
  lastUpdated: Date;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface EnhancedRealTimeWidgetProps {
  refreshInterval?: number;
  className?: string;
  liveMetrics?: AdminDashboardMetrics;
  isLoading?: boolean;
  liveAnalytics?: any;
  liveTelemetry?: any;
}

const EnhancedRealTimeWidget: React.FC<EnhancedRealTimeWidgetProps> = ({
  refreshInterval = 5000, // 5 seconds
  className = '',
  liveMetrics,
  isLoading = false,
  liveAnalytics,
  liveTelemetry
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<RealTimeData>({
    activeUsers: 0,
    onlineTeachers: 0,
    currentClasses: 0,
    systemLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0,
    databaseConnections: 0,
    lastUpdated: new Date()
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { isConnected, subscribe } = useWebSocket('/dashboard');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');

  // System metrics with history
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      name: 'CPU Usage',
      value: 0,
      unit: '%',
      status: 'healthy',
      trend: 'stable',
      history: []
    },
    {
      name: 'Memory',
      value: 0,
      unit: '%',
      status: 'healthy',
      trend: 'stable',
      history: []
    },
    {
      name: 'Disk I/O',
      value: 0,
      unit: 'MB/s',
      status: 'healthy',
      trend: 'stable',
      history: []
    },
    {
      name: 'Network',
      value: 0,
      unit: 'ms',
      status: 'healthy',
      trend: 'stable',
      history: []
    }
  ]);

  // Synchronize state with liveTelemetry when it arrives or changes
  useEffect(() => {
    if (liveTelemetry?.data || liveTelemetry) {
      const telemetry = liveTelemetry.data || liveTelemetry;
      const sys = telemetry.system_monitor;
      if (sys) {
        const newData: RealTimeData = {
          activeUsers: sys.active_users ?? (telemetry.academic_metrics?.students_count || 0),
          onlineTeachers: sys.online_teachers ?? 0,
          currentClasses: telemetry.academic_metrics?.classes_count ?? 0,
          systemLoad: sys.cpu_usage ?? 0,
          memoryUsage: sys.memory_usage ?? 0,
          diskUsage: sys.disk_usage ?? 0,
          networkLatency: sys.network_latency ?? 0,
          databaseConnections: sys.database_connections ?? 0,
          lastUpdated: new Date()
        };

        setData(newData);

        // Update system metrics with history
        setSystemMetrics(prev => prev.map(metric => {
          let newValue: number;
          let status: 'healthy' | 'warning' | 'critical';

          switch (metric.name) {
            case 'CPU Usage':
              newValue = newData.systemLoad;
              status = newValue > 80 ? 'critical' : newValue > 60 ? 'warning' : 'healthy';
              break;
            case 'Memory':
              newValue = newData.memoryUsage;
              status = newValue > 85 ? 'critical' : newValue > 70 ? 'warning' : 'healthy';
              break;
            case 'Disk I/O':
              newValue = newData.diskUsage;
              status = newValue > 85 ? 'critical' : newValue > 70 ? 'warning' : 'healthy';
              break;
            case 'Network':
              newValue = newData.networkLatency;
              status = newValue > 100 ? 'critical' : newValue > 50 ? 'warning' : 'healthy';
              break;
            default:
              newValue = metric.value;
              status = metric.status;
          }

          const trend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';
          const currentTime = new Date().toLocaleTimeString();

          return {
            ...metric,
            value: newValue,
            status,
            trend,
            history: [...metric.history.slice(-9), { time: currentTime, value: newValue }]
          };
        }));
      }
    }
  }, [liveTelemetry]);

  // Synchronize state with liveMetrics when they arrive or change
  useEffect(() => {
    if (liveMetrics && !liveTelemetry) {
      setData(prev => ({
        ...prev,
        activeUsers: liveMetrics.active_sessions_total || liveMetrics.active_parents_students,
        onlineTeachers: liveMetrics.online_staff_count,
        lastUpdated: new Date()
      }));
    }
  }, [liveMetrics, liveTelemetry]);

  // Simulate real-time data updates
  const updateData = useCallback(() => {
    const activeUsersVal = liveMetrics ? (liveMetrics.active_sessions_total || liveMetrics.active_parents_students) : (Math.floor(Math.random() * 100) + 200);
    const onlineTeachersVal = liveMetrics ? liveMetrics.online_staff_count : (Math.floor(Math.random() * 20) + 30);

    const cpu = liveAnalytics?.system_monitor?.cpu_usage ?? (Math.floor(Math.random() * 30) + 20);
    const mem = liveAnalytics?.system_monitor?.memory_usage ?? (Math.floor(Math.random() * 40) + 40);
    const disk = liveAnalytics?.system_monitor?.disk_usage ?? (Math.floor(Math.random() * 20) + 60);
    const net = liveAnalytics?.system_monitor?.network_latency ?? (Math.floor(Math.random() * 50) + 10);

    const newData: RealTimeData = {
      activeUsers: activeUsersVal,
      onlineTeachers: onlineTeachersVal,
      currentClasses: Math.floor(Math.random() * 15) + 10,
      systemLoad: cpu,
      memoryUsage: mem,
      diskUsage: disk,
      networkLatency: net,
      databaseConnections: Math.floor(Math.random() * 20) + 15,
      lastUpdated: new Date()
    };

    setData(newData);

    // Update system metrics with history
    setSystemMetrics(prev => prev.map(metric => {
      let newValue: number;
      let status: 'healthy' | 'warning' | 'critical';

      switch (metric.unit) {
        case '%':
          if (metric.name.toLowerCase().includes('cpu') || metric.name.toLowerCase().includes('load')) {
            newValue = newData.systemLoad;
            status = newValue > 80 ? 'critical' : newValue > 60 ? 'warning' : 'healthy';
          } else {
            newValue = newData.memoryUsage;
            status = newValue > 85 ? 'critical' : newValue > 70 ? 'warning' : 'healthy';
          }
          break;
        case 'MB/s':
          newValue = newData.diskUsage;
          status = newValue > 85 ? 'critical' : newValue > 70 ? 'warning' : 'healthy';
          break;
        case 'ms':
          newValue = newData.networkLatency;
          status = newValue > 100 ? 'critical' : newValue > 50 ? 'warning' : 'healthy';
          break;
        default:
          newValue = metric.value;
          status = metric.status;
      }

      const trend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';
      const currentTime = new Date().toLocaleTimeString();

      return {
        ...metric,
        value: newValue,
        status,
        trend,
        history: [...metric.history.slice(-9), { time: currentTime, value: newValue }]
      };
    }));

    // Generate random alerts
    if (Math.random() > 0.95) {
      const alertTypes = ['info', 'warning', 'error'] as const;
      const messages = [
        'High memory usage detected',
        'Database connection pool nearly full',
        'Network latency spike observed',
        'System backup completed successfully',
        'New user registration peak'
      ];

      const newAlert: Alert = {
        id: Date.now().toString(),
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)] as 'info' | 'warning' | 'error',
        message: messages[Math.floor(Math.random() * messages.length)] as string,
        timestamp: new Date(),
        resolved: false
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    }

    // Update connection quality
    const quality = newData.networkLatency < 30 ? 'excellent' :
      newData.networkLatency < 60 ? 'good' : 'poor';
    setConnectionQuality(quality);
  }, [liveMetrics]);

  // Listen for real-time updates from WebSocket
  useEffect(() => {
    const unsubscribe = subscribe('system_update', (update: any) => {
      setData(prev => {
        const activeUsersVal = liveMetrics ? liveMetrics.active_parents_students : (update.activeUsers ?? prev.activeUsers);
        const onlineTeachersVal = liveMetrics ? liveMetrics.online_staff_count : (update.onlineTeachers ?? prev.onlineTeachers);
        return {
          ...prev,
          ...update,
          activeUsers: activeUsersVal,
          onlineTeachers: onlineTeachersVal,
          lastUpdated: new Date()
        };
      });

      if (typeof update.networkLatency === 'number') {
        const quality = update.networkLatency < 30 ? 'excellent' : update.networkLatency < 60 ? 'good' : 'poor';
        setConnectionQuality(quality);
      }

      setSystemMetrics(prev => prev.map(metric => {
        let newValue = metric.value;
        if (typeof update.systemLoad === 'number' && metric.name === 'CPU Usage') newValue = update.systemLoad;
        if (typeof update.memoryUsage === 'number' && metric.name === 'Memory') newValue = update.memoryUsage;
        if (typeof update.diskIO === 'number' && metric.name === 'Disk I/O') newValue = update.diskIO;
        if (typeof update.networkLatency === 'number' && metric.name === 'Network') newValue = update.networkLatency;

        const status: 'healthy' | 'warning' | 'critical' = (() => {
          if (metric.name === 'Network') return newValue > 100 ? 'critical' : newValue > 50 ? 'warning' : 'healthy';
          if (metric.name === 'Disk I/O') return newValue > 200 ? 'critical' : newValue > 150 ? 'warning' : 'healthy';
          if (metric.name === 'Memory') return newValue > 85 ? 'critical' : newValue > 70 ? 'warning' : 'healthy';
          return newValue > 80 ? 'critical' : newValue > 60 ? 'warning' : 'healthy';
        })();
        const trend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';

        return {
          ...metric,
          value: newValue,
          status,
          trend,
          history: [...metric.history.slice(-9), { time: new Date().toLocaleTimeString(), value: newValue }]
        };
      }));
    });

    return () => unsubscribe();
  }, [subscribe, liveMetrics]);

  useEffect(() => {
    // Only use local simulation if not connected and no live telemetry is provided
    if (!isConnected && !liveTelemetry) {
      if (import.meta.env.DEV) {
        setConnectionQuality('poor');
        return undefined;
      }

      updateData();
      const interval = setInterval(updateData, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [updateData, refreshInterval, isConnected, liveTelemetry]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'good':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-green-500" />;
      default: return null;
    }
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className} animate-pulse`}>
        {/* System Monitor Card Skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-36 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-5 w-20 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center space-x-3 w-full">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts Card Skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="p-3 bg-gray-100 dark:bg-slate-800/50 rounded-lg border-l-4 border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>{t('System Monitor')}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
              <Badge variant="outline" className={getStatusColor(connectionQuality)}>
                {connectionQuality.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 mb-4">
            {t('Last updated')}: {data.lastUpdated.toLocaleTimeString()}
          </div>

          {/* Real-time metrics */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{data.activeUsers}</p>
              <p className="text-xs text-gray-500">{t('Active Users')}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Activity className="h-4 w-4 text-green-500 mr-1" />
              </div>
              <p className="text-2xl font-bold text-green-600">{data.onlineTeachers}</p>
              <p className="text-xs text-gray-500">{t('Online Teachers')}</p>
            </div>
          </div>

          {/* System Metrics */}
          <div className="space-y-3">
            {systemMetrics.map((metric, index) => (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{t(metric.name)}</p>
                      {getTrendIcon(metric.trend)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {metric.value}{metric.unit}
                    </p>
                  </div>
                </div>
                <div className="w-20 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metric.history}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={metric.status === 'healthy' ? '#10b981' :
                          metric.status === 'warning' ? '#f59e0b' : '#ef4444'}
                        fill={metric.status === 'healthy' ? '#10b981' :
                          metric.status === 'warning' ? '#f59e0b' : '#ef4444'}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>{t('System Alerts')}</span>
            {alerts.filter(a => !a.resolved).length > 0 && (
              <Badge variant="destructive">
                {alerts.filter(a => !a.resolved).length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {alerts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">{t('All systems operational')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 rounded-lg border-l-4 ${alert.resolved ? 'bg-gray-50 opacity-60' :
                      alert.type === 'error' ? 'bg-red-50 border-red-400' :
                        alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                          'bg-blue-50 border-blue-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {alert.type === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> :
                          alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                            <CheckCircle className="h-4 w-4 text-blue-500" />}
                        <p className={`text-sm ${alert.resolved ? 'line-through' : ''}`}>
                          {t(alert.message)}
                        </p>
                      </div>
                      {!alert.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                          className="h-6 px-2 text-xs"
                        >
                          {t('Resolve')}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.timestamp.toLocaleTimeString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedRealTimeWidget;
