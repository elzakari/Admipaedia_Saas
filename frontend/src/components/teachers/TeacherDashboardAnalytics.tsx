import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Users, Clock, Calendar, BookOpen, Award, FileText, Loader2 } from 'lucide-react';
import { AssignmentManagement } from './AssignmentManagement';
import analyticsService, { TeacherAnalytics } from '../../services/analyticsService';

interface TeacherDashboardAnalyticsProps {
  teacherId: number;
  classData?: any;
  attendanceData?: any;
  performanceData?: any;
}

// Transform API data to chart format
const transformAttendanceData = (attendanceData: any) => {
  if (!attendanceData?.trend_data) return [];
  
  return Object.entries(attendanceData.trend_data).map(([date, data]: [string, any]) => ({
    name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    present: data.present || 0,
    absent: data.absent || 0,
    late: data.late || 0,
  }));
};

const transformPerformanceData = (performanceData: any) => {
  if (!performanceData?.grade_distribution) return [];
  
  const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];
  return Object.entries(performanceData.grade_distribution).map(([grade, count]: [string, any], index) => ({
    name: grade,
    value: count,
    color: colors[index % colors.length],
  }));
};

const transformTrendData = (performanceData: any) => {
  if (!performanceData?.performance_trend) return [];
  
  return performanceData.performance_trend.map((item: any) => ({
    month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
    avgScore: item.average_grade || 0,
  }));
};

export function TeacherDashboardAnalytics({ 
  teacherId, 
  classData, 
  attendanceData, 
  performanceData 
}: TeacherDashboardAnalyticsProps) {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  // Fetch teacher analytics data
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery<TeacherAnalytics>({
    queryKey: ['teacherAnalytics', teacherId, selectedClass, selectedPeriod],
    queryFn: () => analyticsService.getTeacherAnalytics(teacherId),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000
  });

  // Transform data for charts
  const attendanceChartData = analytics ? transformAttendanceData(analytics.attendance) : [];
  const performanceChartData = analytics ? transformPerformanceData(analytics.performance) : [];
  const trendChartData = analytics ? transformTrendData(analytics.performance) : [];
  const atRiskStudents = analytics?.students_at_risk || [];

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading analytics data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-700">Failed to Load Analytics</h3>
            <p className="text-red-600 mt-2">Unable to fetch analytics data. Please try again.</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Class Analytics Dashboard</CardTitle>
        <CardDescription>
          Comprehensive analytics to track student performance, attendance, and engagement
        </CardDescription>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="class-10a">Grade 10A</SelectItem>
              <SelectItem value="class-9b">Grade 9B</SelectItem>
              <SelectItem value="class-11c">Grade 11C</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>
          
          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.attendance?.overall_rate?.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">Class average</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.attendance?.status_breakdown?.present || 0}</div>
                  <p className="text-xs text-muted-foreground">Students present</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.attendance?.status_breakdown?.late || 0}</div>
                  <p className="text-xs text-muted-foreground">Students late</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Absences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.attendance?.status_breakdown?.absent || 0}</div>
                  <p className="text-xs text-muted-foreground">Students absent</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Attendance trend chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" stackId="a" fill="#4CAF50" />
                    <Bar dataKey="late" stackId="a" fill="#FFC107" />
                    <Bar dataKey="absent" stackId="a" fill="#F44336" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* At-risk students based on attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Concerns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {atRiskStudents.length > 0 ? (
                    atRiskStudents.map((student: any) => (
                      <div key={student.id} className="flex items-start space-x-4 p-3 rounded-lg border">
                        <div className={`p-2 rounded-full ${
                          student.attendance_rate < 70 ? 'bg-red-100' : 
                          student.attendance_rate < 85 ? 'bg-amber-100' : 'bg-green-100'
                        }`}>
                          <AlertCircle className={`h-5 w-5 ${
                            student.attendance_rate < 70 ? 'text-red-500' : 
                            student.attendance_rate < 85 ? 'text-amber-500' : 'text-green-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{student.name}</h4>
                            <Badge variant={student.attendance_rate < 70 ? 'destructive' : 'secondary'}>
                              {student.attendance_rate}% attendance
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Risk factors: {student.risk_factors?.join(', ') || 'Low attendance'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last activity: {student.last_activity || 'N/A'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Contact
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance concerns at this time</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {/* Performance metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.performance?.average_grade?.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">Overall performance</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceChartData.find(d => d.name.includes('A'))?.value || 0}</div>
                  <p className="text-xs text-muted-foreground">Students with A grades</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Need Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceChartData.find(d => d.name.includes('F'))?.value || 0}</div>
                  <p className="text-xs text-muted-foreground">Students below 60%</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Grade distribution chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performanceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {performanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Performance trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            {/* Engagement metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Class Participation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.engagement?.class_participation || 85}%</div>
                  <p className="text-xs text-muted-foreground">+5% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">On-Time Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.engagement?.assignment_completion_rate || analytics?.assignments?.average_submission_rate?.toFixed(0) || 78}%</div>
                  <p className="text-xs text-muted-foreground">Assignment completion</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.engagement?.resource_usage || 65}%</div>
                  <p className="text-xs text-muted-foreground">+10% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Discussion Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.engagement?.discussion_posts || 142}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Engagement insights */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Insights</CardTitle>
                  <CardDescription>AI-powered insights to improve student engagement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-purple-100">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">Group Activities</h4>
                        <p className="text-sm text-muted-foreground">Students show 15% higher engagement in collaborative activities</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">Time of Day Impact</h4>
                        <p className="text-sm text-muted-foreground">Morning activities have 20% higher completion rates</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-green-100">
                        <BookOpen className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">Interactive Content</h4>
                        <p className="text-sm text-muted-foreground">Multimedia lessons increase retention by 30%</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <div className="space-y-6">
              {/* Assignment metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.assignments?.total_assignments || 0}</div>
                    <p className="text-xs text-muted-foreground">This semester</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.assignments?.pending_grading || 0}</div>
                    <p className="text-xs text-muted-foreground">Need attention</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.assignments?.overdue_assignments || 0}</div>
                    <p className="text-xs text-muted-foreground">Past deadline</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Submission Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.assignments?.average_submission_rate?.toFixed(0) || 0}%</div>
                    <p className="text-xs text-muted-foreground">Class average</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Assignment Management Component */}
              <AssignmentManagement />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

  
  
