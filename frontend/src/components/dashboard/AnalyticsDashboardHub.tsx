import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter, ScatterChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Calendar, Clock,
  Target, AlertCircle, RefreshCw, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Activity, Award, Download, Settings,
  Filter, Eye, Maximize2, Grid, List, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStatistics, useTeacherAnalytics, useStudentAnalytics, useAttendanceAnalytics } from '../../hooks/useAnalytics';
import CustomReportBuilder from './CustomReportBuilder';
import DataVisualizationWidget from './DataVisualizationWidget';
import RealTimeAnalytics from './RealTimeAnalytics';

interface AnalyticsDashboardHubProps {
  className?: string;
}

const AnalyticsDashboardHub: React.FC<AnalyticsDashboardHubProps> = ({ className }) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'detailed' | 'reports' | 'realtime'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data hooks
  const { statistics: dashboardStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStatistics(user?.role);
  const { analytics: teacherAnalytics, loading: teacherLoading } = useTeacherAnalytics(user?.id ? Number(user.id) : null);
  const { analytics: studentAnalytics, loading: studentLoading } = useStudentAnalytics(user?.id ? Number(user.id) : null);
  const { analytics: attendanceAnalytics, loading: attendanceLoading } = useAttendanceAnalytics(undefined, undefined, undefined);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchStats();
  };

  // Comprehensive analytics data processing
  const analyticsData = useMemo(() => {
    const processedData = {
      overview: {
        totalStudents: dashboardStats?.[0]?.value || 0,
        attendanceRate: attendanceAnalytics?.data?.overall_statistics?.average_attendance_rate || 0,
        averageGrade: teacherAnalytics?.performance?.average_grade || studentAnalytics?.performance_insights?.overall_grade || 0,
        activeClasses: dashboardStats?.[3]?.value || 0
      },
      trends: {
        performance: teacherAnalytics?.class_performance?.map((item) => ({
          month: item.class_name,
          average: item.average_grade,
          target: 80,
          improvement: 0
        })) || [],
        attendance: attendanceAnalytics?.data?.daily_trends?.slice(-30).map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          present: item.present_count,
          absent: item.total_students - item.present_count,
          rate: (item.present_count / item.total_students) * 100
        })) || []
      },
      distribution: {
        grades: teacherAnalytics?.class_performance ?
          teacherAnalytics.class_performance.map((item: any) => ({
            grade: item.class_name,
            count: item.average_grade,
            percentage: item.attendance_rate
          })) : [],
        subjects: teacherAnalytics?.workload_analysis ? [{
          name: 'Total Students',
          average: teacherAnalytics.workload_analysis.total_students,
          students: teacherAnalytics.workload_analysis.total_students,
          performance: 'good'
        }] : []
      }
    };
    return processedData;
  }, [dashboardStats, teacherAnalytics, studentAnalytics, attendanceAnalytics]);

  const StatCard = ({ title, value, change, icon, color, trend }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${color} text-white relative overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">{title}</p>
              <p className="text-3xl font-bold text-white">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  {change.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-white/80 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-white/80 mr-1" />
                  )}
                  <span className="text-white/80 text-sm">
                    {Math.abs(change.value)}% {change.isPositive ? 'increase' : 'decrease'}
                  </span>
                </div>
              )}
            </div>
            <div className="text-white/60">{icon}</div>
          </div>
          {trend && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-white/40 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, trend))}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className={`space-y-6 ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and data visualization</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={statsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={analyticsData.overview.totalStudents.toLocaleString()}
          change={dashboardStats?.[0]?.change}
          icon={<Users className="h-8 w-8" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={75}
        />
        <StatCard
          title="Attendance Rate"
          value={`${Math.round(analyticsData.overview.attendanceRate)}%`}
          change={dashboardStats?.[1]?.change}
          icon={<Calendar className="h-8 w-8" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
          trend={analyticsData.overview.attendanceRate}
        />
        <StatCard
          title="Average Grade"
          value={analyticsData.overview.averageGrade.toFixed(1)}
          change={dashboardStats?.[2]?.change}
          icon={<Award className="h-8 w-8" />}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          trend={analyticsData.overview.averageGrade}
        />
        <StatCard
          title="Active Classes"
          value={analyticsData.overview.activeClasses.toLocaleString()}
          change={dashboardStats?.[3]?.change}
          icon={<BookOpen className="h-8 w-8" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          trend={85}
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Detailed Analysis
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Academic performance over time with targets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={analyticsData.trends.performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="average" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                    <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
                    <Bar dataKey="improvement" fill="#10b981" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Analytics</CardTitle>
                <CardDescription>Daily attendance patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analyticsData.trends.attendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="#10b981" />
                    <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Grade Distribution and Subject Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Distribution of student grades</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.distribution.grades}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ grade, percentage }) => `${grade}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.distribution.grades.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Performance across different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.distribution.subjects}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <DataVisualizationWidget
            data={analyticsData}
            timeRange={timeRange}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <CustomReportBuilder />
        </TabsContent>

        <TabsContent value="realtime" className="mt-6">
          <RealTimeAnalytics refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

      {/* Error Handling */}
      {statsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Failed to load analytics data. Please refresh to try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboardHub;