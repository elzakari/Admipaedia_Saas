import api from '../lib';
import { StandardPaginatedResponse, StandardApiResponse } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';
import {
  LessonV2,
  LessonBroadcast,
  LessonAttachment,
  LessonComment,
  LessonAcknowledgement,
  LiveLessonStats,
  LinkPayload,
  AcknowledgeLessonPayload,
  CreateLessonCommentPayload,
  MonitoringKpiFilters,
  LessonMonitoringKpis,
} from '../types/lesson';

// classService types
export interface Class {
  id: number;
  name: string;
  display_name?: string;
  grade_level: string;
  academic_year: string;
  section?: string | null;
  capacity: number;
  current_enrollment: number;
  teacher_id?: number;
  class_teacher?: string;
  room_number?: string;
  room?: string;
  start_time?: string | null;
  end_time?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ClassCreate {
  name: string;
  grade_level: string;
  academic_year: string;
  section?: string | null;
  capacity?: number | null;
  teacher_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface ClassUpdate {
  name?: string;
  grade_level?: string;
  academic_year?: string;
  section?: string | null;
  capacity?: number | null;
  teacher_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
}

// Lesson data interface
export interface LessonData {
  title: string;
  description?: string;
  date: string;
  status?: 'planned' | 'in-progress' | 'completed';
  subject_id?: number;
  subject_name?: string;
  objectives?: string;
  classwork?: string;
  homework?: string;
  homework_due_date?: string;
  notes?: string;
  resources?: string[];
  materials?: Array<Record<string, unknown>>;
  period_number?: number;
  start_time?: string;
  end_time?: string;
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  subject_id?: number | null;
  subject_name?: string;
  date: string;
  status: 'planned' | 'in-progress' | 'completed' | string;
  teacher_id?: number | null;
  teacher_name?: string;
  class_id?: number;
  class_name?: string | null;
  objectives?: string;
  classwork?: string;
  homework?: string;
  homework_due_date?: string;
  notes?: string;
  resources?: string[];
  materials?: Array<Record<string, unknown>>;
  period_number?: number;
  start_time?: string;
  end_time?: string;
  broadcast_status?: string;
  created_at: string;
  updated_at: string;
}

export interface LessonMonitoringSummary {
  total_logs: number;
  completed_logs: number;
  in_progress_logs: number;
  planned_logs: number;
  today_logs: number;
  classes_covered: number;
  teachers_reporting: number;
  classes_without_logs_today: number;
}

export interface LessonMonitoringResponse {
  lessons: Lesson[];
  summary: LessonMonitoringSummary;
  pagination?: {
    total?: number;
    pages?: number;
    page?: number;
    per_page?: number;
    next?: number | null;
    prev?: number | null;
  };
}

// Announcement data interface
export interface AnnouncementData {
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_audience: 'students' | 'parents' | 'both';
  expires_at?: string;
}

export interface ClassAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_audience: 'students' | 'parents' | 'both';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Resource data interface
export interface ResourceData {
  title: string;
  description?: string;
  resource_type: 'document' | 'video' | 'audio' | 'image' | 'link';
  subject_id?: number;
  is_public: boolean;
}

export interface ClassResource {
  id: number;
  title: string;
  description?: string;
  resource_type: 'document' | 'video' | 'audio' | 'image' | 'link';
  subject_id?: number;
  is_public: boolean;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

const classService = {
  // Get all classes with pagination and filtering
  getClasses: async (params?: {
    page?: number;
    per_page?: number;
    grade_level?: string;
    academic_year?: string;
  }): Promise<StandardPaginatedResponse<Class>> => {
    try {
      const response = await api.get('/classes', { params });
      return ApiResponseStandardizer.standardizePaginatedResponse<Class>(response, 'classes');
    } catch (error) {
      console.error('Error fetching classes:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get a specific class by ID
  getClassById: async (classId: number): Promise<StandardApiResponse<Class>> => {
    try {
      const response = await api.get(`/classes/${classId}`);
      return ApiResponseStandardizer.standardizeSingleResponse<Class>(response, 'class');
    } catch (error) {
      console.error(`Error fetching class ${classId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Create a new class
  createClass: async (classData: ClassCreate): Promise<StandardApiResponse<Class>> => {
    try {
      const response = await api.post('/classes', classData);
      return ApiResponseStandardizer.standardizeSingleResponse<Class>(response, 'class');
    } catch (error) {
      console.error('Error creating class:', error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Update a class
  updateClass: async (classId: number, classData: ClassUpdate): Promise<StandardApiResponse<Class>> => {
    try {
      const response = await api.put(`/classes/${classId}`, classData);
      return ApiResponseStandardizer.standardizeSingleResponse<Class>(response, 'class');
    } catch (error) {
      console.error(`Error updating class ${classId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Delete a class
  deleteClass: async (classId: number, force: boolean = false): Promise<StandardApiResponse<void>> => {
    try {
      const response = await api.delete(`/classes/${classId}`, {
        params: { force: force.toString() }
      });
      return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting class ${classId}:`, error);
      // Re-throw the standardized error so ClassList.tsx can access the backend message
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Assign a teacher to a class
  assignTeacher: async (classId: number, teacherId: number): Promise<StandardApiResponse<Class>> => {
    try {
      const response = await api.post(`/classes/${classId}/assign-teacher`, { teacher_id: teacherId });
      return ApiResponseStandardizer.standardizeSingleResponse<Class>(response, 'class');
    } catch (error) {
      console.error(`Error assigning teacher to class ${classId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get classes by teacher
  getClassesByTeacher: async (teacherId: number, params?: {
    page?: number;
    per_page?: number;
  }): Promise<StandardPaginatedResponse<Class>> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/classes`, { params });
      return ApiResponseStandardizer.standardizePaginatedResponse<Class>(response, 'classes');
    } catch (error) {
      console.error(`Error fetching classes for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get class announcements
  getClassAnnouncements: async (classId: number): Promise<StandardPaginatedResponse<ClassAnnouncement>> => {
    try {
      const response = await api.get(`/classes/${classId}/announcements`);
      return ApiResponseStandardizer.standardizePaginatedResponse<ClassAnnouncement>(response, 'announcements');
    } catch (error) {
      console.error(`Error fetching announcements for class ${classId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get class lessons
  getClassLessons: async (classId: number): Promise<Lesson[]> => {
    try {
      const response = await api.get(`/classes/${classId}/lessons`);
      return response.data.lessons;
    } catch (error) {
      console.error(`Error fetching lessons for class ${classId}:`, error);
      throw error;
    }
  },

  getLessonMonitoring: async (params?: {
    page?: number;
    per_page?: number;
    class_id?: number;
    teacher_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
    department_id?: number[] | number;
    subject_id?: number[] | number;
    period_number?: number[] | number;
    visibility?: string[] | string;
    broadcast_status?: string[] | string;
    homework_due_from?: string;
    homework_due_to?: string;
  }): Promise<LessonMonitoringResponse> => {
    try {
      const response = await api.get('/classes/lesson-monitoring', { params });
      return {
        lessons: response.data?.lessons || [],
        summary: response.data?.summary || {
          total_logs: 0,
          completed_logs: 0,
          in_progress_logs: 0,
          planned_logs: 0,
          today_logs: 0,
          classes_covered: 0,
          teachers_reporting: 0,
          classes_without_logs_today: 0,
        },
        pagination: response.data?.pagination,
      };
    } catch (error) {
      console.error('Error fetching lesson monitoring data:', error);
      throw error;
    }
  },

  getClassSubjects: async (classId: number): Promise<Array<{ id: number; name: string; teachers?: Array<{ id: number; name: string }> }>> => {
    try {
      const response = await api.get(`/classes/${classId}/subjects`, { params: { per_page: 200 } });
      return response.data?.subjects || [];
    } catch (error) {
      console.error(`Error fetching subjects for class ${classId}:`, error);
      throw error;
    }
  },

  // Get class resources
  getClassResources: async (classId: number): Promise<ClassResource[]> => {
    try {
      const response = await api.get(`/classes/${classId}/resources`);
      return response.data.resources;
    } catch (error) {
      console.error(`Error fetching resources for class ${classId}:`, error);
      throw error;
    }
  },

  // Create a class lesson
  createClassLesson: async (classId: number, lessonData: LessonData): Promise<{ lesson: Lesson }> => {
    try {
      const response = await api.post(`/classes/${classId}/lessons`, lessonData);
      return response.data;
    } catch (error) {
      console.error(`Error creating lesson for class ${classId}:`, error);
      throw error;
    }
  },

  updateClassLesson: async (classId: number, lessonId: number, lessonData: Partial<LessonData>): Promise<{ lesson: Lesson }> => {
    try {
      const response = await api.put(`/classes/${classId}/lessons/${lessonId}`, lessonData);
      return response.data;
    } catch (error) {
      console.error(`Error updating lesson ${lessonId} for class ${classId}:`, error);
      throw error;
    }
  },

  deleteClassLesson: async (classId: number, lessonId: number): Promise<void> => {
    try {
      await api.delete(`/classes/${classId}/lessons/${lessonId}`);
    } catch (error) {
      console.error(`Error deleting lesson ${lessonId} for class ${classId}:`, error);
      throw error;
    }
  },

  // Create a class announcement
  createClassAnnouncement: async (classId: number, announcementData: AnnouncementData): Promise<{ announcement: ClassAnnouncement }> => {
    try {
      const response = await api.post(`/classes/${classId}/announcements`, announcementData);
      return response.data;
    } catch (error) {
      console.error(`Error creating announcement for class ${classId}:`, error);
      throw error;
    }
  },

  // Create a class resource
  createClassResource: async (classId: number, resourceData: ResourceData, file?: File): Promise<{ resource: ClassResource }> => {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', resourceData.title);
        formData.append('resource_type', resourceData.resource_type);
        formData.append('is_public', resourceData.is_public.toString());

        if (resourceData.description) {
          formData.append('description', resourceData.description);
        }
        if (resourceData.subject_id) {
          formData.append('subject_id', resourceData.subject_id.toString());
        }

        const response = await api.post(`/classes/${classId}/resources`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        const response = await api.post(`/classes/${classId}/resources`, resourceData);
        return response.data;
      }
    } catch (error) {
      console.error(`Error creating resource for class ${classId}:`, error);
      throw error;
    }
  },

  // Update a class resource
  updateClassResource: async (classId: number, resourceId: number, resourceData: Partial<ResourceData>, file?: File): Promise<{ resource: ClassResource }> => {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        Object.entries(resourceData).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value.toString());
          }
        });

        const response = await api.put(`/classes/${classId}/resources/${resourceId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        const response = await api.put(`/classes/${classId}/resources/${resourceId}`, resourceData);
        return response.data;
      }
    } catch (error) {
      console.error(`Error updating resource ${resourceId} for class ${classId}:`, error);
      throw error;
    }
  },

  // Delete a class resource
  deleteClassResource: async (classId: number, resourceId: number): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/classes/${classId}/resources/${resourceId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting resource ${resourceId} for class ${classId}:`, error);
      throw error;
    }
  },

  startLessonBroadcast: async (classId: number, lessonId: number): Promise<StandardApiResponse<LessonBroadcast>> => {
    try {
      const response = await api.post(`/classes/${classId}/lessons/${lessonId}/broadcast/start`);
      return ApiResponseStandardizer.standardizeSingleResponse<LessonBroadcast>(response, 'broadcast');
    } catch (error) {
      console.error(`Error starting broadcast for lesson ${lessonId} in class ${classId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  endLessonBroadcast: async (classId: number, lessonId: number): Promise<StandardApiResponse<LessonBroadcast>> => {
    try {
      const response = await api.post(`/classes/${classId}/lessons/${lessonId}/broadcast/end`);
      return ApiResponseStandardizer.standardizeSingleResponse<LessonBroadcast>(response, 'broadcast');
    } catch (error) {
      console.error(`Error ending broadcast for lesson ${lessonId} in class ${classId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  getLessonLiveStats: async (classId: number, lessonId: number): Promise<StandardApiResponse<LiveLessonStats>> => {
    try {
      const response = await api.get(`/classes/${classId}/lessons/${lessonId}/live-stats`);
      return ApiResponseStandardizer.standardizeSingleResponse<LiveLessonStats>(response, 'stats');
    } catch (error) {
      console.error(`Error fetching live stats for lesson ${lessonId} in class ${classId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  uploadLessonAttachment: async (
    lessonId: number,
    payload: File | LinkPayload
  ): Promise<StandardApiResponse<LessonAttachment>> => {
    try {
      if (payload instanceof File) {
        const formData = new FormData();
        formData.append('file', payload);
        formData.append('attachment_type', 'file');
        formData.append('filename', payload.name);

        const response = await api.post(`/lessons/${lessonId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return ApiResponseStandardizer.standardizeSingleResponse<LessonAttachment>(response, 'attachment');
      } else {
        const response = await api.post(`/lessons/${lessonId}/attachments`, {
          ...payload,
          attachment_type: 'link',
        });
        return ApiResponseStandardizer.standardizeSingleResponse<LessonAttachment>(response, 'attachment');
      }
    } catch (error) {
      console.error(`Error uploading attachment for lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  getLessonAttachmentSignedUrl: async (
    lessonId: number,
    attachmentId: number
  ): Promise<StandardApiResponse<{ signed_url: string; expires_at: string }>> => {
    try {
      const response = await api.get(`/lessons/${lessonId}/attachments/${attachmentId}/signed-url`);
      return ApiResponseStandardizer.standardizeSingleResponse<{ signed_url: string; expires_at: string }>(response);
    } catch (error) {
      console.error(`Error fetching signed URL for attachment ${attachmentId} in lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  acknowledgeLesson: async (
    lessonId: number,
    payload: AcknowledgeLessonPayload
  ): Promise<StandardApiResponse<LessonAcknowledgement>> => {
    try {
      const response = await api.post(`/lessons/${lessonId}/acknowledge`, payload);
      return ApiResponseStandardizer.standardizeSingleResponse<LessonAcknowledgement>(response, 'acknowledgement');
    } catch (error) {
      console.error(`Error acknowledging lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  getLessonAcknowledgements: async (lessonId: number): Promise<StandardPaginatedResponse<LessonAcknowledgement>> => {
    try {
      const response = await api.get(`/lessons/${lessonId}/acknowledgements`);
      return ApiResponseStandardizer.standardizePaginatedResponse<LessonAcknowledgement>(
        response,
        'acknowledgements'
      );
    } catch (error) {
      console.error(`Error fetching acknowledgements for lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  createLessonComment: async (
    lessonId: number,
    body: CreateLessonCommentPayload
  ): Promise<StandardApiResponse<LessonComment>> => {
    try {
      const response = await api.post(`/lessons/${lessonId}/comments`, body);
      return ApiResponseStandardizer.standardizeSingleResponse<LessonComment>(response, 'comment');
    } catch (error) {
      console.error(`Error creating comment for lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  getLessonComments: async (
    lessonId: number,
    page: number = 1
  ): Promise<StandardPaginatedResponse<LessonComment>> => {
    try {
      const response = await api.get(`/lessons/${lessonId}/comments`, { params: { page, per_page: 50 } });
      return ApiResponseStandardizer.standardizePaginatedResponse<LessonComment>(response, 'comments');
    } catch (error) {
      console.error(`Error fetching comments for lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  approveLessonComment: async (commentId: number): Promise<StandardApiResponse<LessonComment>> => {
    try {
      const response = await api.post(`/lessons/comments/${commentId}/approve`);
      return ApiResponseStandardizer.standardizeSingleResponse<LessonComment>(response, 'comment');
    } catch (error) {
      console.error(`Error approving comment ${commentId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  deleteLessonComment: async (commentId: number): Promise<StandardApiResponse<void>> => {
    try {
      const response = await api.delete(`/lessons/comments/${commentId}`);
      return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting comment ${commentId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  getLessonMonitoringKpis: async (filters: MonitoringKpiFilters): Promise<StandardApiResponse<LessonMonitoringKpis>> => {
    try {
      const response = await api.get('/classes/lesson-monitoring/kpis', { params: filters });
      return ApiResponseStandardizer.standardizeSingleResponse<LessonMonitoringKpis>(response, 'kpis');
    } catch (error) {
      console.error('Error fetching lesson monitoring KPIs:', error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  sendTeacherReminder: async (
    lessonId: number,
    payload: { channels: ('email' | 'sms' | 'app')[]; message?: string }
  ): Promise<StandardApiResponse<{ sent: boolean; channels: string[] }>> => {
    try {
      const response = await api.post(`/lessons/${lessonId}/remind-teacher`, payload);
      return ApiResponseStandardizer.standardizeSingleResponse(response);
    } catch (error) {
      console.error(`Error sending reminder for lesson ${lessonId}:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },

  escalateToPrincipal: async (
    lessonId: number,
    payload: { note?: string }
  ): Promise<StandardApiResponse<{ escalated: boolean; principal_notified: boolean }>> => {
    try {
      const response = await api.post(`/lessons/${lessonId}/escalate-principal`, payload);
      return ApiResponseStandardizer.standardizeSingleResponse(response);
    } catch (error) {
      console.error(`Error escalating lesson ${lessonId} to principal:`, error);
      throw ApiResponseStandardizer.handleApiError(error);
    }
  },
};

export { classService };
export default classService;
