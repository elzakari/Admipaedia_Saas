import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "../ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  AlertTriangle, 
  BarChart3, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Lightbulb,
  Activity,
  PieChart,
  LineChart,
  Settings,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useExams } from '../../hooks/useExams';
import { useClasses } from '../../hooks/useClasses';
import { useSubjects } from '../../hooks/useSubjects';
import { toast } from 'react-hot-toast';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts';

interface ConflictInfo {
  has_conflicts: boolean;
  time_conflicts: Array<{
    exam_id: number;
    title: string;
    subject: string;
    exam_date: string;
    duration: number;
    conflict_type: string;
  }>;
  teacher_conflicts: any[];
  student_workload: {
    same_day_exams: number;
    warning: string;
    exams: Array<{
      title: string;
      subject: string;
      time: string;
    }>;
  };
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ExamAnalytics {
  exam_id: number;
  title: string;
  subject: string;
  class: string;
  exam_date: string;
  total_students: number;
  total_marks: number;
  passing_marks: number;
  statistics: {
    mean: number;
    median: number;
    mode?: number;
    std_dev: number;
    min: number;
    max: number;
    range: number;
    pass_rate: number;
  };
  grade_distribution: Record<string, {
    count: number;
    percentage: number;
    range: string;
  }>;
  performance_insights: string[];
  difficulty_analysis: {
    level: string;
    recommendation: string;
    discrimination_index: number;
    reliability_indicator: string;
  };
}

interface ScheduleData {
  class_id: number;
  schedule: Record<string, Array<{
    id: number;
    title: string;
    subject: string;
    time: string;
    duration: number;
    total_marks: number;
    status: string;
  }>>;
  conflicts: Array<{
    date: string;
    exam_id: number;
    conflicts: ConflictInfo;
  }>;
  workload_stats: {
    total_exams: number;
    days_with_exams: number;
    max_exams_per_day: number;
    avg_exams_per_day: number;
  };
  recommendations: string[];
}

const AdvancedExamManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('conflicts');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });
  
  // State for different features
  const [conflictData, setConflictData] = useState<ConflictInfo | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ExamAnalytics[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Hooks
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: exams, refetch: refetchExams } = useExams({
    class_id: selectedClass || undefined,
    subject_id: selectedSubject || undefined,
    date_from: dateRange.from,
    date_to: dateRange.to,
    include_conflicts: true
  });

  // Mock API functions (replace with actual API calls)
  const checkExamConflicts = async (examData: any): Promise<ConflictInfo> => {
    // Mock implementation
    return {
      has_conflicts: Math.random() > 0.7,
      time_conflicts: [],
      teacher_conflicts: [],
      student_workload: {
        same_day_exams: Math.floor(Math.random() * 4),
        warning: 'Moderate exam load',
        exams: []
      },
      recommendations: ['Consider rescheduling to reduce workload'],
      severity: 'medium'
    };
  };

  const getExamAnalytics = async (examId: number): Promise<ExamAnalytics> => {
    // Mock implementation
    return {
      exam_id: examId,
      title: 'Sample Exam',
      subject: 'Mathematics',
      class: 'Grade 10A',
      exam_date: new Date().toISOString(),
      total_students: 30,
      total_marks: 100,
      passing_marks: 50,
      statistics: {
        mean: 72.5,
        median: 75,
        std_dev: 12.3,
        min: 45,
        max: 95,
        range: 50,
        pass_rate: 85.5
      },
      grade_distribution: {
        'A+': { count: 3, percentage: 10, range: '90-100%' },
        'A': { count: 5, percentage: 16.7, range: '80-89%' },
        'B+': { count: 4, percentage: 13.3, range: '75-79%' },
        'B': { count: 6, percentage: 20, range: '70-74%' },
        'C+': { count: 4, percentage: 13.3, range: '65-69%' },
        'C': { count: 3, percentage: 10, range: '60-64%' },
        'D+': { count: 2, percentage: 6.7, range: '55-59%' },
        'D': { count: 2, percentage: 6.7, range: '50-54%' },
        'E': { count: 1, percentage: 3.3, range: '45-49%' },
        'F': { count: 0, percentage: 0, range: '0-44%' }
      },
      performance_insights: [
        'Good overall performance with 85.5% pass rate',
        'Performance distribution is well-balanced',
        'Consider reviewing topics for struggling students'
      ],
      difficulty_analysis: {
        level: 'Appropriate',
        recommendation: 'Good balance of difficulty',
        discrimination_index: 0.65,
        reliability_indicator: 'High'
      }
    };
  };

  const getClassSchedule = async (classId: number): Promise<ScheduleData> => {
    // Mock implementation
    return {
      class_id: classId,
      schedule: {
        '2024-04-15': [
          {
            id: 1,
            title: 'Mathematics Midterm',
            subject: 'Mathematics',
            time: '09:00',
            duration: 120,
            total_marks: 100,
            status: 'scheduled'
          }
        ]
      },
      conflicts: [],
      workload_stats: {
        total_exams: 8,
        days_with_exams: 6,
        max_exams_per_day: 2,
        avg_exams_per_day: 1.3
      },
      recommendations: ['Exam schedule appears well-balanced']
    };
  };

  // Load data based on active tab
  useEffect(() => {
    const loadData = async () => {
      if (!selectedClass) return;
      
      setLoading(true);
      try {
        switch (activeTab) {
          case 'analytics':
            if (exams?.exams) {
              const analyticsPromises = exams.exams.slice(0, 5).map(exam => 
                getExamAnalytics(exam.id)
              );
              const analytics = await Promise.all(analyticsPromises);
              setAnalyticsData(analytics);
            }
            break;
          
          case 'schedule':
            const schedule = await getClassSchedule(selectedClass);
            setScheduleData(schedule);
            break;
          
          case 'trends':
            // Mock performance trends data
            setPerformanceTrends([
              { date: '2024-01', mean: 68, pass_rate: 78 },
              { date: '2024-02', mean: 72, pass_rate: 82 },
              { date: '2024-03', mean: 75, pass_rate: 85 },
              { date: '2024-04', mean: 73, pass_rate: 83 }
            ]);
            break;
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, selectedClass, exams]);

  // Render conflict detection tab
  const renderConflictDetection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Exam Conflict Detection
          </CardTitle>
          <CardDescription>
            Identify and resolve scheduling conflicts for exams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Select value={selectedClass?.toString() || ''} onValueChange={(value) => setSelectedClass(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
            
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>

          {exams?.exams && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Scheduled Exams</h3>
              <div className="grid gap-4">
                {exams.exams.map((exam) => (
                  <Card key={exam.id} className={`border-l-4 ${
                    exam.conflicts?.has_conflicts 
                      ? exam.conflicts.severity === 'critical' 
                        ? 'border-l-red-500' 
                        : 'border-l-yellow-500'
                      : 'border-l-green-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{exam.title}</h4>
                          <p className="text-sm text-gray-600">
                            {exam.subject_name} • {format(parseISO(exam.exam_date), 'PPP p')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duration: {exam.duration} minutes • {exam.total_marks} marks
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {exam.conflicts?.has_conflicts ? (
                            <Badge variant={exam.conflicts.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {exam.conflicts.severity === 'critical' ? (
                                <XCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {exam.conflicts.severity} conflict
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              No conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {exam.conflicts?.has_conflicts && (
                        <div className="mt-4 space-y-2">
                          {exam.conflicts.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render analytics tab
  const renderAnalytics = () => (
    <div className="space-y-6">
      {analyticsData.map((analytics) => (
        <Card key={analytics.exam_id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {analytics.title} - Analytics
            </CardTitle>
            <CardDescription>
              {analytics.subject} • {analytics.class} • {format(parseISO(analytics.exam_date), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.total_students}</p>
                      <p className="text-sm text-gray-600">Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.statistics.mean}%</p>
                      <p className="text-sm text-gray-600">Average Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.statistics.pass_rate}%</p>
                      <p className="text-sm text-gray-600">Pass Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.difficulty_analysis.level}</p>
                      <p className="text-sm text-gray-600">Difficulty</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grade Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={Object.entries(analytics.grade_distribution).map(([grade, data]) => ({
                      grade,
                      count: data.count,
                      percentage: data.percentage
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.performance_insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Difficulty Analysis</h4>
                      <p className="text-sm text-blue-800">{analytics.difficulty_analysis.recommendation}</p>
                      <div className="mt-2 text-xs text-blue-700">
                        <span>Discrimination Index: {analytics.difficulty_analysis.discrimination_index}</span>
                        <span className="ml-4">Reliability: {analytics.difficulty_analysis.reliability_indicator}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render schedule optimization tab
  const renderScheduleOptimization = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exam Schedule Optimization
          </CardTitle>
          <CardDescription>
            Optimize exam schedules to minimize conflicts and student workload
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduleData && (
            <div className="space-y-6">
              {/* Workload Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{scheduleData.workload_stats.total_exams}</p>
                      <p className="text-sm text-gray-600">Total Exams</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{scheduleData.workload_stats.days_with_exams}</p>
                      <p className="text-sm text-gray-600">Exam Days</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{scheduleData.workload_stats.max_exams_per_day}</p>
                      <p className="text-sm text-gray-600">Max Per Day</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{scheduleData.workload_stats.avg_exams_per_day}</p>
                      <p className="text-sm text-gray-600">Avg Per Day</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Schedule Calendar View */}
              <Card>
                <CardHeader>
                  <CardTitle>Exam Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(scheduleData.schedule).map(([date, dayExams]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</h4>
                        <div className="grid gap-2">
                          {dayExams.map((exam) => (
                            <div key={exam.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{exam.title}</span>
                                <span className="text-sm text-gray-600 ml-2">({exam.subject})</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {exam.time} • {exam.duration}min • {exam.total_marks} marks
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Optimization Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scheduleData.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render performance trends tab
  const renderPerformanceTrends = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trends Analysis
          </CardTitle>
          <CardDescription>
            Track exam performance trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={performanceTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mean" stroke="#3b82f6" strokeWidth={2} name="Average Score" />
              <Line type="monotone" dataKey="pass_rate" stroke="#10b981" strokeWidth={2} name="Pass Rate" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Exam Management</h1>
          <p className="text-gray-600">Comprehensive exam analytics, conflict detection, and optimization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchExams()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conflict Detection
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Optimization
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts">
          {renderConflictDetection()}
        </TabsContent>

        <TabsContent value="analytics">
          {renderAnalytics()}
        </TabsContent>

        <TabsContent value="schedule">
          {renderScheduleOptimization()}
        </TabsContent>

        <TabsContent value="trends">
          {renderPerformanceTrends()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedExamManagement;