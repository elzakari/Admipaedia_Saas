import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Calendar, Clock, Target,
  Download, RefreshCw, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSchoolAIInsights } from '../../hooks/useAIAnalytics';

interface AnalyticsData {
  studentPerformance: Array<{
    subject: string;
    average: number;
    improvement: number;
    students: number;
  }>;
  // ... (omitting lines for brevity in replacementContent if allowed, but I'll provide full block to be safe)
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
}

const AdvancedAnalyticsWidget: React.FC<AdvancedAnalyticsWidgetProps> = ({
  data,
  className = ''
}) => {
  const { insights, loading, error, refetch } = useSchoolAIInsights();
  const [activeTab, setActiveTab] = useState('performance');
  const [timeRange, setTimeRange] = useState('6m');
  const isRefreshing = loading;
  const setIsRefreshing = (val: boolean) => { if (!val) refetch(); };

  // Map AI insights to the local AnalyticsData format
  const analyticsData: AnalyticsData = useMemo(() => {
    if (data) return data;
    if (insights && insights.school_insights_available) {
      // Transforming backend insights to frontend widget format
      // This is a simplified transformation for demonstration
      return {
        studentPerformance: insights.class_predictions.map((cp: any) => ({
          subject: cp.class_name,
          average: cp.class_statistics.predicted_school_average || cp.class_statistics.predicted_average,
          improvement: 5, // Placeholder
          students: cp.class_statistics.total_students
        })),
        attendanceTrends: [
          { month: 'Jan', attendance: 92, target: 90, classes: 450 },
          { month: 'Feb', attendance: 88, target: 90, classes: 420 },
          { month: 'Mar', attendance: 94, target: 90, classes: 480 },
          { month: 'Apr', attendance: 91, target: 90, classes: 465 },
          { month: 'May', attendance: 89, target: 90, classes: 440 },
          { month: 'Jun', attendance: 93, target: 90, classes: 470 }
        ],
        // ... use real data if available in insights ...
        teacherEffectiveness: [
          { teacher: 'Dr. Smith', rating: 4.8, students: 85, subjects: 2 },
          { teacher: 'Ms. Johnson', rating: 4.6, students: 92, subjects: 3 },
          { teacher: 'Mr. Brown', rating: 4.4, students: 78, subjects: 2 }
        ],
        departmentMetrics: [],
        examResults: []
      };
    }

    return {
      studentPerformance: [
        { subject: 'Mathematics', average: 85, improvement: 5, students: 120 },
        { subject: 'Science', average: 78, improvement: -2, students: 115 },
        { subject: 'English', average: 82, improvement: 3, students: 125 },
        { subject: 'History', average: 76, improvement: 1, students: 110 },
        { subject: 'Geography', average: 80, improvement: 4, students: 105 }
      ],
      attendanceTrends: [
        { month: 'Jan', attendance: 92, target: 90, classes: 450 },
        { month: 'Feb', attendance: 88, target: 90, classes: 420 },
        { month: 'Mar', attendance: 94, target: 90, classes: 480 },
        { month: 'Apr', attendance: 91, target: 90, classes: 465 },
        { month: 'May', attendance: 89, target: 90, classes: 440 },
        { month: 'Jun', attendance: 93, target: 90, classes: 470 }
      ],
      teacherEffectiveness: [
        { teacher: 'Dr. Smith', rating: 4.8, students: 85, subjects: 2 },
        { teacher: 'Ms. Johnson', rating: 4.6, students: 92, subjects: 3 },
        { teacher: 'Mr. Brown', rating: 4.4, students: 78, subjects: 2 },
        { teacher: 'Dr. Wilson', rating: 4.7, students: 88, subjects: 1 },
        { teacher: 'Ms. Davis', rating: 4.5, students: 95, subjects: 2 }
      ],
      departmentMetrics: [
        { department: 'Science', performance: 85, teachers: 12, students: 340, budget: 45000 },
        { department: 'Mathematics', performance: 88, teachers: 10, students: 320, budget: 38000 },
        { department: 'Languages', performance: 82, teachers: 15, students: 380, budget: 42000 },
        { department: 'Social Studies', performance: 79, teachers: 8, students: 280, budget: 35000 },
        { department: 'Arts', performance: 86, teachers: 6, students: 220, budget: 28000 }
      ],
      examResults: [
        { exam: 'Mid-term', passRate: 87, averageScore: 78, participants: 450 },
        { exam: 'Final', passRate: 92, averageScore: 82, participants: 445 },
        { exam: 'Mock Test', passRate: 84, averageScore: 75, participants: 430 },
        { exam: 'Unit Test', passRate: 89, averageScore: 79, participants: 460 }
      ]
    };
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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
                <p className="text-2xl font-bold">91.2%</p>
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
                <p className="text-2xl font-bold">2,725</p>
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
                <p className="text-2xl font-bold">8.8%</p>
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
                <p className="text-2xl font-bold">90%</p>
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
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analyticsData.departmentMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="performance" fill="#10b981" name="Performance %" />
                <Line yAxisId="right" type="monotone" dataKey="budget" stroke="#f59e0b" name="Budget ($)" />
              </ComposedChart>
            </ResponsiveContainer>
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
                  <p className="text-2xl font-bold text-blue-600">{dept.teachers}</p>
                  <p className="text-xs text-gray-500">Teachers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{dept.students}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">${(dept.budget / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-gray-500">Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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