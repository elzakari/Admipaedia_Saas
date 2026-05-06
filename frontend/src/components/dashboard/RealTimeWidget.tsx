import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface RealTimeData {
  activeUsers: number;
  onlineTeachers: number;
  currentClasses: number;
  systemStatus: 'healthy' | 'warning' | 'error';
  lastUpdated: Date;
}

interface RealTimeWidgetProps {
  refreshInterval?: number;
  className?: string;
}

const RealTimeWidget: React.FC<RealTimeWidgetProps> = ({
  refreshInterval = 30000, // 30 seconds
  className = ''
}) => {
  const [data, setData] = useState<RealTimeData>({
    activeUsers: 0,
    onlineTeachers: 0,
    currentClasses: 0,
    systemStatus: 'healthy',
    lastUpdated: new Date()
  });
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Simulate real-time data updates
    const updateData = () => {
      setData({
        activeUsers: Math.floor(Math.random() * 500) + 200,
        onlineTeachers: Math.floor(Math.random() * 50) + 20,
        currentClasses: Math.floor(Math.random() * 20) + 5,
        systemStatus: Math.random() > 0.1 ? 'healthy' : 'warning',
        lastUpdated: new Date()
      });
    };

    // Initial load
    updateData();

    // Set up interval for updates
    const interval = setInterval(updateData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Activity className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live System Status</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real-time metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-500 mr-1" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{data.activeUsers}</p>
            <p className="text-xs text-gray-500">Active Users</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            </div>
            <p className="text-2xl font-bold text-green-600">{data.onlineTeachers}</p>
            <p className="text-xs text-gray-500">Online Teachers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-purple-500 mr-1" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{data.currentClasses}</p>
            <p className="text-xs text-gray-500">Active Classes</p>
          </div>
        </div>

        {/* System status */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(data.systemStatus)}>
              {getStatusIcon(data.systemStatus)}
              <span className="ml-1 capitalize">{data.systemStatus}</span>
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            Updated: {data.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeWidget;