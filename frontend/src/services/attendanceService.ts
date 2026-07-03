import api from '../lib/api';
import { PaginatedResponse } from '../types';
import { queueDataForSync, STORES } from '../utils/offline';

// Attendance interfaces
export interface Attendance {
  id: number;
  student_id: number;
  class_id: number;
  subject_id?: number | null;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  class_name?: string;
  subject_name?: string;
}

export interface AttendanceCreate {
  student_id: number;
  class_id: number;
  subject_id?: number | null;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

export interface AttendanceUpdate {
  status?: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

export interface AttendanceFilters {
  student_id?: number;
  class_id?: number;
  subject_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface AttendanceSummary {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
}

export interface BulkAttendanceCreate {
  class_id: number;
  subject_id?: number | null;
  date: string;
  attendances?: Array<{
    student_id: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }>;
  attendance_records?: Array<{
    student_id: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }>;
}

export interface ClassAttendanceSummary {
  daily: Record<string, { present: number; absent: number; late: number; excused?: number; total?: number }>
  monthly: Record<string, { present: number; absent: number; late: number; excused?: number; total?: number }>
  summary: { present: number; absent: number; late: number; excused?: number }
}

const attendanceService = {
  // Get attendance records with pagination and filtering
  getAttendances: async (filters: AttendanceFilters = {}): Promise<PaginatedResponse<Attendance>> => {
    try {
      const response = await api.get('/attendances', { params: filters });
      return {
        data: response.data?.attendances || [],
        pagination: response.data?.pagination || {
          total: 0,
          pages: 0,
          page: filters.page || 1,
          per_page: filters.per_page || 20,
          next: null,
          prev: null
        }
      } as any;
    } catch (error) {
      console.error('Error fetching attendances:', error);
      throw error;
    }
  },

  getAttendance: async (filters: AttendanceFilters = {}): Promise<PaginatedResponse<Attendance>> => {
    return attendanceService.getAttendances(filters);
  },

  // Get attendance by ID
  getAttendanceById: async (id: number): Promise<Attendance> => {
    try {
      const response = await api.get(`/attendances/${id}`);
      return response.data?.attendance;
    } catch (error) {
      console.error(`Error fetching attendance ${id}:`, error);
      throw error;
    }
  },

  // Create attendance record
  createAttendance: async (attendanceData: AttendanceCreate): Promise<Attendance> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.ATTENDANCE, attendanceData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const response = await api.post('/attendances', attendanceData);
      return response.data?.attendance;
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.ATTENDANCE, attendanceData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error creating attendance:', error);
      throw error;
    }
  },

  // Update attendance record
  updateAttendance: async (id: number, attendanceData: AttendanceUpdate): Promise<Attendance> => {
    try {
      const response = await api.put(`/attendances/${id}`, attendanceData);
      return response.data?.attendance;
    } catch (error) {
      console.error(`Error updating attendance ${id}:`, error);
      throw error;
    }
  },

  // Delete attendance record
  deleteAttendance: async (id: number): Promise<void> => {
    try {
      await api.delete(`/attendances/${id}`);
    } catch (error) {
      console.error(`Error deleting attendance ${id}:`, error);
      throw error;
    }
  },

  // Bulk create attendance records
  bulkCreateAttendance: async (bulkData: BulkAttendanceCreate): Promise<Attendance[]> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.ATTENDANCE, bulkData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const payload = {
        class_id: bulkData.class_id,
        subject_id: bulkData.subject_id ?? null,
        date: bulkData.date,
        attendances: bulkData.attendances || bulkData.attendance_records || []
      };
      const response = await api.post('/attendances/bulk', payload);
      return response.data?.attendances || [];
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.ATTENDANCE, bulkData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error bulk creating attendance:', error);
      throw error;
    }
  },

  createBulkAttendance: async (bulkData: BulkAttendanceCreate): Promise<Attendance[]> => {
    return attendanceService.bulkCreateAttendance(bulkData);
  },

  getClassAttendanceSummary: async (classId: number, params?: { year?: number; month?: number; date?: string }): Promise<ClassAttendanceSummary> => {
    const year = params?.year;
    const month = params?.month;

    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (params?.date) {
      dateFrom = params.date;
      dateTo = params.date;
    } else if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      dateFrom = fmt(start);
      dateTo = fmt(end);
    } else if (year) {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    }

    const [trendsResp, statsResp] = await Promise.all([
      api.get('/attendances/analytics/trends', { params: { class_id: classId, date_from: dateFrom, date_to: dateTo } }),
      api.get('/attendances/stats', { params: { class_id: classId, date_from: dateFrom, date_to: dateTo } })
    ]);

    const daily = trendsResp.data?.trends || {};
    const monthly: Record<string, any> = {};
    Object.entries(daily).forEach(([dateStr, stats]: any) => {
      const key = String(dateStr).slice(0, 7);
      if (!monthly[key]) monthly[key] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      monthly[key].present += Number(stats?.present || 0);
      monthly[key].absent += Number(stats?.absent || 0);
      monthly[key].late += Number(stats?.late || 0);
      monthly[key].excused += Number(stats?.excused || 0);
      monthly[key].total += Number(stats?.total || 0);
    });

    const s = statsResp.data?.stats || {};

    return {
      daily,
      monthly,
      summary: {
        present: Math.round(Number(s.present_percentage || 0)),
        absent: Math.round(Number(s.absent_percentage || 0)),
        late: Math.round(Number(s.late_percentage || 0)),
        excused: Math.round(Number(s.excused_percentage || 0))
      }
    };
  },

  // Get attendance summary for a student
  getStudentAttendanceSummary: async (
    studentId: number,
    params?: any
  ): Promise<any> => {
    try {
      const q: Record<string, string | number> = {};
      if (params?.date_from) q.date_from = params.date_from;
      if (params?.date_to) q.date_to = params.date_to;
      if (params?.class_id) q.class_id = params.class_id;
      if (params?.subject_id) q.subject_id = params.subject_id;

      const response = await api.get(`/attendance/student/${studentId}/report`, { params: q });
      return response.data?.report;
    } catch (error) {
      console.error(`Error fetching attendance summary for student ${studentId}:`, error);
      throw error;
    }
  },

  // Get class attendance for a specific date
  getClassAttendance: async (classId: number, date: string, subjectId?: number): Promise<Attendance[]> => {
    try {
      const res = await attendanceService.getAttendances({
        class_id: classId,
        ...(subjectId ? { subject_id: subjectId } : {}),
        date_from: date,
        date_to: date,
        per_page: 500,
        page: 1
      });
      return res.data;
    } catch (error) {
      console.error(`Error fetching class attendance for class ${classId} on ${date}:`, error);
      throw error;
    }
  },

  // Generate attendance report
  generateAttendanceReport: async (
    filters: {
      class_id?: number;
      student_id?: number;
      date_from: string;
      date_to: string;
      format?: 'pdf' | 'excel';
    }
  ): Promise<Blob> => {
    try {
      const per_page = 1000;
      const page = 1;
      const resp = await attendanceService.getAttendances({
        class_id: filters.class_id,
        student_id: filters.student_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        per_page,
        page
      });

      const lines = ['id,date,status,student_id,class_id,subject_id,remarks'];
      resp.data.forEach((a) => {
        const remarks = String(a.remarks || '').replace(/"/g, '""');
        lines.push(`${a.id},${a.date},${a.status},${a.student_id},${a.class_id},${a.subject_id ?? ''},"${remarks}"`);
      });

      return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  }
};

export { attendanceService };
export default attendanceService;
