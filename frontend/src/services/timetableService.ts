import api from '../lib/api';

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: string; // e.g. "Monday"
  subject_id: number;
  subject_name: string;
  class_id: number;
  class_name: string;
  teacher_id: number;
  teacher_name: string;
  room_number: string;
  academic_year: string;
  term: string;
  status: 'active' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: number;
  day: string;
  time_slot: string;
  subject_name: string;
  teacher_name: string;
  room_number: string;
  class_name: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled' | 'rescheduled';
}

export interface CreateTimeSlotParams {
  period_id: number;
  day_of_week: string;
  subject_id: number;
  class_id: number;
  teacher_id: number;
  room_id?: number | null;
  academic_year: string;
  term: string;
}

export interface PeriodOption {
  id: number;
  name: string;
  start: string;
  end: string;
  label?: string;
  disabled?: boolean;
  blocked_reason?: string | null;
  span_period_ids?: number[];
}

export interface PeriodOptionsResponse {
  success: boolean;
  data: PeriodOption[];
  meta?: {
    class_start_time?: string;
    required_period_count?: number;
    subject_credit_hours?: number | null;
    recommended_period_id?: number | null;
  };
}

export interface TimetableConflict {
  type: 'teacher' | 'room' | 'class';
  message: string;
  conflicting_slots: TimeSlot[];
}

export interface WeeklyTimetable {
  [key: string]: TimetableEntry[]; // key is day name
}

class TimetableService {
  // Get timetable for a specific class
  async getClassTimetable(classId: number, academicYear?: string, term?: string): Promise<WeeklyTimetable> {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (term) params.append('term', term);
      
      const queryString = params.toString();
      const response = await api.get(`/timetable/class/${classId}${queryString ? `?${queryString}` : ''}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching class timetable:', error);
      throw error;
    }
  }

  // Get timetable for a specific teacher
  async getTeacherTimetable(teacherId: number, academicYear?: string, term?: string): Promise<WeeklyTimetable> {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (term) params.append('term', term);
      
      const queryString = params.toString();
      const response = await api.get(`/timetable/teacher/${teacherId}${queryString ? `?${queryString}` : ''}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching teacher timetable:', error);
      throw error;
    }
  }

  // Get all timetables (admin view)
  async getAllTimetables(academicYear?: string, term?: string): Promise<TimeSlot[]> {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (term) params.append('term', term);
      
      const queryString = params.toString();
      const response = await api.get(`/timetable${queryString ? `?${queryString}` : ''}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching all timetables:', error);
      throw error;
    }
  }

  // Create a new time slot
  async createTimeSlot(timeSlotData: CreateTimeSlotParams): Promise<TimeSlot> {
    try {
      // #region debug-point B:create-slot-request
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"B",location:"frontend/src/services/timetableService.ts:107",msg:"[DEBUG] create slot request",data:{payload:timeSlotData},ts:Date.now()})}).catch(()=>{});
      // #endregion
      const response = await api.post('/timetable/slots', timeSlotData);
      // #region debug-point B:create-slot-success
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"B",location:"frontend/src/services/timetableService.ts:111",msg:"[DEBUG] create slot success",data:{status:response.status,slotId:response.data?.data?.id ?? response.data?.id ?? null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      return response.data?.data || response.data;
    } catch (error) {
      // #region debug-point B:create-slot-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"B",location:"frontend/src/services/timetableService.ts:115",msg:"[DEBUG] create slot error",data:{message:(error as any)?.message ?? null,status:(error as any)?.response?.status ?? null,response:(error as any)?.response?.data ?? null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Error creating time slot:', error);
      throw error;
    }
  }

  // Update a time slot
  async updateTimeSlot(slotId: string, updates: Partial<CreateTimeSlotParams>): Promise<TimeSlot> {
    try {
      const response = await api.put(`/timetable/slots/${slotId}`, updates);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating time slot:', error);
      throw error;
    }
  }

  // Delete a time slot
  async deleteTimeSlot(slotId: string): Promise<void> {
    try {
      await api.delete(`/timetable/slots/${slotId}`);
    } catch (error) {
      console.error('Error deleting time slot:', error);
      throw error;
    }
  }

  // Check for conflicts before creating/updating
  async checkConflicts(timeSlotData: CreateTimeSlotParams): Promise<TimetableConflict[]> {
    try {
      const response = await api.post('/timetable/check-conflicts', timeSlotData);
      return response.data.conflicts || [];
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    }
  }

  async getPeriodOptions(params?: {
    class_id?: number;
    subject_id?: number;
    teacher_id?: number;
    day_of_week?: string;
    term?: string;
    academic_year?: string;
    slot_id?: number;
  }): Promise<PeriodOptionsResponse> {
    try {
      // #region debug-point C:period-options-request
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"C",location:"frontend/src/services/timetableService.ts:179",msg:"[DEBUG] period options request",data:{params},ts:Date.now()})}).catch(()=>{});
      // #endregion
      const response = await api.get('/timetable/periods', { params });
      // #region debug-point C:period-options-success
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"C",location:"frontend/src/services/timetableService.ts:183",msg:"[DEBUG] period options success",data:{status:response.status,count:Array.isArray(response.data?.data)?response.data.data.length:null,meta:response.data?.meta ?? null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      return response.data;
    } catch (error) {
      // #region debug-point C:period-options-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"timetable-socket-timeout",runId:"pre-fix",hypothesisId:"C",location:"frontend/src/services/timetableService.ts:187",msg:"[DEBUG] period options error",data:{params,message:(error as any)?.message ?? null,status:(error as any)?.response?.status ?? null,response:(error as any)?.response?.data ?? null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Error fetching period options:', error);
      throw error;
    }
  }

  // Bulk import timetable from CSV
  async bulkImportTimetable(file: File): Promise<{ success: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/timetable/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing timetable:', error);
      throw error;
    }
  }

  // Export timetable to CSV
  async exportTimetable(classId?: number, teacherId?: number, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId.toString());
      if (teacherId) params.append('teacher_id', teacherId.toString());
      params.append('format', format);
      
      const response = await api.get(`/timetable/export?${params}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting timetable:', error);
      throw error;
    }
  }

  // Get available time slots for scheduling
  async getAvailableTimeSlots(date: string, duration: number): Promise<string[]> {
    try {
      const response = await api.get(`/timetable/available-slots?date=${date}&duration=${duration}`);
      return response.data.slots;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw error;
    }
  }
}

export default new TimetableService();
