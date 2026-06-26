import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Bar, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Calendar, Clock, Target,
  Download, RefreshCw, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSchoolAIInsights } from '../../hooks/useAIAnalytics';
import { useSaasTenant } from '../../hooks/useSaasTenant';
import { formatCurrency } from '../../lib/utils';
import { AdminDashboardMetrics } from '../../services/saasService';

interface AnalyticsData {
  studentPerformance: Array<{
    subject: string;
    average: number;
    improvement: number;
    students: number;
  }>;
  attendanceTrends: Array<{
    month: string;
    attendance: number;
    target: number;
    classes: number;
  }>;
  teacherEffectiveness: Array<{
    teacher: string;
    rating: number;
    students: number;
    subjects: number;
  }>;
  departmentMetrics: Array<{
    department: string;
    performance: number;
    teachers: number;
    students: number;
    budget: number;
  }>;
  examResults: Array<{
    exam: string;
    passRate: number;
    averageScore: number;
    participants: number;
  }>;
}

interface AdvancedAnalyticsWidgetProps {
  data?: AnalyticsData;
  className?: string;
  liveMetrics?: AdminDashboardMetrics;
  isLoading?: boolean;
  liveTelemetry?: any;
}

const AdvancedAnalyticsWidget: React.FC<AdvancedAnalyticsWidgetProps> = ({
  data,
  className = '',
  liveMetrics,
  isLoading = false,
  liveTelemetry
}) => {
  const { current } = useSaasTenant();
  const activeTenant = current?.tenant;
  const { insights, loading, refetch } = useSchoolAIInsights();
  const [activeTab, setActiveTab] = useState('performance');
  const isRefreshing = loading;

  const analyticsData: AnalyticsData = useMemo(() => {
    const telemetry = liveTelemetry?.data || liveTelemetry;

    const departmentMetrics = (
      telemetry?.departments ||
      liveMetrics?.departments ||
      data?.departmentMetrics ||
      []
    ).map((department: any) => ({
      department: String(department?.department ?? department?.name ?? 'Department'),
      performance: Number(department?.performance ?? 0),
      teachers: Number(department?.teachers ?? 0),
      students: Number(department?.students ?? 0),
      budget: Number(department?.budget ?? 0)
    }));

    const attendanceTrends = (
      telemetry?.monthly_trends ||
      liveMetrics?.monthly_trends ||
      data?.attendanceTrends ||
      []
    ).map((trend: any) => ({
      month: String(trend?.month ?? ''),
      attendance: Number(trend?.attendance ?? 0),
      target: Number(trend?.target ?? 90),
      classes: Number(trend?.classes ?? telemetry?.academic_metrics?.classes_count ?? 0)
    }));

    const studentPerformance = (
      telemetry?.subject_performance ||
      data?.studentPerformance ||
      []
    ).map((subject: any) => ({
      subject: String(subject?.subject ?? 'Subject'),
      average: Number(subject?.average ?? subject?.average_score ?? 0),
      improvement: Number(subject?.improvement ?? 0),
      students: Number(subject?.students ?? subject?.student_count ?? 0)
    }));

    const teacherEffectiveness = (
      telemetry?.teacher_effectiveness ||
      data?.teacherEffectiveness ||
      []
    ).map((teacher: any) => ({
      teacher: String(teacher?.teacher ?? teacher?.name ?? 'Teacher'),
      rating: Number(teacher?.rating ?? 0),
      students: Number(teacher?.students ?? 0),
      subjects: Number(teacher?.subjects ?? 0)
    }));

    const examResults = (
      telemetry?.exam_results ||
      data?.examResults ||
      []
    ).map((exam: any) => ({
      exam: String(exam?.exam ?? exam?.title ?? 'Exam'),
      passRate: Number(exam?.passRate ?? exam?.pass_rate ?? 0),
      averageScore: Number(exam?.averageScore ?? exam?.average_score ?? 0),
      participants: Number(exam?.participants ?? exam?.student_count ?? 0)
    }));

    if (insights?.school_insights_available) {
      return {
        studentPerformance: insights.class_predictions.map((cp: any) => ({
          subject: String(cp.class_name ?? 'Class'),
          average: Number(cp.class_statistics.predicted_school_average || cp.class_statistics.predicted_average || 0),
          improvement: Number(cp.class_statistics.projected_change ?? 0),
          students: Number(cp.class_statistics.total_students || 0)
        })),
        attendanceTrends,
        teacherEffectiveness,
        departmentMetrics,
        examResults
      };
    }

    return {
      studentPerformance,
      attendanceTrends,
      teacherEffectiveness,
      departmentMetrics,
      examResults
    };
  }, [data, insights, liveMetrics, liveTelemetry]);

  const handleRefresh = async () => {
    await refetch();
  };

  const averageAttendance = analyticsData.attendanceTrends.length
    ? Number((analyticsData.attendanceTrends.reduce((sum, item) => sum + item.attendance, 0) / analyticsData.attendanceTrends.length).toFixed(1))
    : Number(liveMetrics?.attendance_rate ?? 0);
  const totalClasses = Number((liveTelemetry?.data || liveTelemetry)?.academic_metrics?.classes_count ?? 0);
  const absenteeismRate = Math.max(0, Number((100 - averageAttendance).toFixed(1)));
  const targetAttendanceRate = analyticsData.attendanceTrends[analyticsData.attendanceTrends.length - 1]?.target ?? 90;

  const renderEmptyState = (message: string) => (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Subject Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Subject Performance Overview</span>
            <Badge variant="outline">Average Scores</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {analyticsData.studentPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analyticsData.studentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="average" fill="#3b82f6" name="Average Score" />
                  <Line yAxisId="right" type="monotone" dataKey="improvement" stroke="#10b981" name="Improvement %" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : renderEmptyState('No live performance analytics available yet')}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyticsData.studentPerformance.map((subject, index) => (
          <motion.div
            key={subject.subject}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{subject.subject}</h3>
                  <Badge variant={subject.improvement >= 0 ? 'default' : 'destructive'}>
                    {subject.improvement >= 0 ? '+' : ''}{subject.improvement}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{subject.average}%</span>
                    {subject.improvement >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{subject.students} students</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {analyticsData.studentPerformance.length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Subject performance cards will appear when the dashboard receives live academic data.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderAttendanceTab = () => (
    <div className="space-y-6">
      {/* Attendance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {analyticsData.attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.attendanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Attendance %"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    name="Target"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : renderEmptyState('No live attendance trend data available yet')}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{averageAttendance}%</p>
                <p className="text-sm text-gray-600">Average Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalClasses}</p>
                <p className="text-sm text-gray-600">Total Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{absenteeismRate}%</p>
                <p className="text-sm text-gray-600">Absenteeism Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{targetAttendanceRate}%</p>
                <p className="text-sm text-gray-600">Target Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTeachersTab = () => (
    <div className="space-y-6">
      {/* Teacher Effectiveness Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Effectiveness Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {analyticsData.teacherEffectiveness.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={analyticsData.teacherEffectiveness}>
                  <RadialBar
                    label={{ position: 'insideStart', fill: '#fff' }}
                    background
                    dataKey="rating"
                    fill="#3b82f6"
                  />
                  <Legend iconSize={18} layout="vertical" verticalAlign="middle" align="right" />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : renderEmptyState('No live teacher effectiveness data available yet')}
          </div>
        </CardContent>
      </Card>

      {/* Teacher Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyticsData.teacherEffectiveness.map((teacher, index) => (
          <Card key={teacher.teacher} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{teacher.teacher}</h3>
                <Badge variant="outline">{teacher.rating}/5.0</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-medium">{teacher.students}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subjects:</span>
                  <span className="font-medium">{teacher.subjects}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(teacher.rating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {analyticsData.teacherEffectiveness.length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Teacher analytics will appear here when the backend exposes live effectiveness data.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderDepartmentsTab = () => (
    <div className="space-y-6">
      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance & Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {analyticsData.departmentMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analyticsData.departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value: any, name: string) => {
                    if (name.startsWith('Budget')) {
                      return [formatCurrency(Number(value), activeTenant?.currency || 'USD'), name];
                    }
                    return [`${value}%`, name];
                  }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="performance" fill="#10b981" name="Performance %" />
                  <Line yAxisId="right" type="monotone" dataKey="budget" stroke="#f59e0b" name={`Budget (${activeTenant?.currency || 'USD'})`} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : renderEmptyState('No department analytics available yet')}
          </div>
        </CardContent>
      </Card>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analyticsData.departmentMetrics.map((dept, index) => (
          <Card key={dept.department} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{dept.department}</h3>
                <Badge variant={dept.performance >= 85 ? 'default' : dept.performance >= 75 ? 'secondary' : 'destructive'}>
                  {dept.performance}%
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{dept.teachers || 0}</p>
                  <p className="text-xs text-gray-500">Teachers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{dept.students || 0}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-600 truncate" title={formatCurrency(dept.budget || 0, activeTenant?.currency || 'USD')}>
                    {formatCurrency(dept.budget || 0, activeTenant?.currency || 'USD')}
                  </p>
                  <p className="text-xs text-gray-500">Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {analyticsData.departmentMetrics.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Department-level analytics will appear here when live department records are available.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Advanced Analytics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-6">
            {renderPerformanceTab()}
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            {renderAttendanceTab()}
          </TabsContent>

          <TabsContent value="teachers" className="mt-6">
            {renderTeachersTab()}
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            {renderDepartmentsTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdvancedAnalyticsWidget;
