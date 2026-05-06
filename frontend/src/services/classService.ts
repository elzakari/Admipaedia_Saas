import api from '../lib';
import { StandardPaginatedResponse, StandardApiResponse } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';

// classService types
export interface Class {
  id: number;
  name: string;
  grade_level: string;
  academic_year: string;
  section: string;
  capacity: number;
  current_enrollment: number;
  teacher_id?: number;
  class_teacher?: string;
  room_number?: string;
  room?: string;
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
  room?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
}

// Lesson data interface
export interface LessonData {
  title: string;
  description?: string;
  subject_id: number;
  date: string;
  start_time: string;
  end_time: string;
  lesson_type: 'regular' | 'exam' | 'practical' | 'field_trip';
  materials?: string[];
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  subject_id: number;
  date: string;
  start_time: string;
  end_time: string;
  lesson_type: 'regular' | 'exam' | 'practical' | 'field_trip';
  materials?: string[];
  created_at: string;
  updated_at: string;
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
  }
};

export { classService };
export default classService;