import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Award, Users, BookOpen,
  Calendar, Clock, Filter, Download, RefreshCw, Zap,
  BarChart3, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceData {
  overallMetrics: {
    averageGrade: number;
    passRate: number;
    attendanceRate: number;
    completionRate: number;
    improvement: number;
  };
  subjectPerformance: Array<{
    subject: string;
    average: number;
    students: number;
    improvement: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    performance: number;
    attendance: number;
    assignments: number;
  }>;
  classComparison: Array<{
    class: string;
    performance: number;
    students: number;
    teacher: string;
  }>;
  skillsRadar: Array<{
    skill: string;
    current: number;
    target: number;
  }>;
}

interface PerformanceDashboardWidgetProps {
  data?: PerformanceData;
  className?: string;
}

const PerformanceDashboardWidget: React.FC<PerformanceDashboardWidgetProps> = ({
  data,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6m');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Sample data if none provided
  const performanceData: PerformanceData = useMemo(() => {
    if (data) return data;
    
    return {
      overallMetrics: {
        averageGrade: 82.5,
        passRate: 89.2,
        attendanceRate: 91.8,
        completionRate: 87.3,
        improvement: 4.2
      },
      subjectPerformance: [
        { subject: 'Mathematics', average: 85, students: 120, improvement: 5, difficulty: 'Hard' },
        { subject: 'Science', average: 78, students: 115, improvement: -2, difficulty: 'Medium' },
        { subject: 'English', average: 82, students: 125, improvement: 3, difficulty: 'Medium' },
        { subject: 'History', average: 76, students: 110, improvement: 1, difficulty: 'Easy' },
        { subject: 'Geography', average: 80, students: 105, improvement: 4, difficulty: 'Easy' }
      ],
      gradeDistribution: [
        { grade: 'A+', count: 45, percentage: 12 },
        { grade: 'A', count: 78, percentage: 21 },
        { grade: 'B+', count: 92, percentage: 25 },
        { grade: 'B', count: 85, percentage: 23 },
        { grade: 'C+', count: 48, percentage: 13 },
        { grade: 'C', count: 22, percentage: 6 }
      ],
      monthlyTrends: [
        { month: 'Jan', performance: 78, attendance: 89, assignments: 95 },
        { month: 'Feb', performance: 80, attendance: 87, assignments: 92 },
        { month: 'Mar', performance: 82, attendance: 91, assignments: 88 },
        { month: 'Apr', performance: 84, attendance: 93, assignments: 90 },
        { month: 'May', performance: 83, attendance: 90, assignments: 94 },
        { month: 'Jun', performance: 85, attendance: 92, assignments: 96 }
      ],
      classComparison: [
        { class: '10A', performance: 87, students: 32, teacher: 'Ms. Johnson' },
        { class: '10B', performance: 82, students: 30, teacher: 'Mr. Smith' },
        { class: '10C', performance: 85, students: 31, teacher: 'Dr. Brown' },
        { class: '11A', performance: 89, students: 28, teacher: 'Ms. Davis' },
        { class: '11B', performance: 84, students: 29, teacher: 'Mr. Wilson' }
      ],
      skillsRadar: [
        { skill: 'Problem Solving', current: 85, target: 90 },
        { skill: 'Critical Thinking', current: 78, target: 85 },
        { skill: 'Communication', current: 82, target: 88 },
        { skill: 'Collaboration', current: 88, target: 92 },
        { skill: 'Creativity', current: 75, target: 80 },
        { skill: 'Leadership', current: 70, target: 78 }
      ]
    };
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Grade</p>
                  <p className="text-2xl font-bold text-blue-600">{performanceData.overallMetrics.averageGrade}%</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+{performanceData.overallMetrics.improvement}%</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">{performanceData.overallMetrics.passRate}%</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-3 w-3 text-blue-500 mr-1" />
                    <span className="text-xs text-gray-600">Target: 85%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance</p>
                  <p className="text-2xl font-bold text-purple-600">{performanceData.overallMetrics.attendanceRate}%</p>
                  <div className="flex items-center mt-1">
                    <Users className="h-3 w-3 text-purple-500 mr-1" />
                    <span className="text-xs text-gray-600">Daily avg</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-orange-600">{performanceData.overallMetrics.completionRate}%</p>
                  <div className="flex items-center mt-1">
                    <BookOpen className="h-3 w-3 text-orange-500 mr-1" />
                    <span className="text-xs text-gray-600">Assignments</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={3} name="Performance" />
                  <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} name="Attendance" />
                  <Line type="monotone" dataKey="assignments" stroke="#f59e0b" strokeWidth={2} name="Assignments" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData.gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {performanceData.gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSubjectsTab = () => (
    <div className="space-y-6">
      {/* Subject Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData.subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performanceData.subjectPerformance.map((subject, index) => (
          <motion.div
            key={subject.subject}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{subject.subject}</h3>
                  <Badge variant={subject.difficulty === 'Hard' ? 'destructive' : subject.difficulty === 'Medium' ? 'secondary' : 'default'}>
                    {subject.difficulty}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-blue-600">{subject.average}%</span>
                    <div className="flex items-center">
                      {subject.improvement >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        subject.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {subject.improvement >= 0 ? '+' : ''}{subject.improvement}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{subject.students} students enrolled</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSkillsTab = () => (
    <div className="space-y-6">
      {/* Skills Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Assessment Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={performanceData.skillsRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Target" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Skills Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performanceData.skillsRadar.map((skill, index) => (
          <Card key={skill.skill} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{skill.skill}</h3>
                <Badge variant="outline">{skill.current}%</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current</span>
                  <span>Target: {skill.target}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full relative"
                    style={{ width: `${skill.current}%` }}
                  >
                    <div
                      className="absolute top-0 right-0 w-1 h-2 bg-green-500 rounded-full"
                      style={{ right: `${100 - skill.target}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Gap: {skill.target - skill.current} points to target
                </p>
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
            <span>Performance Dashboard</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1M</SelectItem>
                <SelectItem value="3m">3M</SelectItem>
                <SelectItem value="6m">6M</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="subjects" className="mt-6">
            {renderSubjectsTab()}
          </TabsContent>
          
          <TabsContent value="skills" className="mt-6">
            {renderSkillsTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboardWidget;