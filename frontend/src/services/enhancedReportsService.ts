import { api } from '../lib/api';
import { reportsService } from './reportsService';

// Ghana Education Service specific interfaces
export interface GESReportCard {
  student_info: {
    name: string;
    admission_number: string;
    class: string;
    educational_level: string;
    academic_year: string;
    term: string;
  };
  academic_performance: {
    subjects: Array<{
      name: string;
      score: number;
      grade: string;
      grade_point: number;
      remarks: string;
    }>;
    overall_gpa: number;
    class_position: string;
    total_subjects: number;
  };
  attendance: {
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    attendance_rate: number;
  };
  core_competencies: Array<{
    name: string;
    level: number;
    description: string;
  }>;
  progression_status: {
    meets_academic_threshold: boolean;
    meets_attendance_threshold: boolean;
    promotion_status: string;
    next_level: string;
  };
  teacher_comments: string;
  principal_comments: string;
  grading_scheme: {
    name: string;
    scale: string;
  };
}

export interface GESTranscript {
  student_info: {
    name: string;
    admission_number: string;
    date_of_birth: string;
    gender: string;
    entry_date: string;
    graduation_date: string;
  };
  academic_record: Array<{
    academic_year: string;
    educational_level: string;
    subjects: Array<{
      name: string;
      code: string;
      score: number;
      grade: string;
      grade_point: number;
      credits: number;
    }>;
    year_gpa: number;
    promotion_status: string;
  }>;
  overall_performance: {
    cumulative_gpa: number;
    total_credits: number;
    academic_standing: string;
  };
}

export interface ClassPerformanceSummary {
  class_info: {
    class_id: number;
    total_students: number;
    term: string;
    academic_year: string;
  };
  subject_performance: Array<{
    subject: string;
    class_average: number;
    highest_score: number;
    lowest_score: number;
    student_count: number;
  }>;
  attendance_summary: {
    average_attendance_rate: number;
  };
}

class EnhancedReportsService {
  private normalizeTerm(term: string): string {
    const t = (term || '').toLowerCase().trim();
    if (t === 'term 1' || t === '1' || t === 'first') return 'First Term';
    if (t === 'term 2' || t === '2' || t === 'second') return 'Second Term';
    if (t === 'term 3' || t === '3' || t === 'third') return 'Third Term';
    return term;
  }

  // Generate GES compliant report card
  async generateReportCard(
    studentId: number,
    term: string = 'Term 1',
    academicYear: string = '2024/2025',
    format: 'json' | 'pdf' | 'html' = 'json'
  ): Promise<GESReportCard> {
    try {
      const response = await api.get(`/reports/student/${studentId}/report-card`, {
        params: { term: this.normalizeTerm(term), academic_year: academicYear, format }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating report card:', error);
      throw error;
    }
  }

  // Generate official transcript
  async generateTranscript(
    studentId: number,
    format: 'json' | 'pdf' = 'json'
  ): Promise<GESTranscript> {
    try {
      const response = await api.get(`/reports/student/${studentId}/transcript`, {
        params: { format }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating transcript:', error);
      throw error;
    }
  }

  // Generate class performance summary
  async generateClassPerformanceSummary(
    classId: number,
    term: string = 'Term 1',
    academicYear: string = '2024/2025'
  ): Promise<ClassPerformanceSummary> {
    try {
      const response = await api.get(`/reports/class/${classId}/performance-summary`, {
        params: { term: this.normalizeTerm(term), academic_year: academicYear }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating class performance summary:', error);
      throw error;
    }
  }

  // Download report card as PDF
  async downloadReportCardPDF(
    studentId: number,
    term: string = 'Term 1',
    academicYear: string = '2024/2025'
  ): Promise<Blob> {
    try {
      const response = await api.get(`/reports/student/${studentId}/report-card`, {
        params: { term: this.normalizeTerm(term), academic_year: academicYear, format: 'pdf' },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading report card PDF:', error);
      throw error;
    }
  }

  // Download transcript as PDF
  async downloadTranscriptPDF(studentId: number): Promise<Blob> {
    try {
      const response = await api.get(`/reports/student/${studentId}/transcript`, {
        params: { format: 'pdf' },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading transcript PDF:', error);
      throw error;
    }
  }

  // Print report card
  async printReportCard(
    studentId: number,
    term: string = 'Term 1',
    academicYear: string = '2024/2025'
  ): Promise<void> {
    try {
      const blob = await this.downloadReportCardPDF(studentId, term, academicYear);
      const url = window.URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing report card:', error);
      throw error;
    }
  }

  // Email report card to parents
  async emailReportCard(
    studentId: number,
    parentEmail: string,
    term: string = 'Term 1',
    academicYear: string = '2024/2025'
  ): Promise<void> {
    try {
      const reportData = await this.generateReportCard(studentId, term, academicYear, 'json');
      await api.post(`/reports/student/${studentId}/send-report`, {
        email: parentEmail,
        report_data: reportData
      });
    } catch (error) {
      console.error('Error emailing report card:', error);
      throw error;
    }
  }

  // Get available academic years for reports
  async getAvailableAcademicYears(): Promise<string[]> {
    try {
      const response = await api.get('/reports/academic-years');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching academic years:', error);
      return ['2024/2025', '2023/2024', '2022/2023'];
    }
  }

  // Get available terms
  getAvailableTerms(): string[] {
    return ['Term 1', 'Term 2', 'Term 3'];
  }
}

export const enhancedReportsService = new EnhancedReportsService();
export default enhancedReportsService;
