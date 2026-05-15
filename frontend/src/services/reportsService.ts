import api from '../lib/api';
import { API_BASE_URL } from '../config/constants';
import { Pagination } from '../types';
import { analyticsService } from './analyticsService';
import gradeService from './gradeService';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';

// Report Filter Interface
export interface ReportFilter {
  start_date?: string;
  end_date?: string;
  class_id?: number;
  subject_id?: number;
  student_id?: number;
  teacher_id?: number;
  academic_year?: string;
  term?: string;
  report_type?: 'academic' | 'attendance' | 'financial' | 'behavioral';
  // Add missing properties
  reportType?: 'grades' | 'progress' | 'transcripts' | 'class-performance';
  dateRange?: {
    start?: string;
    end?: string;
    from?: string;
    to?: string;
  };
  classFilter?: number | number[] | string;
  subjectFilter?: number[] | string;
}

// Base report data interface
export interface ReportData {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  data: Record<string, unknown>;
  report_data?: unknown;
  metadata?: {
    totalRecords: number;
    filters: ReportFilter;
    exportFormats: string[];
  };
}

// Academic Report Data Interface
export interface AcademicReportData extends ReportData {
  data: {
    class_performance: {
      class_id: number;
      class_name: string;
      average_score: number;
      total_students: number;
    }[];
    subject_performance: {
      subject_id: number;
      subject_name: string;
      average_score: number;
      total_assessments: number;
    }[];
    grades: {
      student_id: number;
      student_name: string;
      subject_scores: Record<string, number>;
      overall_average: number;
    }[];
    statistics: {
      highest_score: number;
      lowest_score: number;
      class_average: number;
      pass_rate: number;
    };
  };
}

// Attendance Report Data Interface
export interface AttendanceReportData extends ReportData {
  data: {
    overall_attendance_rate: number;
    overall?: {
      rate: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    trends?: Array<{
      date: string;
      present: number;
      absent: number;
      late: number;
    }>;
    classComparison?: Array<{
      class_id: number;
      class_name: string;
      attendance_rate: number;
    }>;
    class_attendance: {
      class_id: number;
      class_name: string;
      attendance_rate: number;
      total_days: number;
      present_days: number;
    }[];
    student_attendance: {
      student_id: number;
      student_name: string;
      attendance_rate: number;
      total_days: number;
      present_days: number;
      absent_days: number;
      late_days: number;
    }[];
  };
}

// Financial Report Data Interface
export interface FinancialReportData extends Record<string, unknown> {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  fee_collection_rate: number;
  outstanding_fees: number;
  monthly_breakdown: {
    month: string;
    revenue: number;
    expenses: number;
    net: number;
  }[];
  classBreakdown?: Array<{
    class_id: number;
    class_name: string;
    revenue: number;
    expenses: number;
  }>;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface SubjectOption {
  id: number;
  name: string;
}

class ReportsService {
  private toExportReportData(reportData: any): any {
    if (reportData && typeof reportData === 'object') {
      if (reportData.config && Array.isArray(reportData.sections)) return reportData;
      if (reportData.report_data && reportData.report_data.config && Array.isArray(reportData.report_data.sections)) return reportData.report_data;
    }

    const title = reportData?.title || 'Report';
    const type = reportData?.type || 'custom';
    const generatedAt = reportData?.generatedAt || new Date().toISOString();
    const rawData = reportData?.data;

    const sections: any[] = [];

    const pushTable = (sectionTitle: string, rows: any[]) => {
      sections.push({ type: 'table', title: sectionTitle, data: rows });
    };

    const pushMetric = (sectionTitle: string, value: any) => {
      sections.push({ type: 'metric', title: sectionTitle, value });
    };

    if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData)) {
        pushTable('Data', rawData);
      } else if (rawData.config && Array.isArray((rawData as any).sections)) {
        return rawData;
      } else {
        const entries = Object.entries(rawData as Record<string, any>);
        for (const [k, v] of entries) {
          if (Array.isArray(v)) {
            const rows = v.map((item) => (typeof item === 'object' && item !== null ? item : { value: item }));
            pushTable(k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), rows);
          } else if (v && typeof v === 'object') {
            pushTable(k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), [{ value: JSON.stringify(v) }]);
          } else {
            pushMetric(k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), v);
          }
        }
        if (sections.length === 0) pushMetric('Summary', 'No data');
      }
    } else {
      pushMetric('Summary', rawData ?? 'No data');
    }

    return {
      config: {
        name: title,
        type,
        filters: reportData?.metadata?.filters
      },
      generated_at: generatedAt,
      sections
    };
  }

  async generateCustomReport(config: any): Promise<any> {
    const response = await api.post('/reports/custom', config);
    return response.data;
  }

  // Generate Academic Reports
  async generateAcademicReport(filters: ReportFilter): Promise<ReportData> {
    try {
      const reportType = filters.reportType || 'grades';
      const dateFrom = filters.dateRange?.from || (filters.dateRange as any)?.start;
      const dateTo = filters.dateRange?.to || (filters.dateRange as any)?.end;
      const classId = Array.isArray(filters.classFilter) ? filters.classFilter[0] : filters.classFilter;

      const customConfig = {
        type: 'academic',
        dateRange: { from: dateFrom, to: dateTo },
        filters: {
          classes: classId && classId !== 'all' ? [Number(classId)] : []
        },
        visualizations: {
          metrics: ['average_grade'],
          tables: ['student_grades']
        }
      };

      const response = await api.post('/reports/custom', customConfig);
      const customReportData = response.data;

      const sections = customReportData?.sections || [];
      const avgSection = sections.find((s: any) => s.type === 'metric' && (s.title || '').toLowerCase().includes('average'));
      const tableSection = sections.find((s: any) => s.type === 'table');
      const subjectsCount = Array.isArray(tableSection?.data)
        ? new Set(tableSection.data.map((r: any) => r.subject).filter(Boolean)).size
        : 0;

      const data: any = {
        performance: {
          average: typeof avgSection?.value === 'number' ? avgSection.value : Number(avgSection?.value) || 0,
          distribution: {}
        },
        subjects: Array.from({ length: subjectsCount }).map((_, i) => ({ name: `Subject ${i + 1}`, average: 0 })),
        sections
      };

      return {
        id: `academic_${reportType}_${Date.now()}`,
        title: `Academic ${reportType?.charAt(0).toUpperCase() + reportType?.slice(1)} Report`,
        type: 'academic',
        generatedAt: new Date().toISOString(),
        data,
        report_data: customReportData,
        metadata: {
          totalRecords: Array.isArray(tableSection?.data) ? tableSection.data.length : 0,
          filters,
          exportFormats: ['pdf', 'excel', 'csv']
        }
      };
    } catch (error) {
      console.error('Error generating academic report:', error);
      throw error;
    }
  }

  // Generate Attendance Reports
  async generateAttendanceReport(filters: ReportFilter): Promise<ReportData> {
    try {
      // Handle classFilter conversion
      const classId = Array.isArray(filters.classFilter)
        ? filters.classFilter[0]
        : filters.classFilter;

      // Handle dateRange with proper null checks
      const dateFrom = filters.dateRange?.from || filters.dateRange?.start;
      const dateTo = filters.dateRange?.to || filters.dateRange?.end;

      const response = await analyticsService.getAdvancedAttendanceAnalytics(
        classId && classId !== 'all' ? Number(classId) : undefined,
        dateFrom,
        dateTo
      );

      const attendanceData = response?.data;

      // Create data structure that matches AttendanceReportData requirements
      const reportDataContent = {
        overall_attendance_rate: attendanceData?.overall_statistics?.average_attendance_rate || 0,
        overall: {
          rate: attendanceData?.overall_statistics?.average_attendance_rate || 0,
          present: attendanceData?.daily_trends?.reduce((acc: number, day: any) => acc + (day.present_count || 0), 0) || 0,
          absent: attendanceData?.daily_trends?.reduce((acc: number, day: any) => acc + ((day.total_students || 0) - (day.present_count || 0)), 0) || 0,
          late: 0, // Mocked as not in current AdvancedAttendanceAnalytics
          excused: 0
        },
        trends: attendanceData?.daily_trends?.map((day: any) => ({
          date: day.date,
          present: day.present_count,
          absent: day.total_students - day.present_count,
          late: 0
        })) || [],
        classComparison: attendanceData?.class_comparison?.map((cls: any) => ({
          class_id: cls.class_id,
          className: cls.class_name,
          attendanceRate: cls.attendance_rate
        })) || [],
        class_attendance: [],
        student_attendance: attendanceData?.student_insights?.map((student: any) => ({
          student_id: student.student_id,
          student_name: student.student_name,
          attendance_rate: student.attendance_rate,
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0
        })) || []
      };

      return {
        id: `attendance_${Date.now()}`,
        title: 'Attendance Report',
        type: 'attendance',
        generatedAt: new Date().toISOString(),
        data: reportDataContent,
        metadata: {
          totalRecords: attendanceData?.student_insights?.length || 0,
          filters,
          exportFormats: ['pdf', 'excel', 'csv']
        }
      };
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  }

  // Generate Financial Reports
  async generateFinancialReport(filters: ReportFilter): Promise<ReportData> {
    try {
      const dateFrom = filters.dateRange?.from || (filters.dateRange as any)?.start;
      const dateTo = filters.dateRange?.to || (filters.dateRange as any)?.end;

      const response = await api.get('/reports/financial', { params: { date_from: dateFrom, date_to: dateTo } });

      const financialData: FinancialReportData = response.data?.data || response.data;

      return {
        id: `financial_${Date.now()}`,
        title: 'Financial Report',
        type: 'financial',
        generatedAt: new Date().toISOString(),
        data: financialData, // No need for type assertion now
        metadata: {
          totalRecords: financialData.classBreakdown?.length || 0,
          filters,
          exportFormats: ['pdf', 'excel', 'csv']
        }
      };
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw error;
    }
  }

  // Generate Administrative Reports
  async generateAdministrativeReport(filters: ReportFilter): Promise<ReportData> {
    try {
      const dateFrom = filters.dateRange?.from || filters.dateRange?.start;
      const dateTo = filters.dateRange?.to || filters.dateRange?.end;

      const response = await api.get('/reports/administrative', {
        params: {
          date_from: dateFrom,
          date_to: dateTo,
          report_type: filters.report_type
        }
      });

      const data = response.data?.data || response.data;

      return {
        id: `administrative_${Date.now()}`,
        title: 'Administrative Report',
        type: 'administrative',
        generatedAt: new Date().toISOString(),
        data,
        metadata: {
          totalRecords: Array.isArray(data) ? data.length : 0,
          filters,
          exportFormats: ['pdf', 'excel', 'csv']
        }
      };
    } catch (error) {
      console.error('Error generating administrative report:', error);
      throw error;
    }
  }

  private async generateGradeReport(filters: ReportFilter): Promise<Record<string, unknown>> {
    // Mock implementation - replace with actual API call
    return {
      performance: {
        average: 85.5,
        distribution: {
          'A': 15,
          'B': 25,
          'C': 10,
          'D': 5,
          'F': 2
        }
      },
      subjects: [
        { name: 'Mathematics', average: 82.4 },
        { name: 'English', average: 88.1 },
        { name: 'Science', average: 84.7 },
        { name: 'History', average: 86.2 }
      ],
      grades: [],
      statistics: {
        highest_score: 98,
        lowest_score: 45,
        class_average: 85.5,
        pass_rate: 92.5
      }
    };
  }

  private async generateProgressReport(filters: ReportFilter): Promise<Record<string, unknown>> {
    // Mock implementation - replace with actual API call
    return { 
      performance: {
        average: 82.0,
        distribution: { 'A': 10, 'B': 20, 'C': 15 }
      },
      subjects: [
        { name: 'Mathematics', average: 78.5 },
        { name: 'English', average: 85.0 }
      ],
      progress: [] 
    };
  }

  private async generateTranscriptReport(filters: ReportFilter): Promise<Record<string, unknown>> {
    // Mock implementation - replace with actual API call
    return { 
      performance: {
        average: 88.5,
        distribution: { 'A': 20, 'B': 10, 'C': 5 }
      },
      subjects: [
        { name: 'Mathematics', average: 86.5 },
        { name: 'English', average: 90.0 }
      ],
      transcripts: [] 
    };
  }

  private async generateClassPerformanceReport(filters: ReportFilter): Promise<Record<string, unknown>> {
    // Mock implementation - replace with actual API call
    return { 
      performance: {
        average: 79.5,
        distribution: { 'A': 5, 'B': 15, 'C': 25, 'D': 10 }
      },
      subjects: [
        { name: 'Mathematics', average: 75.4 },
        { name: 'English', average: 82.1 },
        { name: 'Science', average: 80.7 }
      ],
      data: [] 
    };
  }

  // Export Report Data
  async exportReportData(reportData: any, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> {
    try {
      const exportData = this.toExportReportData(reportData);
      const response = await api.post('/reports/export',
        { report_data: exportData, format },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error exporting report data:', error);
      throw error;
    }
  }

  async getAvailableClasses(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await api.get('/classes');
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<any>(response, 'classes');
      return standardized.data.map((cls: any) => ({
        id: cls.id.toString(),
        name: cls.name
      }));
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  async getAvailableSubjects(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await api.get('/subjects');
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<any>(response, 'subjects');
      return standardized.data.map((subject: any) => ({
        id: subject.id.toString(),
        name: subject.name
      }));
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  }
}

export const reportsService = new ReportsService();
export default reportsService;
