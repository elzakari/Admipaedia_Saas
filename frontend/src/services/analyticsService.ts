import api from '../lib/api';
import { Pagination } from '../types';

// Analytics Interfaces
export interface DashboardStatistic {
  id: number;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  description?: string;
}

export interface AttendanceAnalytics {
  overall_rate: number;
  daily_trends: Array<{
    date: string;
    rate: number;
  }>;
  class_comparison: Array<{
    class_name: string;
    attendance_rate: number;
  }>;
  monthly_summary: Array<{
    month: string;
    rate: number;
  }>;
}

export interface PerformanceAnalytics {
  overall_performance: number;
  subject_breakdown: Array<{
    subject: string;
    average_grade: number;
    student_count: number;
  }>;
  grade_distribution: Array<{
    grade_range: string;
    count: number;
    percentage: number;
  }>;
  trend_data: Array<{
    month: string;
    performance: number;
    target: number;
  }>;
}

export interface AssignmentAnalytics {
  total_assignments: number;
  completion_rate: number;
  average_score: number;
  overdue_count: number;
  subject_breakdown: Array<{
    subject: string;
    completion_rate: number;
    average_score: number;
  }>;
}

export interface AtRiskStudent {
  student_id: number;
  student_name: string;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  attendance_rate: number;
  performance_score: number;
  recommendations: string[];
}

export interface EngagementAnalytics {
  participation_score: number;
  assignment_completion_rate: number;
  attendance_correlation: number;
  behavioral_insights: Array<{
    metric: string;
    score: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
}

export interface TeacherAnalytics {
  teacher_id: number;
  class_performance: Array<{
    class_name: string;
    average_grade: number;
    attendance_rate: number;
  }>;
  student_engagement: {
    participation_rate: number;
    assignment_completion: number;
    feedback_score: number;
  };
  workload_analysis: {
    total_classes: number;
    total_students: number;
    assignments_graded: number;
    average_grading_time: number;
  };
}

export interface TeacherStats {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

export interface StudentAnalytics {
  student_id: number;
  performance_insights: {
    overall_grade: number;
    subject_grades: Record<string, number>;
    grade_trend: Array<{
      date: string;
      grade: number;
    }>;
  };
  attendance_data: {
    attendance_rate: number;
    attendance_heatmap: Record<string, number>;
    monthly_trends: Array<{
      month: string;
      rate: number;
    }>;
  };
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: string[];
    recommendations: string[];
  };
  behavioral_insights: {
    participation_score: number;
    assignment_completion_rate: number;
    punctuality_score: number;
  };
}

export interface StudentAnalyticsSummary {
  total_students: number;
  average_attendance_rate: number;
  class_performance: Array<{
    class_name: string;
    average_grade: number;
    student_count: number;
  }>;
  attendance_trends: Array<{
    date: string;
    rate: number;
  }>;
}

export interface AdvancedAttendanceAnalytics {
  success: boolean;
  message: string;
  data: {
    overall_statistics: {
      total_sessions: number;
      average_attendance_rate: number;
      trend_direction: 'up' | 'down' | 'stable';
    };
    daily_trends: Array<{
      date: string;
      attendance_rate: number;
      total_students: number;
      present_count: number;
    }>;
    class_comparison: Array<{
      class_id: number;
      class_name: string;
      attendance_rate: number;
    }>;
    student_insights: Array<{
      student_id: number;
      student_name: string;
      attendance_rate: number;
      risk_level: string;
    }>;
  };
}

export interface AttendanceStats {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
  monthly_breakdown: Array<{
    month: string;
    attendance_rate: number;
  }>;
}

export interface GradeReport {
  student_id: number;
  student_name: string;
  academic_year: string;
  term: string;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    grades: Array<{
      assessment_type: string;
      score: number;
      max_score: number;
      percentage: number;
      date: string;
    }>;
    average_score: number;
    grade_letter: string;
  }>;
  overall_average: number;
  overall_grade: string;
  class_rank: number;
  total_students: number;
}

export interface AttendanceReport {
  student_id: number;
  student_name: string;
  class_name: string;
  date_range: {
    from: string;
    to: string;
  };
  summary: {
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    attendance_rate: number;
  };
  daily_records: Array<{
    date: string;
    status: 'present' | 'absent' | 'late';
    subject: string;
    remarks?: string;
  }>;
}

// Analytics Service Class
class AnalyticsService {
  // Dashboard Statistics
  async getDashboardStatistics(role?: string): Promise<DashboardStatistic[]> {
    try {
      const params = role ? { role } : {};
      const response = await api.get('/dashboard/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      throw error;
    }
  }

  // Teacher Analytics
  async getTeacherAnalytics(teacherId: number): Promise<TeacherAnalytics> {
    try {
      const response = await api.get(`/dashboard/teacher-analytics/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher analytics:', error);
      throw error;
    }
  }

  async getTeacherStats(teacherId: number): Promise<TeacherStats[]> {
    try {
      const response = await api.get(`/dashboard/teacher-stats/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      throw error;
    }
  }

  // Student Analytics
  async getStudentAnalytics(
    studentId: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<StudentAnalytics> {
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await api.get(`/enhanced-students/${studentId}/analytics`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      throw error;
    }
  }

  async getStudentAnalyticsSummary(
    classId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<StudentAnalyticsSummary> {
    try {
      const params: Record<string, string | number> = {};
      if (classId) params.class_id = classId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await api.get('/enhanced-students/analytics/summary', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching student analytics summary:', error);
      throw error;
    }
  }

  // Attendance Analytics
  async getAdvancedAttendanceAnalytics(
    classId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<AdvancedAttendanceAnalytics> {
    try {
      const params: Record<string, string | number> = {};
      if (classId) params.class_id = classId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await api.get('/attendance/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance analytics:', error);
      throw error;
    }
  }

  // Attendance Statistics
  async getAttendanceStats(
    classId?: number,
    studentId?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<AttendanceStats> {
    try {
      const params: Record<string, string | number> = {};
      if (classId) params.class_id = classId;
      if (studentId) params.student_id = studentId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await api.get('/attendances/stats', { params });
      return response.data.stats;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      throw error;
    }
  }

  // Grade Reports
  async getStudentGradeReport(
    studentId: number,
    subjectId?: number,
    classId?: number,
    term?: string,
    academicYear?: string
  ): Promise<GradeReport> {
    try {
      const params: Record<string, string | number> = {};
      if (subjectId) params.subject_id = subjectId;
      if (classId) params.class_id = classId;
      if (term) params.term = term;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get(`/grades/student/${studentId}/report`, { params });
      return response.data.report;
    } catch (error) {
      console.error('Error fetching student grade report:', error);
      throw error;
    }
  }

  // Attendance Reports
  async getStudentAttendanceReport(
    studentId: number,
    dateFrom?: string,
    dateTo?: string,
    classId?: number,
    subjectId?: number
  ): Promise<AttendanceReport> {
    try {
      const params: Record<string, string | number> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (classId) params.class_id = classId;
      if (subjectId) params.subject_id = subjectId;
      
      const response = await api.get(`/attendance/student/${studentId}/report`, { params });
      return response.data.report;
    } catch (error) {
      console.error('Error fetching student attendance report:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;