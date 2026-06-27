import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Users, TrendingUp, TrendingDown, Clock, Wifi,
  WifiOff, Play, Pause, RotateCcw, AlertCircle, Server,
  Database, Cpu, HardDrive, Network, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RAW_WEBSOCKET_BASE_URL } from '../../config/constants';

interface RealTimeAnalyticsProps {
  refreshKey: number;
}

interface RealTimeData {
  timestamp: string;
  activeUsers: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkLatency: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

const RealTimeAnalytics: React.FC<RealTimeAnalyticsProps> = ({ refreshKey }) => {
  // Connection and streaming state
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Data state
  const [realTimeData, setRealTimeData] = useState<RealTimeData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<RealTimeData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [historicalData, setHistoricalData] = useState<RealTimeData[]>([]);
  
  // UI state
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'alerts' | 'users'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setConnectionStatus('connecting');
    
    try {
      const wsUrl = `${RAW_WEBSOCKET_BASE_URL}/ws/analytics`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for real-time analytics');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Subscribe to real-time analytics
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'analytics',
          filters: {
            timeRange: selectedTimeRange,
            metrics: ['users', 'performance', 'system', 'alerts']
          }
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt reconnection if not intentional
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [selectedTimeRange, reconnectAttempts]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'metrics_update':
        const newMetric: RealTimeData = {
          timestamp: data.timestamp,
          activeUsers: data.activeUsers || 0,
          systemLoad: data.systemLoad || 0,
          responseTime: data.responseTime || 0,
          errorRate: data.errorRate || 0,
          throughput: data.throughput || 0,
          memoryUsage: data.memoryUsage || 0,
          cpuUsage: data.cpuUsage || 0,
          diskUsage: data.diskUsage || 0,
          networkLatency: data.networkLatency || 0
        };
        
        setCurrentMetrics(newMetric);
        setRealTimeData(prev => {
          const updated = [...prev, newMetric];
          // Keep only last 100 data points for performance
          return updated.slice(-100);
        });
        break;
        
      case 'alert':
        const newAlert: SystemAlert = {
          id: data.id || Date.now().toString(),
          type: data.alertType || 'info',
          message: data.message,
          timestamp: data.timestamp,
          resolved: false,
          severity: data.severity || 'medium'
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep last 50 alerts
        break;
        
      case 'historical_data':
        setHistoricalData(data.data || []);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);
  
  // Generate mock data for demonstration
  const generateMockData = useCallback(() => {
    const now = new Date();
    const mockMetric: RealTimeData = {
      timestamp: now.toISOString(),
      activeUsers: Math.floor(Math.random() * 500) + 100,
      systemLoad: Math.random() * 100,
      responseTime: Math.random() * 1000 + 50,
      errorRate: Math.random() * 5,
      throughput: Math.random() * 1000 + 200,
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkLatency: Math.random() * 100 + 10
    };
    
    setCurrentMetrics(mockMetric);
    setRealTimeData(prev => {
      const updated = [...prev, mockMetric];
      return updated.slice(-100);
    });
    
    // Occasionally generate alerts
    if (Math.random() < 0.1) {
      const alertTypes: SystemAlert['type'][] = ['warning', 'error', 'info', 'success'];
      const severities: SystemAlert['severity'][] = ['low', 'medium', 'high', 'critical'];
      const messages = [
        'High CPU usage detected',
        'Memory usage approaching limit',
        'Slow response time detected',
        'Database connection pool exhausted',
        'System performance optimized',
        'Backup completed successfully'
      ];
      
      const newAlert: SystemAlert = {
        id: Date.now().toString(),
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: now.toISOString(),
        resolved: false,
        severity: severities[Math.floor(Math.random() * severities.length)]
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    }
  }, []);
  
  // Start/stop streaming
  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsStreaming(false);
    } else {
      intervalRef.current = setInterval(generateMockData, 2000);
      setIsStreaming(true);
    }
  }, [isStreaming, generateMockData]);
  
  // Reset data
  const resetData = useCallback(() => {
    setRealTimeData([]);
    setAlerts([]);
    setCurrentMetrics(null);
  }, []);
  
  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);
  
  // Effects
  useEffect(() => {
    if (autoRefresh) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket, autoRefresh]);
  
  useEffect(() => {
    // Start with mock data if WebSocket is not available
    if (!isConnected && autoRefresh) {
      toggleStreaming();
    }
  }, [isConnected, autoRefresh, toggleStreaming]);
  
  // Metric cards data
  const metricCards: MetricCard[] = currentMetrics ? [
    {
      title: 'Active Users',
      value: currentMetrics.activeUsers,
      change: realTimeData.length > 1 ? 
        ((currentMetrics.activeUsers - realTimeData[realTimeData.length - 2].activeUsers) / realTimeData[realTimeData.length - 2].activeUsers) * 100 : 0,
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600',
      trend: realTimeData.length > 1 ? 
        (currentMetrics.activeUsers > realTimeData[realTimeData.length - 2].activeUsers ? 'up' : 
         currentMetrics.activeUsers < realTimeData[realTimeData.length - 2].activeUsers ? 'down' : 'stable') : 'stable'
    },
    {
      title: 'Response Time',
      value: `${Math.round(currentMetrics.responseTime)}ms`,
      change: realTimeData.length > 1 ? 
        ((currentMetrics.responseTime - realTimeData[realTimeData.length - 2].responseTime) / realTimeData[realTimeData.length - 2].responseTime) * 100 : 0,
      icon: <Clock className="h-4 w-4" />,
      color: 'text-green-600',
      trend: realTimeData.length > 1 ? 
        (currentMetrics.responseTime > realTimeData[realTimeData.length - 2].responseTime ? 'down' : 
         currentMetrics.responseTime < realTimeData[realTimeData.length - 2].responseTime ? 'up' : 'stable') : 'stable'
    },
    {
      title: 'System Load',
      value: `${Math.round(currentMetrics.systemLoad)}%`,
      change: realTimeData.length > 1 ? 
        ((currentMetrics.systemLoad - realTimeData[realTimeData.length - 2].systemLoad) / realTimeData[realTimeData.length - 2].systemLoad) * 100 : 0,
      icon: <Cpu className="h-4 w-4" />,
      color: 'text-orange-600',
      trend: realTimeData.length > 1 ? 
        (currentMetrics.systemLoad > realTimeData[realTimeData.length - 2].systemLoad ? 'down' : 
         currentMetrics.systemLoad < realTimeData[realTimeData.length - 2].systemLoad ? 'up' : 'stable') : 'stable'
    },
    {
      title: 'Throughput',
      value: `${Math.round(currentMetrics.throughput)}/s`,
      change: realTimeData.length > 1 ? 
        ((currentMetrics.throughput - realTimeData[realTimeData.length - 2].throughput) / realTimeData[realTimeData.length - 2].throughput) * 100 : 0,
      icon: <Activity className="h-4 w-4" />,
      color: 'text-purple-600',
      trend: realTimeData.length > 1 ? 
        (currentMetrics.throughput > realTimeData[realTimeData.length - 2].throughput ? 'up' : 
         currentMetrics.throughput < realTimeData[realTimeData.length - 2].throughput ? 'down' : 'stable') : 'stable'
    }
  ] : [];
  
  // Chart data preparation
  const chartData = realTimeData.slice(-20).map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    users: item.activeUsers,
    responseTime: item.responseTime,
    systemLoad: item.systemLoad,
    throughput: item.throughput,
    memory: item.memoryUsage,
    cpu: item.cpuUsage
  }));
  
  // System health pie chart data
  const systemHealthData = currentMetrics ? [
    { name: 'CPU', value: currentMetrics.cpuUsage, color: '#8884d8' },
    { name: 'Memory', value: currentMetrics.memoryUsage, color: '#82ca9d' },
    { name: 'Disk', value: currentMetrics.diskUsage, color: '#ffc658' },
    { name: 'Available', value: Math.max(0, 100 - Math.max(currentMetrics.cpuUsage, currentMetrics.memoryUsage, currentMetrics.diskUsage)), color: '#e0e0e0' }
  ] : [];
  
  // Alert severity colors
  const getAlertColor = (severity: SystemAlert['severity'], type: SystemAlert['type']) => {
    if (type === 'error' || severity === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    if (type === 'warning' || severity === 'high') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (type === 'success') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h2>
          <p className="text-gray-600">Monitor system performance and user activity in real-time</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection Status */}
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
            className={`flex items-center gap-1 ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}
          >
            {connectionStatus === 'connected' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </Badge>
          
          {/* Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStreaming}
            className="flex items-center gap-1"
          >
            {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isStreaming ? 'Pause' : 'Start'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetData}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : metric.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : (
                        <div className="h-3 w-3" />
                      )}
                      <span className={`text-xs ${
                        metric.trend === 'up' ? 'text-green-600' :
                        metric.trend === 'down' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {Math.abs(metric.change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg bg-gray-50 ${metric.color}`}>
                    {metric.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
            { id: 'performance', label: 'Performance', icon: <Server className="h-4 w-4" /> },
            { id: 'alerts', label: 'Alerts', icon: <AlertCircle className="h-4 w-4" /> },
            { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'alerts' && alerts.filter(a => !a.resolved).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {alerts.filter(a => !a.resolved).length}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Activity
                  </CardTitle>
                  <CardDescription>Active users over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Health
                  </CardTitle>
                  <CardDescription>Resource utilization breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={systemHealthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {systemHealthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Response Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Response Time Trends
                  </CardTitle>
                  <CardDescription>Average response time over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="responseTime" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* System Load Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    System Resources
                  </CardTitle>
                  <CardDescription>CPU and memory usage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cpu" fill="#f59e0b" name="CPU %" />
                      <Bar dataKey="memory" fill="#8b5cf6" name="Memory %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 'alerts' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
                <CardDescription>Recent system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No alerts at this time</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${getAlertColor(alert.severity, alert.type)} ${
                          alert.resolved ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={alert.type === 'error' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {alert.type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {alert.severity.toUpperCase()}
                              </Badge>
                              {alert.resolved && (
                                <Badge variant="secondary" className="text-xs">
                                  RESOLVED
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm opacity-75 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                              className="ml-4"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Users Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Users Timeline
                  </CardTitle>
                  <CardDescription>User activity patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Throughput Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Request Throughput
                  </CardTitle>
                  <CardDescription>Requests per second over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="throughput" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default RealTimeAnalytics;
