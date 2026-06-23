import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "../ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  Pie, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line, 
  Cell, 
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import { MultiSelect } from '../ui/multi-select';
import { 
  RefreshCw,
  Download, 
  Mail, 
  Printer, 
  User, 
  Users, 
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Award,
  Brain,
  Loader2,
  Calendar,
  Filter,
  Search,
  Target,
  Zap,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Star,
  Clock,
  MapPin,
  Globe,
  Phone,
  MessageSquare,
  ClipboardCheck,
  CalendarCheck,
  Smile,
  Lightbulb,
  ShieldCheck,
  Palette
} from 'lucide-react';
import { api } from '../../lib/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';

// Types for API responses
interface StudentAnalytics {
  student_id: number;
  period: {
    from: string;
    to: string;
  };
  attendance: {
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    attendance_rate: number;
  };
  performance: {
    average_grade: number;
    total_exams: number;
    subjects_performance: Array<{
      subject: string;
      average_score: number;
      grade: string;
      trend: string;
    }>;
  };
  trends: {
    weekly_attendance: Array<{
      week: string;
      total: number;
      present: number;
      rate: number;
    }>;
  };
}

interface StudentGradeReport {
  student: {
    id: number;
    name: string;
    class: string;
    admission_number: string;
    educational_level: string;
  };
  term: string;
  session: string;
  subjects: Array<{
    name: string;
    score: number;
    grade: string;
    remarks: string;
  }>;
  gpa: number;
  historical_gpas?: number[];
  position: string;
  teacher_remarks?: string;
  principal_remarks?: string;
  attendance?: {
    total_days: number;
    present_days: number;
    attendance_rate: number;
  };
  core_competencies?: Array<{
    name: string;
    level: number;
    description: string;
  }>;
}

interface Student {
  id: number;
  full_name: string;
  display_name: string;
  class_id: number;
  admission_number: string;
}

// API service functions
const studentScoresService = {
  // Get all students for selection
  getStudents: async (): Promise<Student[]> => {
    const response = await api.get('/students', { params: { per_page: 100 } });
    return response.data.students || [];
  },

  // Get all classes for filtering
  getClasses: async (): Promise<any[]> => {
    const response = await api.get('/classes', { params: { per_page: 100 } });
    return response.data.classes || [];
  },

  // Get student analytics
  getStudentAnalytics: async (studentId: number, dateFrom?: string, dateTo?: string): Promise<StudentAnalytics> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await api.get(`/enhanced-students/${studentId}/analytics?${params}`);
    return response.data.data;
  },

  // Get individual student grade report
  getStudentGradeReport: async (studentId: number, term?: string, academicYear?: string): Promise<StudentGradeReport> => {
    const params = new URLSearchParams();
    if (term) params.append('term', term);
    if (academicYear) params.append('academic_year', academicYear);
    
    const response = await api.get(`/reports/student/${studentId}/report-card?${params}`);
    const data = response.data.data;
    
    // Map backend response to StudentGradeReport interface
    return {
      student: {
        id: studentId,
        name: data.student_info.name,
        class: data.student_info.class,
        admission_number: data.student_info.admission_number,
        educational_level: data.student_info.educational_level,
      },
      term: data.student_info.term,
      session: data.student_info.academic_year,
      subjects: data.academic_performance.subjects.map((s: any) => ({
        name: s.name,
        score: s.score,
        grade: s.grade,
        remarks: s.remarks,
      })),
      gpa: data.academic_performance.overall_gpa,
      historical_gpas: data.academic_performance.historical_gpas,
      position: data.academic_performance.class_position,
      teacher_remarks: data.teacher_comments,
      principal_remarks: data.principal_comments,
      attendance: data.attendance,
      core_competencies: data.core_competencies,
    };
  },

  // Get analytics summary for class/all students
  getAnalyticsSummary: async (classId?: number, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId.toString());
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await api.get(`/enhanced-students/analytics/summary?${params}`);
    return response.data.data;
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Enhanced interfaces
interface ClassPerformanceData {
  class_id: number;
  class_name: string;
  total_students: number;
  average_score: number;
  grade_distribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  subject_performance: Array<{
    subject: string;
    average_score: number;
    pass_rate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  top_performers: Array<{
    student_id: number;
    student_name: string;
    average_score: number;
  }>;
  at_risk_students: Array<{
    student_id: number;
    student_name: string;
    average_score: number;
    subjects_failing: string[];
  }>;
}

interface PerformanceTrend {
  period: string;
  average_score: number;
  attendance_rate: number;
  exam_count: number;
}

interface AIInsight {
  id: number;
  type: 'concern' | 'strength' | 'recommendation' | 'prediction';
  category: 'academic' | 'attendance' | 'behavior' | 'trend';
  subject?: string;
  message: string;
  recommendation?: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

// Enhanced service functions
const enhancedStudentScoresService = {
  ...studentScoresService,
  
  // Get class performance data
  getClassPerformance: async (classId?: number, term?: string): Promise<ClassPerformanceData> => {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId.toString());
    if (term) params.append('term', term);
    
    const response = await api.get(`/academics/class-performance?${params}`);
    return response.data.data;
  },
  
  // Get performance trends
  getPerformanceTrends: async (studentId?: number, classId?: number, period: string = '6months'): Promise<PerformanceTrend[]> => {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId.toString());
    if (classId) params.append('class_id', classId.toString());
    params.append('period', period);
    
    const response = await api.get(`/academics/performance-trends?${params}`);
    return response.data.data;
  },
  
  // Get AI insights
  getAIInsights: async (studentId?: number, classId?: number): Promise<AIInsight[]> => {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId.toString());
    if (classId) params.append('class_id', classId.toString());
    
    const response = await api.get(`/academics/ai-insights?${params}`);
    return response.data.data;
  },
  
  // Get subject comparison data
  getSubjectComparison: async (studentId: number) => {
    const response = await api.get(`/academics/subject-comparison/${studentId}`);
    return response.data.data;
  },

  // Download PDF Report
  downloadReportPDF: async (studentId: number, term: string) => {
    const response = await api.get(`/reports/student/${studentId}/report-card`, {
      params: { term, format: 'pdf' },
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_card_${studentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Send Report via Email
  sendReportEmail: async (studentId: number, email: string, reportData: any) => {
    const response = await api.post(`/reports/student/${studentId}/send-report`, {
      email,
      report_data: reportData
    });
    return response.data;
  },

  // Get system settings
  getSettings: async (keys: string[]) => {
    const response = await api.get('/administration/settings', { params: { keys } });
    return response.data.settings;
  },

  // Update system settings
  updateSettings: async (settings: Record<string, any>) => {
    const response = await api.post('/administration/settings', settings);
    return response.data;
  }
};

const ENHANCED_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1'
};

const CHART_COLORS = [ENHANCED_COLORS.primary, ENHANCED_COLORS.success, ENHANCED_COLORS.warning, ENHANCED_COLORS.danger, ENHANCED_COLORS.info, ENHANCED_COLORS.purple];

const THEMES = {
  navy: {
    primary: '#0b1e35',
    secondary: '#27774a',
    accent: '#2fa05e',
    light: '#eaf6f1',
  },
  emerald: {
    primary: '#064e3b',
    secondary: '#059669',
    accent: '#10b981',
    light: '#ecfdf5',
  },
  royal: {
    primary: '#1e3a8a',
    secondary: '#2563eb',
    accent: '#3b82f6',
    light: '#eff6ff',
  },
  sunset: {
    primary: '#7c2d12',
    secondary: '#ea580c',
    accent: '#f97316',
    light: '#fff7ed',
  }
};

const ScoresDashboard = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('student');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [timeRange, setTimeRange] = useState('6months');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Fetch school settings
  const { data: settings = {} } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: () => enhancedStudentScoresService.getSettings([
      'school_name', 'school_tagline', 'school_address', 'school_website', 'school_phone', 'report_card_theme'
    ])
  });

  const currentTheme = settings.report_card_theme || 'navy';
  const themeColors = THEMES[currentTheme as keyof typeof THEMES] || THEMES.navy;

  // Fetch students for selection
  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: studentScoresService.getStudents
  });
  
  // Fetch classes for class names
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: studentScoresService.getClasses
  });
  
  // Set default student
  React.useEffect(() => {
    if (students.length > 0 && selectedStudentIds.length === 0) {
      setSelectedStudentIds([students[0].id]);
    }
  }, [students, selectedStudentIds]);

  const selectedStudentId = selectedStudentIds[0] || null;

  // Fetch student analytics
  const { 
    data: studentAnalytics, 
    isLoading: analyticsLoading, 
    error: analyticsError 
  } = useQuery<StudentAnalytics | null>({
    queryKey: ['studentAnalytics', selectedStudentId, dateRange.from, dateRange.to],
    queryFn: () => selectedStudentId ? 
      studentScoresService.getStudentAnalytics(selectedStudentId, dateRange.from, dateRange.to) : 
      Promise.resolve(null),
    enabled: !!selectedStudentId
  });
  React.useEffect(() => {
    if (analyticsError) {
      toast.error(t('scores_dashboard.error_load_analytics', 'Failed to load student analytics'));
      console.error('Analytics fetch error:', analyticsError);
    }
  }, [analyticsError, t]);

  // Fetch student grade report
  const { 
    data: gradeReport, 
    isLoading: gradeReportLoading,
    error: gradeReportError
  } = useQuery<StudentGradeReport | null>({
    queryKey: ['studentGradeReport', selectedStudentId, selectedTerm],
    queryFn: () => selectedStudentId ? 
      studentScoresService.getStudentGradeReport(selectedStudentId, selectedTerm) : 
      Promise.resolve(null),
    enabled: !!selectedStudentId,
    retry: false
  });
  
  // Handle grade report error
  React.useEffect(() => {
    if (gradeReportError) {
      toast.error(t('scores_dashboard.error_load_grade_report', 'Failed to load grade report'));
      console.error('Grade report fetch error:', gradeReportError);
    }
  }, [gradeReportError, t]);
  
  // Fetch analytics summary for class performance
  const { 
    data: summary, 
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ['summary', selectedClassId, dateRange.from, dateRange.to],
    queryFn: () => studentScoresService.getAnalyticsSummary(selectedClassId || undefined, dateRange.from, dateRange.to)
  });
  
  // Handle summary error
  React.useEffect(() => {
    if (summaryError) {
      toast.error(t('scores_dashboard.error_load_summary', 'Failed to load analytics summary'));
      console.error('Analytics summary fetch error:', summaryError);
    }
  }, [summaryError, t]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const isLoading = studentsLoading || analyticsLoading || gradeReportLoading || summaryLoading;

  // Generate AI insights based on real data
  const generateAIInsights = (analytics: StudentAnalytics | null | undefined, gradeData: StudentGradeReport | null | undefined) => {
    if (!analytics && !gradeData) return [];
    
    const insights: Array<{
      id: number;
      type: 'concern' | 'strength' | 'recommendation';
      subject: string;
      message: string;
      recommendation?: string;
    }> = [];
    
    // Attendance insights
    if (analytics?.attendance) {
      const attendanceRate = analytics.attendance.attendance_rate;
      if (attendanceRate < 75) {
        insights.push({
          id: 1,
          type: 'concern',
          subject: t('scores_dashboard.insight_attendance', 'Attendance'),
          message: t('scores_dashboard.insight_attendance_low', `Attendance rate is {{rate}}%, which is below the recommended 75%.`, { rate: attendanceRate }),
          recommendation: t('scores_dashboard.insight_attendance_recommendation', 'Schedule a meeting with parents to discuss attendance improvement strategies.')
        });
      } else if (attendanceRate > 95) {
        insights.push({
          id: 2,
          type: 'strength',
          subject: t('scores_dashboard.insight_attendance', 'Attendance'),
          message: t('scores_dashboard.insight_attendance_excellent', `Excellent attendance rate of {{rate}}%.`, { rate: attendanceRate })
        });
      }
    }
  
    // Performance insights
    if (gradeData?.subjects && gradeData.subjects.length > 0) {
      gradeData.subjects.forEach((subject, index) => {
        if (subject.score < 50) {
          insights.push({
            id: insights.length + 1,
            type: 'concern',
            subject: subject.name,
            message: t('scores_dashboard.insight_perf_low', `Low performance in {{subject}} with {{score}}% score.`, { subject: subject.name, score: subject.score }),
            recommendation: t('scores_dashboard.insight_perf_recommendation', 'Consider additional tutoring or remedial classes.')
          });
        } else if (subject.score > 85) {
          insights.push({
            id: insights.length + 1,
            type: 'strength',
            subject: subject.name,
            message: t('scores_dashboard.insight_perf_excellent', `Excellent performance in {{subject}} with {{score}}% score.`, { subject: subject.name, score: subject.score })
          });
        }
      });
    }
  
    return insights;
  };

  const aiInsights = generateAIInsights(studentAnalytics, gradeReport);

  const handleDownloadPDF = async () => {
    if (selectedStudentIds.length === 0) return;
    
    const loadingToast = toast.loading(t('scores_dashboard.downloading_reports', `Downloading {{count}} report card(s)...`, { count: selectedStudentIds.length }));
    try {
      for (const studentId of selectedStudentIds) {
        await enhancedStudentScoresService.downloadReportPDF(studentId, selectedTerm);
      }
      toast.success(t('scores_dashboard.success_download', 'Report card(s) downloaded successfully'), { id: loadingToast });
    } catch (error) {
      toast.error(t('scores_dashboard.error_download', 'Failed to download report card(s)'), { id: loadingToast });
      console.error(error);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleEmailReport = async () => {
    if (!selectedStudentId || !gradeReport) return;
    
    const recipientEmail = prompt(t('scores_dashboard.prompt_email', 'Enter recipient email address:'));
    if (!recipientEmail) return;

    setIsSendingEmail(true);
    try {
      await enhancedStudentScoresService.sendReportEmail(selectedStudentId, recipientEmail, gradeReport);
      toast.success(t('scores_dashboard.success_email', `Report card sent to {{email}}`, { email: recipientEmail }));
    } catch (error) {
      toast.error(t('scores_dashboard.error_email', 'Failed to send report card via email'));
      console.error(error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    try {
      await enhancedStudentScoresService.updateSettings({ report_card_theme: newTheme });
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      toast.success(t('scores_dashboard.success_theme', `Theme updated to {{theme}}`, { theme: newTheme }));
    } catch (error) {
      toast.error(t('scores_dashboard.error_theme', 'Failed to update theme'));
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    if (selectedStudentId) {
      queryClient.invalidateQueries({ queryKey: ['studentGradeReport', selectedStudentId, selectedTerm] });
      queryClient.invalidateQueries({ queryKey: ['studentAnalytics', selectedStudentId] });
    }
    toast.success(t('scores_dashboard.success_refresh', 'Dashboard data refreshed'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 font-sans">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('scores_dashboard.loading_dashboard', 'Loading scores dashboard...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Enhanced Curvy Header for the Dashboard */}
      <div className="bg-[#0b1e35] -mx-6 -mt-6 px-8 pt-8 pb-12 relative overflow-hidden rounded-b-[2rem] shadow-xl dashboard-header-print">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .report-card-print-area, .report-card-print-area * { visibility: visible; }
            
            .report-card-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background-color: white !important;
              transform: scale(0.98);
              transform-origin: top center;
            }
            
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            
            /* Ensure background colors and images print */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ 
            clipPath: 'ellipse(120% 100% at 50% 0%)',
            backgroundColor: themeColors.secondary
          }}
        ></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight merriweather drop-shadow-sm">
              {settings.school_name || t('scores_dashboard.default_title', 'Scores Dashboard')}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-[2px] w-10" style={{ backgroundColor: themeColors.accent }}></div>
              <p className="font-bold text-sm uppercase tracking-wider" style={{ color: themeColors.accent }}>
                {settings.school_tagline || t('scores_dashboard.default_tagline', 'Performance Analytics')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10 no-print">
            <Select value={currentTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-36 bg-white/10 border-white/5 text-white h-9">
                <Palette className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('scores_dashboard.theme_label', 'Theme')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="navy">{t('scores_dashboard.theme_navy', 'Classic Navy')}</SelectItem>
                <SelectItem value="emerald">{t('scores_dashboard.theme_emerald', 'Emerald Green')}</SelectItem>
                <SelectItem value="royal">{t('scores_dashboard.theme_royal', 'Royal Blue')}</SelectItem>
                <SelectItem value="sunset">{t('scores_dashboard.theme_sunset', 'Sunset Orange')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
              <Search className="h-4 w-4 text-white/60" />
              <input
                placeholder={t('scores_dashboard.search_placeholder', 'Search students...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40 w-40"
              />
            </div>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-white/10 border-white/5 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">{t('scores_dashboard.time_1month', '1 Month')}</SelectItem>
                <SelectItem value="3months">{t('scores_dashboard.time_3months', '3 Months')}</SelectItem>
                <SelectItem value="6months">{t('scores_dashboard.time_6months', '6 Months')}</SelectItem>
                <SelectItem value="1year">{t('scores_dashboard.time_1year', '1 Year')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'line' | 'pie' | 'radar')}>
              <SelectTrigger className="w-32 bg-white/10 border-white/5 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">{t('scores_dashboard.chart_bar', 'Bar Chart')}</SelectItem>
                <SelectItem value="line">{t('scores_dashboard.chart_line', 'Line Chart')}</SelectItem>
                <SelectItem value="pie">{t('scores_dashboard.chart_pie', 'Pie Chart')}</SelectItem>
                <SelectItem value="radar">{t('scores_dashboard.chart_radar', 'Radar Chart')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-white hover:bg-white/10 h-9 w-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats Overview - Shifted up slightly to overlap the curvy header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 relative z-20 px-2 summary-print-area">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('scores_dashboard.stat_total_students', 'Total Students')}</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_students || 0}</div>
            <p className="text-xs text-gray-400 mt-1">{t('scores_dashboard.stat_total_students_desc', 'Across all classes')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('scores_dashboard.stat_avg_attendance', 'Avg. Attendance')}</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.average_attendance_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-400 mt-1">{t('scores_dashboard.stat_avg_attendance_desc', 'Current term average')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('scores_dashboard.stat_avg_score', 'Avg. Score')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.class_performance?.reduce((acc: number, curr: any) => acc + curr.average_score, 0) / 
                (summary?.class_performance?.length || 1)).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('scores_dashboard.stat_avg_score_desc', 'Overall performance')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('scores_dashboard.stat_top_performer', 'Top Performer')}</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">92.4%</div>
            <p className="text-xs text-gray-400 mt-1">{t('scores_dashboard.stat_top_performer_desc', 'Basic 5 - ADM2001')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto no-print">
          <TabsTrigger value="student">{t('scores_dashboard.tab_student_reports', 'Student Reports')}</TabsTrigger>
          <TabsTrigger value="class">{t('scores_dashboard.tab_class_performance', 'Class Performance')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('scores_dashboard.tab_advanced_analytics', 'Advanced Analytics')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="student" className="space-y-4">
          {/* Student Report controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
              <div className="w-full sm:w-[300px]">
                <MultiSelect
                  placeholder={t('scores_dashboard.select_students_placeholder', 'Select Students')}
                  options={students.map(s => {
                    const studentClass = classes.find(c => c.id === s.class_id);
                    return {
                      label: `${s.full_name || s.display_name} ${studentClass ? `- ${studentClass.name}` : ''} (${s.admission_number})`,
                      value: s.id.toString()
                    };
                  })}
                  selected={selectedStudentIds.map(id => id.toString())}
                  onChange={(selected) => setSelectedStudentIds(selected.map(id => Number(id)))}
                />
              </div>
              
              <select
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm h-10"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <option value="First Term">{t('scores_dashboard.term_first', 'First Term')}</option>
                <option value="Second Term">{t('scores_dashboard.term_second', 'Second Term')}</option>
                <option value="Third Term">{t('scores_dashboard.term_third', 'Third Term')}</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={!gradeReport || isSendingEmail} 
                onClick={handleEmailReport}
              >
                {isSendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {t('common.email', 'Email')}
              </Button>
              <Button 
                variant="outline" 
                disabled={!gradeReport} 
                onClick={handlePrintReport}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t('common.print', 'Print')}
              </Button>
              <Button 
                variant="outline" 
                disabled={!gradeReport} 
                onClick={handleDownloadPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('scores_dashboard.download_pdf', 'Download PDF')}
              </Button>
            </div>
          </div>
          
          {/* Student Report Card */}
          {gradeReportLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-500">{t('scores_dashboard.generating_report', 'Generating report card...')}</p>
              </CardContent>
            </Card>
          ) : gradeReportError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">{t('scores_dashboard.failed_generate_report', 'Failed to Generate Report')}</h3>
                <p className="text-red-700 mb-4">
                  {(gradeReportError as any).response?.data?.message || t('scores_dashboard.generate_report_error_desc', 'An error occurred while generating the student report card.')}
                </p>
                <p className="text-sm text-red-600">
                  {t('scores_dashboard.generate_report_error_hint', 'Ensure the student has a valid progression record and grades for the selected term.')}
                </p>
              </CardContent>
            </Card>
          ) : gradeReport && selectedStudent ? (
            <div className="max-w-[880px] mx-auto bg-white rounded-[14px] shadow-2xl overflow-hidden print:shadow-none print:border-0 font-sans text-[#17202a] report-card-print-area">
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
                .report-container { font-family: 'Inter', sans-serif; }
                .merriweather { font-family: 'Merriweather', serif; }
              `}</style>
              
              <div className="report-container">
                {/* HEADER */}
                <div style={{ backgroundColor: themeColors.primary }} className="relative overflow-hidden">
                  <div 
                    className="px-8 pt-8 pb-10 flex items-center gap-6 relative z-10"
                    style={{ clipPath: 'ellipse(120% 100% at 50% 0%)', backgroundColor: themeColors.primary }}
                  >
                    <div className="flex-shrink-0 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10 shadow-xl">
                      <svg width="76" height="79" viewBox="0 0 76 79" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M38 2L5 14V37C5 55.5 19.5 68.5 38 72C56.5 68.5 71 55.5 71 37V14L38 2Z" fill={themeColors.secondary}/>
                        <path d="M38 2L5 14V37C5 55.5 19.5 68.5 38 72C56.5 68.5 71 55.5 71 37V14L38 2Z" fill="none" stroke="#dfa832" strokeWidth="2.2"/>
                        <polygon points="38,8 40,14 46,14 41.5,17.5 43,23 38,19.5 33,23 34.5,17.5 30,14 36,14" fill="#dfa832"/>
                        <path d="M12 42 Q9 37 12 33 Q15 37 12 42Z" fill={themeColors.accent}/>
                        <path d="M11 49 Q8 44 11 40 Q14 44 11 49Z" fill={themeColors.accent}/>
                        <path d="M13 56 Q10 51 13 47 Q16 51 13 56Z" fill={themeColors.accent}/>
                        <path d="M64 42 Q67 37 64 33 Q61 37 64 42Z" fill={themeColors.accent}/>
                        <path d="M65 49 Q68 44 65 40 Q62 44 65 49Z" fill={themeColors.accent}/>
                        <path d="M63 56 Q66 51 63 47 Q60 51 63 56Z" fill={themeColors.accent}/>
                        <rect x="23" y="30" width="30" height="20" rx="2" fill="white" opacity=".12"/>
                        <path d="M38 30 L38 50" stroke="white" strokeWidth="1.7"/>
                        <path d="M23 33 Q30.5 29.5 38 33" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                        <path d="M38 33 Q45.5 29.5 53 33" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                        <rect x="23" y="30" width="30" height="20" rx="2" fill="none" stroke="white" strokeWidth="1.6"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="merriweather text-[34px] font-black text-white leading-tight uppercase tracking-tight drop-shadow-md">
                        {settings.school_name || t('scores_dashboard.default_school_name', 'ADMIPAEDIA ACADEMY')}
                      </h1>
                      <div className="flex items-center gap-3">
                        <div className="h-[2px] w-12" style={{ backgroundColor: themeColors.accent }}></div>
                        <p className="font-bold text-[13px] tracking-[0.05em] uppercase" style={{ color: themeColors.accent }}>
                          {settings.school_tagline || t('scores_dashboard.default_school_tagline', 'Nurturing Minds. Building Futures.')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Curvy Accent Layer */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{ 
                      clipPath: 'ellipse(120% 100% at 50% -10%)',
                      backgroundColor: themeColors.secondary
                    }}
                  ></div>

                  <div style={{ backgroundColor: themeColors.secondary }} className="px-8 py-1.5 flex gap-8 items-center relative z-10 border-t border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 text-white/95 text-[11px] font-semibold tracking-wide">
                      <div className="bg-white/15 p-1 rounded-md"><MapPin className="h-3 w-3" /></div>
                      <span>{settings.school_address || 'Accra, Ghana'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/95 text-[11px] font-semibold tracking-wide">
                      <div className="bg-white/15 p-1 rounded-md"><Globe className="h-3 w-3" /></div>
                      <span>{settings.school_website || 'www.admipaedia.edu'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/95 text-[11px] font-semibold tracking-wide">
                      <div className="bg-white/15 p-1 rounded-md"><Phone className="h-3 w-3" /></div>
                      <span>{settings.school_phone || '+233 24 000 0000'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-3 space-y-3">
                  {/* Student Info Card Implementation */}
                  <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm bg-white">
                    <div style={{ backgroundColor: themeColors.primary }} className="py-1.5 text-center text-white text-[11px] font-black tracking-[0.15em] uppercase">
                      {t('scores_dashboard.report_title', 'Student Progress Report')}
                    </div>
                    <div className="grid grid-cols-[1.2fr_100px_1fr] p-4 gap-4 items-center">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.student_name_label', 'Student Name:')}</span>
                          <span className="text-[14px] font-black text-[#17202a] tracking-tight truncate">{gradeReport.student.name}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.class_label', 'Class:')}</span>
                          <span className="text-[14px] font-black text-[#17202a] tracking-tight">{gradeReport.student.class}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.academic_year_label', 'Academic Year:')}</span>
                          <span className="text-[14px] font-bold text-[#17202a] tracking-tight">{gradeReport.session}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.term_label', 'Term:')}</span>
                          <span className="text-[14px] font-bold text-[#17202a] tracking-tight">{gradeReport.term}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-[85px] h-[95px] border-[1.5px] border-[#d5e8df] rounded-xl bg-[#f8faf9] flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
                          <div className="bg-white p-2 rounded-full shadow-sm border border-[#d5e8df] mb-1">
                            <User className="h-6 w-6 text-[#b8dece]" />
                          </div>
                          <span className="text-[7px] font-black text-[#52626f] uppercase tracking-widest text-center px-1">{t('scores_dashboard.photo_placeholder', 'Photo')}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.level_label', 'Level:')}</span>
                            <span className="text-[13px] font-bold text-[#17202a]">{gradeReport.student.educational_level}</span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-right">
                            <span className="text-[9px] font-black text-[#52626f] uppercase tracking-widest">{t('scores_dashboard.adm_no_label', 'Adm No:')}</span>
                            <span className="text-[13px] font-bold text-[#17202a]">{gradeReport.student.admission_number}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div style={{ backgroundColor: themeColors.primary }} className="text-white text-center py-1.5 px-3 rounded-full text-[9px] font-black tracking-[0.12em] uppercase shadow-sm border border-white/5">
                            {t('scores_dashboard.overall_performance_label', 'Overall Performance')}
                          </div>
                          <div style={{ borderColor: themeColors.secondary }} className="border-[2.5px] rounded-xl bg-white text-center py-2.5 shadow-md ring-2 ring-black/5 transition-all hover:scale-[1.01]">
                            <div style={{ color: themeColors.secondary }} className="text-[22px] font-black tracking-tighter leading-none">
                              {t('scores_dashboard.gpa_value', 'GPA: {{gpa}} / 4.00', { gpa: gradeReport.gpa.toFixed(2) })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grades Table */}
                  <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm">
                    <Table className="w-full border-collapse text-[14px]">
                      <TableHeader>
                        <TableRow style={{ backgroundColor: themeColors.primary }} className="hover:opacity-95 border-none">
                          <TableHead className="text-white font-bold h-10 px-4 uppercase tracking-wider text-[11.5px]">
                            <div className="flex items-center gap-2">
                              <svg width="15" height="14" viewBox="0 0 15 14" fill="none" style={{ color: themeColors.accent }}><rect x=".5" y=".5" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1=".5" y1="4.5" x2="14.5" y2="4.5" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1=".5" x2="4" y2="13.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                              {t('scores_dashboard.subject_header', 'Subject')}
                            </div>
                          </TableHead>
                          <TableHead className="text-white font-bold h-10 px-4 text-center uppercase tracking-wider text-[11.5px]">
                            <div className="flex items-center justify-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: themeColors.accent }}><rect x=".5" y=".5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1="3" y1="4.5" x2="11" y2="4.5" stroke="currentColor" strokeWidth="1.1"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.1"/><line x1="3" y1="9.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.1"/></svg>
                              {t('scores_dashboard.scores_header', 'Scores')}
                            </div>
                          </TableHead>
                          <TableHead className="text-white font-bold h-10 px-4 text-center uppercase tracking-wider text-[11.5px]">
                            <div className="flex items-center justify-center gap-2">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="5.5" stroke="#dfa832" strokeWidth="1.4"/><polygon points="8,3.5 9,6.2 12,6.2 9.8,8 10.6,10.8 8,9 5.4,10.8 6.2,8 4,6.2 7,6.2" fill="#dfa832"/><path d="M5.5 12.5 L8 11 L10.5 12.5" stroke="#dfa832" strokeWidth="1.3" fill="none" strokeLinecap="round"/><line x1="8" y1="12.5" x2="8" y2="15" stroke="#dfa832" strokeWidth="1.3"/></svg>
                              {t('scores_dashboard.grade_header', 'Grade')}
                            </div>
                          </TableHead>
                          <TableHead className="text-white font-bold h-10 px-4 uppercase tracking-wider text-[11.5px]">
                            <div className="flex items-center gap-2">
                              <svg width="16" height="13" viewBox="0 0 16 13" fill="none"><rect x=".5" y=".5" width="15" height="10" rx="1.5" stroke="white" strokeWidth="1.3"/><path d="M4.5 12.5L8 10.5L11.5 12.5" fill="white"/></svg>
                              {t('scores_dashboard.remarks_header', 'Remarks')}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeReport.subjects.map((subject, index) => (
                          <TableRow key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f3faf7]'} border-b border-[#e2ede8] last:border-none`}>
                            <TableCell className="font-bold text-[#17202a] py-2 px-3.5 text-[13.5px]">{subject.name}</TableCell>
                            <TableCell className="text-center font-semibold text-[#52626f] py-2 px-3.5">{subject.score}</TableCell>
                            <TableCell className={`text-center font-extrabold text-base py-2 px-3.5`} style={{ 
                              color: subject.grade.startsWith('A') ? themeColors.secondary : 
                                     subject.grade.startsWith('B') ? '#1a5eb8' : '#c97a0a'
                            }}>
                              {subject.grade}
                            </TableCell>
                            <TableCell className="text-[12.5px] text-[#52626f] py-2 px-3.5 leading-tight">
                              {subject.remarks}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* General Assessment & Attendance */}
                  <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm">
                    <div style={{ backgroundColor: themeColors.light, color: themeColors.primary, borderBottomColor: '#b8dece' }} className="border-b-[1.5px] px-4 py-2.5 flex items-center gap-3 font-bold text-[12.5px] uppercase tracking-widest">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: themeColors.secondary }}><path d="M9 1L1 4.5V9C1 14.2 4.4 17 9 18C13.6 17 17 14.2 17 9V4.5L9 1Z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9.5L8 11.5L12 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {t('scores_dashboard.general_assessment_label', 'General Assessment')}
                    </div>
                    <div className="flex items-center p-4 gap-6 bg-white">
                      <div style={{ color: themeColors.primary }} className="flex items-center gap-3 font-bold text-[12.5px] uppercase tracking-wider w-[160px] flex-shrink-0">
                        <div style={{ backgroundColor: themeColors.light, borderColor: '#b8dece' }} className="p-1.5 rounded-lg border">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: themeColors.secondary }}><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4.5 5.5L11.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4.5 8.5L11.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4.5 11.5L8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                        {t('scores_dashboard.attendance_label', 'Attendance')}
                      </div>
                      <div className="w-[1.5px] bg-[#b8dece]/50 self-stretch mx-1"></div>
                      <div className="flex-1 text-center">
                        <div className="text-[10px] font-bold text-[#52626f] uppercase tracking-widest mb-1.5">{t('scores_dashboard.total_days_label', 'Total Days')}</div>
                        <div style={{ color: themeColors.primary }} className="merriweather text-[22px] font-black leading-none tracking-tight">
                          {gradeReport.attendance?.total_days || 0}
                        </div>
                      </div>
                      <div className="w-[1.5px] bg-[#b8dece]/50 self-stretch mx-1"></div>
                      <div className="flex-1 text-center">
                        <div className="text-[10px] font-bold text-[#52626f] uppercase tracking-widest mb-1.5">{t('scores_dashboard.present_days_label', 'Present')}</div>
                        <div style={{ color: themeColors.secondary }} className="merriweather text-[22px] font-black leading-none tracking-tight">
                          {(gradeReport.attendance?.present_days || 0) + (((gradeReport.attendance as any)?.late_days as number | undefined) || 0)}
                        </div>
                      </div>
                      <div className="w-[1.5px] bg-[#b8dece]/50 self-stretch mx-1"></div>
                      <div className="flex-1 text-center">
                        <div className="text-[10px] font-bold text-[#52626f] uppercase tracking-widest mb-1.5">{t('scores_dashboard.attendance_rate_label', 'Rate')}</div>
                        <div style={{ color: themeColors.secondary }} className="merriweather text-[22px] font-black leading-none tracking-tight">{gradeReport.attendance?.attendance_rate || 96.1}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Psychological Section */}
                  <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm">
                    <div style={{ backgroundColor: themeColors.light, color: themeColors.primary, borderBottomColor: '#b8dece' }} className="border-b-[1.5px] px-4 py-2.5 flex items-center gap-3 font-bold text-[12.5px] uppercase tracking-widest">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: themeColors.secondary }}><path d="M13 14V13C13 11.8954 12.1046 11 11 11H7C5.89543 11 5 11.8954 5 13V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M16 14V13.5C16 12.1193 14.8807 11 13.5 11H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M2 14V13.5C2 12.1193 3.11929 11 4.5 11H5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      {t('scores_dashboard.psychological_label', 'Psychological and Social Perspective')}
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-4 bg-white">
                      {gradeReport.core_competencies?.slice(0, 3).map((comp, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border-[1.5px] shadow-sm transition-all hover:shadow-md`} style={{ 
                          backgroundColor: comp.name.includes('Attitude') ? themeColors.light : 
                                           comp.name.includes('Conduct') ? '#f0f6fd' : '#fff9ec',
                          borderColor: comp.name.includes('Attitude') ? themeColors.accent : 
                                       comp.name.includes('Conduct') ? '#9abfe8' : '#f5cc7c'
                        }}>
                          <div className={`flex items-center gap-2 font-bold text-[12px] uppercase tracking-widest mb-3`} style={{ 
                            color: comp.name.includes('Attitude') ? themeColors.secondary : 
                                   comp.name.includes('Conduct') ? '#1a5eb8' : '#c97a0a'
                          }}>
                            {comp.name.includes('Attitude') ? <Smile className="h-4.5 w-4.5" /> :
                             comp.name.includes('Conduct') ? <ShieldCheck className="h-4.5 w-4.5" /> :
                             <Lightbulb className="h-4.5 w-4.5" />}
                            {comp.name}
                          </div>
                          <p className="text-[13px] text-[#52626f] leading-relaxed line-clamp-3 font-medium">{comp.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 px-4 pb-4 bg-white">
                      <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm">
                        <div style={{ backgroundColor: themeColors.primary }} className="text-white text-[11px] font-bold tracking-widest uppercase px-4 py-2 flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5L7 8.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 7L7 12L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {t('scores_dashboard.teacher_remarks_title', "Teacher Remarks")}
                        </div>
                        <div className="p-4 text-[13.5px] text-[#52626f] leading-relaxed italic min-h-[70px] bg-white">
                          "{gradeReport.teacher_remarks || t('scores_dashboard.default_teacher_remarks', "A hardworking and respectful student. Continues to show improvement and a desire to learn.")}"
                        </div>
                      </div>
                      <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden border-dashed shadow-sm">
                        <div style={{ backgroundColor: themeColors.primary }} className="text-white text-[11px] font-bold tracking-widest uppercase px-4 py-2">{t('scores_dashboard.parent_remarks_title', 'Parent Remarks')}</div>
                        <div className="p-4 flex flex-col justify-around min-h-[70px] bg-[#fbfdfc]">
                          <div className="border-b border-[#e2ede8] w-full h-5"></div>
                          <div className="border-b border-[#e2ede8] w-full h-5"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Learning Analytics */}
                  <div className="border-[1.5px] border-[#b8dece] rounded-xl overflow-hidden shadow-sm">
                    <div style={{ backgroundColor: themeColors.light, color: themeColors.primary, borderBottomColor: '#b8dece' }} className="border-b-[1.5px] px-4 py-2.5 flex items-center gap-3 font-bold text-[12.5px] uppercase tracking-widest">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: themeColors.secondary }}><path d="M1.5 16.5H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.5 13.5L6.5 7.5L9.5 10.5L14.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="3.5" cy="13.5" r="1.5" fill="currentColor"/><circle cx="6.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="9.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="14.5" cy="2.5" r="1.5" fill="currentColor"/></svg>
                      {t('scores_dashboard.learning_analytics_label', 'Learning Analytics')}
                    </div>
                    <div className="p-5 grid grid-cols-[220px_1fr_210px] gap-6 items-center bg-white">
                      <div className="h-52 bg-[#fbfdfc] rounded-xl border border-[#e2ede8] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={gradeReport.subjects.slice(0, 5).map(s => ({ subject: s.name.substring(0, 8), score: s.score }))}>
                            <PolarGrid stroke="#c2dece" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: themeColors.primary }} />
                            <Radar name="Score" dataKey="score" stroke={themeColors.secondary} strokeWidth={2.5} fill={themeColors.secondary} fillOpacity={0.15} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-4">
                        <h4 style={{ color: themeColors.primary }} className="text-[12px] font-black uppercase tracking-[1.5px] mb-4 flex items-center gap-2">
                          <div style={{ backgroundColor: themeColors.secondary }} className="h-1 w-6 rounded-full"></div>
                          {t('scores_dashboard.perf_summary_label', 'Performance Summary')}
                        </h4>
                        <div className="space-y-3.5">
                          <div style={{ backgroundColor: themeColors.light, borderColor: `${themeColors.accent}33` }} className="flex items-start gap-3 text-[13.5px] p-2.5 rounded-lg border">
                            <Star className="h-4.5 w-4.5 text-[#dfa832] mt-0.5" fill="#dfa832" />
                            <div><span style={{ color: themeColors.primary }} className="font-bold uppercase text-[11px] tracking-wider block mb-0.5">{t('scores_dashboard.strength_label', 'Strength')}</span><span className="text-[#52626f] font-medium">{gradeReport.subjects.filter(s => s.score > 85).map(s => s.name).slice(0, 2).join(', ') || 'N/A'}</span></div>
                          </div>
                          <div className="flex items-start gap-3 text-[13.5px] bg-[#f0f6fd] p-2.5 rounded-lg border border-[#9abfe8]/30">
                            <TrendingUp className="h-4.5 w-4.5 text-[#1a5eb8] mt-0.5" />
                            <div><span style={{ color: themeColors.primary }} className="font-bold uppercase text-[11px] tracking-wider block mb-0.5">{t('scores_dashboard.improvement_label', 'Improvement')}</span><span className="text-[#52626f] font-medium">{t('scores_dashboard.improvement_desc', 'Continue practicing complex problem-solving.')}</span></div>
                          </div>
                          <div className="flex items-start gap-3 text-[13.5px] bg-[#fff9ec] p-2.5 rounded-lg border border-[#f5cc7c]/30">
                            <BookOpen className="h-4.5 w-4.5 text-[#c97a0a] mt-0.5" />
                            <div><span style={{ color: themeColors.primary }} className="font-bold uppercase text-[11px] tracking-wider block mb-0.5">{t('scores_dashboard.learning_style_label', 'Learning Style')}</span><span className="text-[#52626f] font-medium">{t('scores_dashboard.learning_style_desc', 'Visual & Hands-on Learner')}</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-44 bg-[#fbfdfc] rounded-xl border border-[#e2ede8] p-4 flex flex-col">
                        <div className="text-[10px] font-bold text-[#52626f] uppercase tracking-widest mb-3 text-center">{t('scores_dashboard.gpa_progression_label', 'GPA Progression')}</div>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeReport.historical_gpas?.map((gpa, i) => ({ term: `Term ${i+1}`, gpa })) || [
                              { term: 'Term 1', gpa: 3.65 }, { term: 'Term 2', gpa: 3.78 }, { term: 'Term 3', gpa: 3.85 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0ece8" />
                              <XAxis dataKey="term" tick={{ fontSize: 10, fontWeight: 700, fill: '#52626f' }} axisLine={false} tickLine={false} />
                              <YAxis domain={[0, 4]} hide />
                              <Bar dataKey="gpa" radius={[6, 6, 0, 0]} barSize={32}>
                                <Cell fill="#90b8d8" /> <Cell fill={themeColors.secondary} /> <Cell fill={themeColors.primary} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div style={{ borderTopColor: '#b8dece' }} className="grid grid-cols-3 gap-12 pt-10 pb-6 px-8 border-t bg-white">
                    <div className="text-center group">
                      <div style={{ borderTopColor: themeColors.primary }} className="border-t-2 w-full mx-auto mb-3 transition-all group-hover:w-[90%]"></div>
                      <p style={{ color: themeColors.primary }} className="text-[12.5px] font-bold uppercase tracking-widest">{t('scores_dashboard.signature_teacher', "Teacher's Signature")}</p>
                    </div>
                    <div className="text-center group">
                      <div style={{ borderTopColor: themeColors.primary }} className="border-t-2 w-full mx-auto mb-3 transition-all group-hover:w-[90%]"></div>
                      <p style={{ color: themeColors.primary }} className="text-[12.5px] font-bold uppercase tracking-widest">{t('scores_dashboard.signature_parent', 'Parent / Guardian')}</p>
                    </div>
                    <div className="text-center group">
                      <div style={{ borderTopColor: themeColors.primary }} className="border-t-2 w-full mx-auto mb-3 transition-all group-hover:w-[90%]"></div>
                      <p style={{ color: themeColors.primary }} className="text-[12.5px] font-bold uppercase tracking-widest">{t('scores_dashboard.signature_principal', "Principal's Signature")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">{t('scores_dashboard.select_student_hint', 'Select a student to view their report card')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="class" className="space-y-4">
          {/* Class Performance Tab */}
          <Card>
            <CardHeader>
              <CardTitle>{t('scores_dashboard.class_perf_title', 'Class Performance Overview')}</CardTitle>
              <CardDescription>{t('scores_dashboard.class_perf_desc', 'Academic performance summary for the selected class')}</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">{t('scores_dashboard.loading_class_perf', 'Loading class performance...')}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{t('scores_dashboard.stat_total_students', 'Total Students')}</p>
                            <p className="text-2xl font-bold">{summary?.total_students || 0}</p>
                          </div>
                          <Users className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{t('scores_dashboard.stat_avg_attendance', 'Average Attendance')}</p>
                            <p className="text-2xl font-bold">{summary?.average_attendance_rate || 0}%</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{t('scores_dashboard.stat_perf_trend', 'Performance Trend')}</p>
                            <p className="text-2xl font-bold">
                              {summary?.trends && summary.trends.length > 0 ? 
                                `${summary.trends[summary.trends.length - 1]?.average || 0}%` : 
                                '0%'
                              }
                            </p>
                          </div>
                          <BarChart className="h-8 w-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Class performance charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {summary?.class_performance && summary.class_performance.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">{t('scores_dashboard.subject_perf_avg_title', 'Subject Performance Averages')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={summary.class_performance}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="subject" />
                              <YAxis domain={[0, 100]} />
                              <Tooltip />
                              <Bar dataKey="average" fill={themeColors.secondary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {summary?.trends && summary.trends.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">{t('scores_dashboard.acad_progress_trend_title', 'Academic Progress Trend')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={summary.trends}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} />
                              <Tooltip />
                              <Line type="monotone" dataKey="average" stroke={themeColors.primary} strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {!summary?.class_performance?.length && !summary?.trends?.length && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-semibold text-gray-600">{t('scores_dashboard.no_perf_data', 'No performance data available yet')}</p>
                      <p className="text-sm text-gray-500">{t('scores_dashboard.no_perf_data_desc', 'Subject averages and trends will appear once grades are recorded.')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {/* Advanced Analytics Tab */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trends */}
            {studentAnalytics?.trends.weekly_attendance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t('scores_dashboard.attendance_trends_title', 'Attendance Trends')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={studentAnalytics.trends.weekly_attendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#8884d8" name={t('scores_dashboard.attendance_rate_legend', 'Attendance Rate (%)')} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {t('scores_dashboard.ai_insights_title', 'AI-Powered Insights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.length > 0 ? (
                    aiInsights.map((insight) => (
                      <div key={insight.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          {insight.type === 'concern' && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                          {insight.type === 'strength' && <Award className="h-5 w-5 text-blue-500 mt-0.5" />}
                          {insight.type === 'recommendation' && <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{insight.subject}</Badge>
                              <Badge 
                                variant={insight.type === 'strength' ? 'default' : 
                                        insight.type === 'concern' ? 'destructive' : 'secondary'}
                              >
                                {insight.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                            {insight.recommendation && (
                              <p className="text-xs text-gray-500">
                                <strong>{t('scores_dashboard.recommendation_badge', 'Recommendation:')}</strong> {insight.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('scores_dashboard.no_insights', 'No insights available')}</p>
                      <p className="text-sm">{t('scores_dashboard.no_insights_desc', 'Select a student to generate AI insights')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScoresDashboard;
