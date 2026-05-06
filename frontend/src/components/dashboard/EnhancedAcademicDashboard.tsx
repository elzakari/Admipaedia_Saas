import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { format, subDays, subMonths } from 'date-fns';

// Types
interface AnalyticsData {
  role: string;
  performance_overview?: {
    total_students: number;
    average_score: number;
    pass_rate: number;
    ges_distribution: Record<string, number>;
    trends: Array<{
      month: string;
      average_score: number;
      pass_rate: number;
    }>;
  };
  attendance_analytics?: {
    overall_rate: number;
    daily_trends: Array<{
      date: string;
      rate: number;
    }>;
    class_comparison: Array<{
      class_name: string;
      rate: number;
    }>;
  };
  grade_distribution?: {
    ges_grades: Record<string, number>;
    subject_performance: Record<string, any>;
  };
  teacher_performance?: Array<{
    teacher_name: string;
    average_score: number;
    pass_rate: number;
    attendance_rate: number;
    rating: number;
  }>;
  risk_assessment?: {
    at_risk_students: Array<{
      student_name: string;
      risk_factors: string[];
      risk_level: string;
    }>;
    common_factors: Array<{
      factor: string;
      count: number;
    }>;
  };
  recommendations?: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
  }>;
}

interface FilterOptions {
  dateRange: string;
  classId?: number;
  subjectId?: number;
}

const EnhancedAcademicDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '1year',
  });

  // Color schemes for charts
  const COLORS = {
    primary: '#3b82f6',
    secondary: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
  };

  const GES_COLORS = {
    A: '#10b981', // Green
    B: '#3b82f6', // Blue
    C: '#f59e0b', // Yellow
    D: '#f97316', // Orange
    E: '#ef4444', // Red
    F: '#991b1b', // Dark Red
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const dateRanges = {
        '1month': { from: subMonths(new Date(), 1), to: new Date() },
        '3months': { from: subMonths(new Date(), 3), to: new Date() },
        '6months': { from: subMonths(new Date(), 6), to: new Date() },
        '1year': { from: subMonths(new Date(), 12), to: new Date() },
      };

      const range = dateRanges[filters.dateRange as keyof typeof dateRanges];
      const params = new URLSearchParams({
        date_from: format(range.from, 'yyyy-MM-dd'),
        date_to: format(range.to, 'yyyy-MM-dd'),
      });

      if (filters.classId) params.append('class_id', filters.classId.toString());
      if (filters.subjectId) params.append('subject_id', filters.subjectId.toString());

      const response = await fetch(`/api/v1/enhanced-dashboard/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`/api/v1/enhanced-dashboard/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const renderOverviewTab = () => {
    if (!analyticsData?.performance_overview) return null;

    const { performance_overview, attendance_analytics } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance_overview.total_students}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance_overview.average_score.toFixed(1)}%</div>
              <Badge variant={performance_overview.average_score >= 70 ? "default" : "destructive"}>
                {performance_overview.average_score >= 70 ? "Good" : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance_overview.pass_rate.toFixed(1)}%</div>
              <Progress value={performance_overview.pass_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {attendance_analytics?.overall_rate.toFixed(1) || 0}%
              </div>
              <Progress value={attendance_analytics?.overall_rate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Academic performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performance_overview.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="average_score"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Average Score"
                />
                <Line
                  type="monotone"
                  dataKey="pass_rate"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  name="Pass Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* GES Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>GES Grade Distribution</CardTitle>
            <CardDescription>Distribution of students across GES grades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(performance_overview.ges_distribution).map(([grade, count]) => ({
                      name: grade,
                      value: count,
                      fill: GES_COLORS[grade as keyof typeof GES_COLORS],
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(performance_overview.ges_distribution).map(([grade], index) => (
                      <Cell key={`cell-${index}`} fill={GES_COLORS[grade as keyof typeof GES_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {Object.entries(performance_overview.ges_distribution).map(([grade, count]) => (
                  <div key={grade} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: GES_COLORS[grade as keyof typeof GES_COLORS] }}
                      />
                      <span className="font-medium">Grade {grade}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{count} students</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAttendanceTab = () => {
    if (!analyticsData?.attendance_analytics) return null;

    const { attendance_analytics } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Attendance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Trends</CardTitle>
            <CardDescription>Attendance rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendance_analytics.daily_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke={COLORS.secondary}
                  fill={COLORS.secondary}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Class Attendance Comparison</CardTitle>
            <CardDescription>Attendance rates by class</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendance_analytics.class_comparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRiskAssessmentTab = () => {
    if (!analyticsData?.risk_assessment) return null;

    const { risk_assessment } = analyticsData;

    return (
      <div className="space-y-6">
        {/* At-Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>At-Risk Students</span>
            </CardTitle>
            <CardDescription>Students requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {risk_assessment.at_risk_students.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{student.student_name}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {student.risk_factors.map((factor, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge
                    variant={student.risk_level === 'high' ? 'destructive' : 'secondary'}
                  >
                    {student.risk_level} risk
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Common Risk Factors */}
        <Card>
          <CardHeader>
            <CardTitle>Common Risk Factors</CardTitle>
            <CardDescription>Most frequent issues affecting student performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={risk_assessment.common_factors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="factor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.warning} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecommendationsTab = () => {
    if (!analyticsData?.recommendations) return null;

    const { recommendations } = analyticsData;

    const priorityColors = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Recommendations</CardTitle>
          <CardDescription>Actionable insights to improve academic outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{rec.title}</h4>
                  <Badge variant={priorityColors[rec.priority as keyof typeof priorityColors]}>
                    {rec.priority} priority
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {rec.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Academic Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into academic performance and trends
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => exportData('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>

          <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          {renderAttendanceTab()}
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          {renderRiskAssessmentTab()}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          {renderRecommendationsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAcademicDashboard;