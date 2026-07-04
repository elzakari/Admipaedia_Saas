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
      const response = await api.post('/timetable/slots', timeSlotData);
      return response.data?.data || response.data;
    } catch (error) {
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
