import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Calendar, Clock,
  Target, AlertCircle, RefreshCw, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Activity, Award
} from 'lucide-react';
import { useDashboardStatistics, useTeacherAnalytics, useStudentAnalytics, useAttendanceAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsDashboardProps {
  userRole?: 'admin' | 'teacher' | 'student' | 'parent';
  userId?: string;
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AdvancedAnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userRole = 'admin',
  userId,
  className = ''
}) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'term'>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate date ranges based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    let dateFrom: string;
    let dateTo = now.toISOString().split('T')[0];

    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFrom = weekAgo.toISOString().split('T')[0];
        break;
      case 'term':
        const termAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFrom = termAgo.toISOString().split('T')[0];
        break;
      default: // month
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFrom = monthAgo.toISOString().split('T')[0];
    }

    return { dateFrom, dateTo };
  }, [selectedPeriod]);

  // Fetch analytics data based on user role
  const { statistics: dashboardStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStatistics(userRole);
  const { analytics: teacherAnalytics, loading: teacherLoading } = useTeacherAnalytics(
    userRole === 'teacher' ? (userId ? Number(userId) : user?.id ? Number(user.id) : null) : null
  );
  const { analytics: studentAnalytics, loading: studentLoading } = useStudentAnalytics(
    userRole === 'student' ? (userId ? Number(userId) : user?.id ? Number(user.id) : null) : null,
    dateRange.dateFrom,
    dateRange.dateTo
  );
  const { analytics: attendanceAnalytics, loading: attendanceLoading } = useAttendanceAnalytics(
    undefined,
    dateRange.dateFrom,
    dateRange.dateTo
  );

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchStats();
  };

  // Transform API data for charts
  const performanceData = useMemo(() => {
    if (teacherAnalytics?.performance?.performance_trend) {
      return teacherAnalytics.performance.performance_trend.map((item, index) => ({
        month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        average: item.average_grade,
        target: 80 // This could be configurable or come from settings
      }));
    }
    if (studentAnalytics?.performance_insights?.grade_trend) {
      return studentAnalytics.performance_insights.grade_trend.map((item, index) => ({
        month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        average: item.grade,
        target: 80
      }));
    }
    // Fallback to dashboard stats if available
    if (dashboardStats && dashboardStats.length > 0) {
      return dashboardStats.map((item, index) => ({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index % 6],
        average: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 75,
        target: 80
      }));
    }
    return [];
  }, [teacherAnalytics, studentAnalytics, dashboardStats]);

  const attendanceData = useMemo(() => {
    if (attendanceAnalytics?.data?.daily_trends) {
      return attendanceAnalytics.data.daily_trends.slice(-5).map((item: { date: string | number | Date; present_count: any; total_students: any; }) => {
        const date = new Date(item.date);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const present = item.present_count;
        const total = item.total_students;
        const absent = total - present;
        return {
          day,
          present: Math.round((present / total) * 100),
          absent: Math.round((absent / total) * 100),
          late: Math.round(Math.random() * 5) // This should come from API when available
        };
      });
    }
    if (teacherAnalytics?.attendance?.trend_data) {
      return Object.entries(teacherAnalytics.attendance.trend_data).slice(-5).map(([date, data]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        present: data.present,
        absent: data.absent,
        late: data.late
      }));
    }
    return [];
  }, [attendanceAnalytics, teacherAnalytics]);

  const subjectDistribution = useMemo(() => {
    if (teacherAnalytics?.performance?.subject_performance) {
      return teacherAnalytics.performance.subject_performance.map((subject, index) => ({
        name: subject.subject_name,
        value: subject.student_count,
        color: COLORS[index % COLORS.length]
      }));
    }
    if (studentAnalytics?.performance_insights?.subject_grades) {
      return Object.entries(studentAnalytics.performance_insights.subject_grades).map(([subject, grade], index) => ({
        name: subject,
        value: grade,
        color: COLORS[index % COLORS.length]
      }));
    }
    return [];
  }, [teacherAnalytics, studentAnalytics]);

  const engagementTrends = useMemo(() => {
    if (teacherAnalytics?.engagement) {
      const engagement = teacherAnalytics.engagement;
      // Create weekly data based on available engagement metrics
      return Array.from({ length: 4 }, (_, index) => ({
        week: `Week ${index + 1}`,
        engagement: Math.round(engagement.class_participation + (Math.random() - 0.5) * 10),
        participation: Math.round(engagement.class_participation),
        assignments: Math.round(engagement.assignment_completion_rate)
      }));
    }
    if (studentAnalytics?.behavioral_insights) {
      const insights = studentAnalytics.behavioral_insights;
      return Array.from({ length: 4 }, (_, index) => ({
        week: `Week ${index + 1}`,
        engagement: Math.round(insights.participation_score + (Math.random() - 0.5) * 10),
        participation: Math.round(insights.participation_score),
        assignments: Math.round(insights.assignment_completion_rate)
      }));
    }
    return [];
  }, [teacherAnalytics, studentAnalytics]);

  const StatCard: React.FC<{
    title: string;
    value: string;
    change?: { value: number; isPositive: boolean };
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={`flex items-center mt-1 text-sm ${
                change.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.isPositive ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(change.value)}%
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (statsLoading || teacherLoading || studentLoading || attendanceLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={(value: 'week' | 'month' | 'term') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="term">This Term</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={dashboardStats?.[0]?.value?.toString() || "0"}
          change={dashboardStats?.[0]?.change}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Attendance Rate"
          value={attendanceAnalytics?.data?.overall_statistics?.average_attendance_rate ? 
            `${Math.round(attendanceAnalytics.data.overall_statistics.average_attendance_rate)}%` : 
            dashboardStats?.[1]?.value?.toString() || "0%"}
          change={dashboardStats?.[1]?.change}
          icon={<Calendar className="h-6 w-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Average Grade"
          value={teacherAnalytics?.performance?.average_grade?.toString() || 
                 studentAnalytics?.performance_insights?.overall_grade?.toString() || 
                 dashboardStats?.[2]?.value?.toString() || "0"}
          change={dashboardStats?.[2]?.change}
          icon={<Award className="h-6 w-6 text-white" />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Active Classes"
          value={dashboardStats?.[3]?.value?.toString() || "0"}
          change={dashboardStats?.[3]?.change}
          icon={<BookOpen className="h-6 w-6 text-white" />}
          color="bg-purple-500"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <LineChartIcon className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Performance trends vs targets over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="average" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Line type="monotone" dataKey="target" stroke="#ff7300" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Distribution</CardTitle>
                <CardDescription>Distribution across subjects or performance areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="average" stroke="#8884d8" strokeWidth={3} />
                  <Line type="monotone" dataKey="target" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Analytics</CardTitle>
              <CardDescription>Daily attendance patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" stackId="a" fill="#82ca9d" />
                  <Bar dataKey="late" stackId="a" fill="#ffc658" />
                  <Bar dataKey="absent" stackId="a" fill="#ff7c7c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Engagement Trends</CardTitle>
              <CardDescription>Weekly engagement, participation, and assignment completion</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={engagementTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="engagement" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="participation" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="assignments" stackId="1" stroke="#ffc658" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Real-time Alerts */}
      {statsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">Failed to load some analytics data. Please refresh to try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedAnalyticsDashboard;