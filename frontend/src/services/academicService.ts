import api from '../lib/api';

// Define pagination interfaces
export interface Pagination {
  total: number;
  pages?: number;
  page?: number;
  per_page: number;
  total_pages?: number;
  current_page?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface StandardPaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  success: boolean;
  message?: string;
}

// Legacy interface - kept for backward compatibility but deprecated
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  success?: boolean;
  message?: string;
  // Legacy fields (optional for backward compatibility)
  total?: number;
  total_pages?: number;
  current_page?: number;
  per_page?: number;
}

// Academic interfaces
export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: number;
  name: string;
  academic_year_id: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: number;
  name: string;
  level: string;
  grade_level?: string;
  room_number?: string;
  status?: string;
  capacity: number;
  current_enrollment: number;
  class_teacher_id?: number;
  academic_year_id: number;
  created_at: string;
  updated_at: string;
  class_teacher_name?: string;
  academic_year_name?: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  credit_hours: number;
  department?: string;
  is_core: boolean;
  created_at: string;
  updated_at: string;
}

export interface Curriculum {
  id: number;
  name: string;
  description?: string;
  academic_year_id: number;
  class_id: number;
  subjects: Subject[];
  created_at: string;
  updated_at: string;
  academic_year_name?: string;
  class_name?: string;
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  content?: string;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  subject_name?: string;
  teacher_name?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  class_id: number;
  teacher_id: number;
  created_at: string;
  updated_at: string;
  class_name?: string;
  teacher_name?: string;
}

export interface Resource {
  id: number;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  class_id: number;
  teacher_id: number;
  created_at: string;
  updated_at: string;
  class_name?: string;
  teacher_name?: string;
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  full_name: string;
  admission_number: string;
  email?: string;
  phone?: string;
  status: string;
  gender: string;
  date_of_birth: string;
  profile_picture?: string;
}

export interface ClassFilters {
  academic_year_id?: number;
  class_teacher_id?: number;
  level?: string;
  page?: number;
  per_page?: number;
  grade_level?: string;
  academic_year?: string;
}

export interface SubjectFilters {
  department?: string;
  is_active?: boolean;
  is_core?: boolean;
  class_id?: number;
  page?: number;
  per_page?: number;
}

export interface CurriculumFilters {
  academic_year_id?: number;
  class_id?: number;
  page?: number;
  per_page?: number;
}

export interface LessonFilters {
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface AnnouncementFilters {
  class_id?: number;
  teacher_id?: number;
  page?: number;
  per_page?: number;
}

export interface ResourceFilters {
  class_id?: number;
  teacher_id?: number;
  page?: number;
  per_page?: number;
}

const academicService = {
  // Academic Years
  getAcademicYears: async (): Promise<AcademicYear[]> => {
    try {
      const response = await api.get('/academic-years');
      return response.data;
    } catch (error) {
      console.error('Error fetching academic years:', error);
      throw error;
    }
  },

  getCurrentAcademicYear: async (): Promise<AcademicYear> => {
    try {
      const response = await api.get('/academic-years/current');
      return response.data;
    } catch (error) {
      console.error('Error fetching current academic year:', error);
      throw error;
    }
  },

  createAcademicYear: async (yearData: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at'>): Promise<AcademicYear> => {
    try {
      const response = await api.post('/academic-years', yearData);
      return response.data;
    } catch (error) {
      console.error('Error creating academic year:', error);
      throw error;
    }
  },

  // Terms
  getTerms: async (academicYearId?: number): Promise<Term[]> => {
    try {
      const params = academicYearId ? { academic_year_id: academicYearId } : {};
      const response = await api.get('/terms', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching terms:', error);
      throw error;
    }
  },

  getCurrentTerm: async (): Promise<Term> => {
    try {
      const response = await api.get('/terms/current');
      return response.data;
    } catch (error) {
      console.error('Error fetching current term:', error);
      throw error;
    }
  },

  // Classes
  getClasses: async (filters: ClassFilters = {}): Promise<PaginatedResponse<Class>> => {
    try {
      const response = await api.get('/classes', { params: filters });
      if (response.data.success) {
        return {
            data: response.data.classes,
            pagination: {
                total: response.data.pagination.total,
                total_pages: response.data.pagination.pages,
                current_page: response.data.pagination.page,
                per_page: response.data.pagination.per_page,
            }
        };
      }
      return { 
          data: [], 
          pagination: {
              total: 0, 
              total_pages: 0,
              current_page: 1, 
              per_page: 20
          } 
      };
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  },

  getClassById: async (id: number): Promise<Class> => {
    try {
      const response = await api.get(`/classes/${id}`);
      if (response.data.success) {
          return response.data.class;
      }
      throw new Error(response.data.message || 'Failed to fetch class');
    } catch (error) {
      console.error(`Error fetching class ${id}:`, error);
      throw error;
    }
  },

  createClass: async (classData: Omit<Class, 'id' | 'created_at' | 'updated_at' | 'current_enrollment'>): Promise<Class> => {
    try {
      const response = await api.post('/classes', classData);
      if (response.data.success) {
          return response.data.class;
      }
      throw new Error(response.data.message || 'Failed to create class');
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  },

  updateClass: async (id: number, classData: Partial<Class>): Promise<Class> => {
    try {
      const response = await api.put(`/classes/${id}`, classData);
      if (response.data.success) {
          return response.data.class;
      }
      throw new Error(response.data.message || 'Failed to update class');
    } catch (error) {
      console.error(`Error updating class ${id}:`, error);
      throw error;
    }
  },

  deleteClass: async (id: number): Promise<void> => {
    try {
      const response = await api.delete(`/classes/${id}`);
      if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error(`Error deleting class ${id}:`, error);
      throw error;
    }
  },
  
  assignTeacherToClass: async (classId: number, teacherId: number): Promise<Class> => {
    try {
        const response = await api.put(`/classes/${classId}/assign-teacher`, { teacher_id: teacherId });
        if (response.data.success) {
            return response.data.class;
        }
        throw new Error(response.data.message || 'Failed to assign teacher');
    } catch (error) {
        console.error(`Error assigning teacher to class ${classId}:`, error);
        throw error;
    }
  },

  // Subjects
  getSubjects: async (filters: SubjectFilters = {}): Promise<PaginatedResponse<Subject>> => {
    try {
      const response = await api.get('/subjects', { params: filters });
      if (response.data.success) {
        return {
            data: response.data.subjects,
            pagination: {
                total: response.data.pagination.total,
                total_pages: response.data.pagination.pages,
                current_page: response.data.pagination.page,
                per_page: response.data.pagination.per_page,
            }
        };
      }
      return { 
          data: [], 
          pagination: {
              total: 0, 
              total_pages: 0,
              current_page: 1, 
              per_page: 20
          } 
      };
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },

  getSubjectById: async (id: number): Promise<Subject> => {
    try {
      const response = await api.get(`/subjects/${id}`);
      if (response.data.success) {
          return response.data.subject;
      }
      throw new Error(response.data.message || 'Failed to fetch subject');
    } catch (error) {
      console.error(`Error fetching subject ${id}:`, error);
      throw error;
    }
  },

  createSubject: async (subjectData: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> => {
    try {
      const response = await api.post('/subjects', subjectData);
      if (response.data.success) {
          return response.data.subject;
      }
      throw new Error(response.data.message || 'Failed to create subject');
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  },

  updateSubject: async (id: number, subjectData: Partial<Subject>): Promise<Subject> => {
    try {
      const response = await api.put(`/subjects/${id}`, subjectData);
      if (response.data.success) {
          return response.data.subject;
      }
      throw new Error(response.data.message || 'Failed to update subject');
    } catch (error) {
      console.error(`Error updating subject ${id}:`, error);
      throw error;
    }
  },

  deleteSubject: async (id: number): Promise<void> => {
    try {
      const response = await api.delete(`/subjects/${id}`);
      if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete subject');
      }
    } catch (error) {
      console.error(`Error deleting subject ${id}:`, error);
      throw error;
    }
  },
  
  assignTeacherToSubject: async (subjectId: number, teacherId: number, isPrimary: boolean = false): Promise<Subject> => {
      try {
          const response = await api.put(`/subjects/${subjectId}/assign-teacher`, { 
              teacher_id: teacherId,
              is_primary: isPrimary
          });
          if (response.data.success) {
              return response.data.subject;
          }
          throw new Error(response.data.message || 'Failed to assign teacher to subject');
      } catch (error) {
          console.error(`Error assigning teacher to subject ${subjectId}:`, error);
          throw error;
      }
  },
  
  removeTeacherFromSubject: async (subjectId: number, teacherId: number): Promise<Subject> => {
      try {
          const response = await api.put(`/subjects/${subjectId}/remove-teacher`, { teacher_id: teacherId });
          if (response.data.success) {
              return response.data.subject;
          }
          throw new Error(response.data.message || 'Failed to remove teacher from subject');
      } catch (error) {
          console.error(`Error removing teacher from subject ${subjectId}:`, error);
          throw error;
      }
  },

  // Curriculum
  getCurriculum: async (filters: CurriculumFilters = {}): Promise<PaginatedResponse<Curriculum>> => {
    try {
      const response = await api.get('/curriculum', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching curriculum:', error);
      throw error;
    }
  },

  getCurriculumById: async (id: number): Promise<Curriculum> => {
    try {
      const response = await api.get(`/curriculum/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching curriculum ${id}:`, error);
      throw error;
    }
  },

  createCurriculum: async (curriculumData: Omit<Curriculum, 'id' | 'created_at' | 'updated_at' | 'subjects'>): Promise<Curriculum> => {
    try {
      const response = await api.post('/curriculum', curriculumData);
      return response.data;
    } catch (error) {
      console.error('Error creating curriculum:', error);
      throw error;
    }
  },

  updateCurriculum: async (id: number, curriculumData: Partial<Curriculum>): Promise<Curriculum> => {
    try {
      const response = await api.put(`/curriculum/${id}`, curriculumData);
      return response.data;
    } catch (error) {
      console.error(`Error updating curriculum ${id}:`, error);
      throw error;
    }
  },

  deleteCurriculum: async (id: number): Promise<void> => {
    try {
      await api.delete(`/curriculum/${id}`);
    } catch (error) {
      console.error(`Error deleting curriculum ${id}:`, error);
      throw error;
    }
  },

  // Class-Subject assignments
  assignSubjectToClass: async (classId: number, subjectId: number): Promise<void> => {
    try {
      await api.post(`/classes/${classId}/subjects/${subjectId}`);
    } catch (error) {
      console.error(`Error assigning subject ${subjectId} to class ${classId}:`, error);
      throw error;
    }
  },

  removeSubjectFromClass: async (classId: number, subjectId: number): Promise<void> => {
    try {
      await api.delete(`/classes/${classId}/subjects/${subjectId}`);
    } catch (error) {
      console.error(`Error removing subject ${subjectId} from class ${classId}:`, error);
      throw error;
    }
  },

  getClassSubjects: async (class_id: number): Promise<Subject[]> => {
    try {
      const response = await api.get(`/classes/${class_id}/subjects`);
      if (response.data.success && response.data.subjects) {
          return response.data.subjects;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching subjects for class ${class_id}:`, error);
      throw error;
    }
  },

  getStudentsByClass: async (class_id: number, filters: { page?: number, per_page?: number } = {}): Promise<PaginatedResponse<Student>> => {
    try {
      const response = await api.get('/students', { params: { ...filters, class_id } });
      if (response.data.success) {
        return {
          data: response.data.students,
          pagination: {
            total: response.data.pagination.total,
            total_pages: response.data.pagination.pages,
            current_page: response.data.pagination.page,
            per_page: response.data.pagination.per_page,
          }
        };
      }
      return {
        data: [],
        pagination: {
          total: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 20
        }
      };
    } catch (error) {
      console.error(`Error fetching students for class ${class_id}:`, error);
      throw error;
    }
  },
  
  // Lessons
  getLessonsByClass: async (classId: number, filters: { page?: number, per_page?: number } = {}): Promise<PaginatedResponse<Lesson>> => {
      try {
          const response = await api.get(`/classes/${classId}/lessons`, { params: filters });
          if (response.data.success) {
              return {
                  data: response.data.lessons,
                  pagination: {
                      total: response.data.pagination.total,
                      total_pages: response.data.pagination.pages,
                      current_page: response.data.pagination.page,
                      per_page: response.data.pagination.per_page,
                  }
              };
          }
          return { 
              data: [], 
              pagination: {
                  total: 0, 
                  total_pages: 0,
                  current_page: 1, 
                  per_page: 20
              } 
          };
      } catch (error) {
          console.error(`Error fetching lessons for class ${classId}:`, error);
          throw error;
      }
  },
  
  createLesson: async (classId: number, lessonData: Partial<Lesson>): Promise<Lesson> => {
      try {
          const response = await api.post(`/classes/${classId}/lessons`, lessonData);
          if (response.data.success) {
              return response.data.lesson;
          }
          throw new Error(response.data.message || 'Failed to create lesson');
      } catch (error) {
          console.error('Error creating lesson:', error);
          throw error;
      }
  },
  
  updateLesson: async (classId: number, lessonId: number, lessonData: Partial<Lesson>): Promise<Lesson> => {
      try {
          const response = await api.put(`/classes/${classId}/lessons/${lessonId}`, lessonData);
          if (response.data.success) {
              return response.data.lesson;
          }
          throw new Error(response.data.message || 'Failed to update lesson');
      } catch (error) {
          console.error(`Error updating lesson ${lessonId}:`, error);
          throw error;
      }
  },
  
  deleteLesson: async (classId: number, lessonId: number): Promise<void> => {
      try {
          const response = await api.delete(`/classes/${classId}/lessons/${lessonId}`);
          if (!response.data.success) {
              throw new Error(response.data.message || 'Failed to delete lesson');
          }
      } catch (error) {
          console.error(`Error deleting lesson ${lessonId}:`, error);
          throw error;
      }
  },
  
  // Announcements
  getAnnouncementsByClass: async (classId: number, filters: { page?: number, per_page?: number } = {}): Promise<PaginatedResponse<Announcement>> => {
      try {
          const response = await api.get(`/classes/${classId}/announcements`, { params: filters });
          if (response.data.success) {
              return {
                  data: response.data.announcements,
                  pagination: {
                      total: response.data.pagination.total,
                      total_pages: response.data.pagination.pages,
                      current_page: response.data.pagination.page,
                      per_page: response.data.pagination.per_page,
                  }
              };
          }
          return { 
              data: [], 
              pagination: {
                  total: 0, 
                  total_pages: 0,
                  current_page: 1, 
                  per_page: 20
              } 
          };
      } catch (error) {
          console.error(`Error fetching announcements for class ${classId}:`, error);
          throw error;
      }
  },
  
  createAnnouncement: async (classId: number, announcementData: Partial<Announcement>): Promise<Announcement> => {
      try {
          const response = await api.post(`/classes/${classId}/announcements`, announcementData);
          if (response.data.success) {
              return response.data.announcement;
          }
          throw new Error(response.data.message || 'Failed to create announcement');
      } catch (error) {
          console.error('Error creating announcement:', error);
          throw error;
      }
  },
  
  updateAnnouncement: async (classId: number, announcementId: number, announcementData: Partial<Announcement>): Promise<Announcement> => {
      try {
          const response = await api.put(`/classes/${classId}/announcements/${announcementId}`, announcementData);
          if (response.data.success) {
              return response.data.announcement;
          }
          throw new Error(response.data.message || 'Failed to update announcement');
      } catch (error) {
          console.error(`Error updating announcement ${announcementId}:`, error);
          throw error;
      }
  },
  
  deleteAnnouncement: async (classId: number, announcementId: number): Promise<void> => {
      try {
          const response = await api.delete(`/classes/${classId}/announcements/${announcementId}`);
          if (!response.data.success) {
              throw new Error(response.data.message || 'Failed to delete announcement');
          }
      } catch (error) {
          console.error(`Error deleting announcement ${announcementId}:`, error);
          throw error;
      }
  },
  
  // Resources
  getResourcesByClass: async (classId: number, filters: { page?: number, per_page?: number } = {}): Promise<PaginatedResponse<Resource>> => {
      try {
          const response = await api.get(`/classes/${classId}/resources`, { params: filters });
          if (response.data.success) {
              return {
                  data: response.data.resources,
                  pagination: {
                      total: response.data.pagination.total,
                      total_pages: response.data.pagination.pages,
                      current_page: response.data.pagination.page,
                      per_page: response.data.pagination.per_page,
                  }
              };
          }
          return { 
              data: [], 
              pagination: {
                  total: 0, 
                  total_pages: 0,
                  current_page: 1, 
                  per_page: 20
              } 
          };
      } catch (error) {
          console.error(`Error fetching resources for class ${classId}:`, error);
          throw error;
      }
  },
  
  createResource: async (classId: number, resourceData: Partial<Resource> | FormData): Promise<Resource> => {
      try {
          const config = resourceData instanceof FormData 
              ? { headers: { 'Content-Type': 'multipart/form-data' } }
              : {};
              
          const response = await api.post(`/classes/${classId}/resources`, resourceData, config);
          if (response.data.success) {
              return response.data.resource;
          }
          throw new Error(response.data.message || 'Failed to create resource');
      } catch (error) {
          console.error('Error creating resource:', error);
          throw error;
      }
  },
  
  updateResource: async (classId: number, resourceId: number, resourceData: Partial<Resource> | FormData): Promise<Resource> => {
      try {
          const config = resourceData instanceof FormData 
              ? { headers: { 'Content-Type': 'multipart/form-data' } }
              : {};
              
          const response = await api.put(`/classes/${classId}/resources/${resourceId}`, resourceData, config);
          if (response.data.success) {
              return response.data.resource;
          }
          throw new Error(response.data.message || 'Failed to update resource');
      } catch (error) {
          console.error(`Error updating resource ${resourceId}:`, error);
          throw error;
      }
  },
  
  deleteResource: async (classId: number, resourceId: number): Promise<void> => {
      try {
          const response = await api.delete(`/classes/${classId}/resources/${resourceId}`);
          if (!response.data.success) {
              throw new Error(response.data.message || 'Failed to delete resource');
          }
      } catch (error) {
          console.error(`Error deleting resource ${resourceId}:`, error);
          throw error;
      }
  },

  getStandardGradeLevels: async (): Promise<any[]> => {
    try {
      const response = await api.get('/academics/standard-grade-levels');
      return response.data.success ? response.data.levels : [];
    } catch (error) {
      console.error('Error fetching standard grade levels:', error);
      throw error;
    }
  }
};

export { academicService };
export default academicService;
