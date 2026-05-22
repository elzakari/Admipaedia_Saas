// Top-level imports
import api from '../lib/api';
import { Pagination, StandardApiResponse } from '../types';

// Define interfaces for parent data
export interface Parent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  children: ParentChild[];
  status: 'active' | 'inactive';
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParentChild {
  id: number;
  firstName: string;
  lastName: string;
  class: string;
  section?: string;
  age?: number;
  photo?: string;
  admissionNumber?: string;
}

export interface ParentCreate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  password?: string;
  status?: 'active' | 'inactive';
}

export interface ParentUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

// Module: parentService object and helpers
const parentService = {
  // Get all parents with pagination and filtering
  getParents: async (params?: {
    page?: number;
    per_page?: number;
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<StandardApiResponse<{ parents: Parent[]; pagination: Pagination }>> => {
    try {
      const response = await api.get('/parents', { params });
      const raw = response.data as StandardApiResponse<{ parents: any[]; pagination: Pagination }>;
      const transformedParents: Parent[] = Array.isArray(raw?.data?.parents)
        ? raw.data.parents.map(parentService.transformBackendParent)
        : [];
      return {
        ...raw,
        data: {
          parents: transformedParents,
          pagination: raw?.data?.pagination,
        },
      };
    } catch (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }
  },

  // Get a specific parent by ID
  getParentById: async (parentId: number): Promise<Parent> => {
    try {
      const response = await api.get(`/parents/${parentId}`);
      const backendParent = response.data.parent;
      return parentService.transformBackendParent(backendParent);
    } catch (error) {
      console.error(`Error fetching parent ${parentId}:`, error);
      throw error;
    }
  },

  // Create a new parent
  createParent: async (parentData: ParentCreate): Promise<Parent> => {
    try {
      const response = await api.post('/parents', parentData);
      const backendParent = response.data.parent;
      return parentService.transformBackendParent(backendParent);
    } catch (error) {
      console.error('Error creating parent:', error);
      throw error;
    }
  },

  // Update an existing parent
  updateParent: async (parentId: number, parentData: ParentUpdate): Promise<Parent> => {
    try {
      const response = await api.put(`/parents/${parentId}`, parentData);
      const backendParent = response.data.parent;
      return parentService.transformBackendParent(backendParent);
    } catch (error) {
      console.error(`Error updating parent ${parentId}:`, error);
      throw error;
    }
  },

  // Delete a parent
  deleteParent: async (parentId: number): Promise<void> => {
    try {
      await api.delete(`/parents/${parentId}`);
    } catch (error) {
      console.error(`Error deleting parent ${parentId}:`, error);
      throw error;
    }
  },

  getMyDashboard: async (): Promise<ParentDashboardData> => {
    const response = await api.get('/parents/dashboard')
    return (
      response.data?.data ||
      response.data?.dashboard ||
      response.data?.parent_dashboard ||
      response.data
    ) as ParentDashboardData
  },

  getMyChildren: async (): Promise<any[]> => {
    const response = await api.get('/parents/children')
    const data = response.data?.data || response.data
    return data?.children || []
  },

  getChildDetailedSummary: async (childId: number): Promise<ChildDetailedSummary> => {
    try {
      const response = await api.get(`/parents/children/${childId}/summary`);
      return (response.data?.data || response.data) as ChildDetailedSummary;
    } catch (error) {
      console.error(`Error fetching detailed summary for child ${childId}:`, error);
      throw error;
    }
  },


  // Get children for a parent
  getParentChildren: async (parentId: number): Promise<{ children: ParentChild[] }> => {
    try {
      const response = await api.get(`/parents/${parentId}/children`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching children for parent ${parentId}:`, error);
      throw error;
    }
  },

  // Get academic data for a child
  getChildAcademicData: async (childId: number): Promise<ChildAcademicData> => {
    try {
      const response = await api.get(`/parents/children/${childId}/academic`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching academic data for child ${childId}:`, error);
      throw error;
    }
  },

  // Get attendance data for a child
  getChildAttendanceData: async (childId: number, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ChildAttendanceData> => {
    try {
      const response = await api.get(`/parents/children/${childId}/attendance`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching attendance data for child ${childId}:`, error);
      throw error;
    }
  },

  // Get fee data for a child
  getChildFeeData: async (childId: number): Promise<ChildFeeData> => {
    try {
      const response = await api.get(`/parents/children/${childId}/fees`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching fee data for child ${childId}:`, error);
      throw error;
    }
  },

  // Get behavior data for a child
  getChildBehaviorData: async (childId: number): Promise<ChildBehaviorData> => {
    try {
      const response = await api.get(`/parents/children/${childId}/behavior`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching behavior data for child ${childId}:`, error);
      throw error;
    }
  },

  // Send message to teacher
  sendMessageToTeacher: async (data: {
    parentId: number;
    teacherId: number;
    subject: string;
    message: string;
  }): Promise<MessageData> => {
    try {
      const response = await api.post('/parents/messages', data);
      return response.data.message;
    } catch (error) {
      console.error('Error sending message to teacher:', error);
      throw error;
    }
  },

  // Submit a report
  submitReport: async (data: {
    parentId: number;
    childId: number;
    reportType: string;
    subject: string;
    description: string;
  }): Promise<{ success: boolean; reportId: number }> => {
    try {
      const response = await api.post('/parents/reports', data);
      return response.data;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  },

  // Link a student to a parent
  linkStudentToParent: async (studentId: number, parentId: number): Promise<{ success: boolean }> => {
    try {
      const response = await api.post('/parents/link-student', { studentId, parentId });
      return response.data;
    } catch (error) {
      console.error('Error linking student to parent:', error);
      throw error;
    }
  },

  // Add these methods to the parentService object
  
  // Get child homework data
  getChildHomeworkData: async (childId: number): Promise<Array<{
    id: number;
    title: string;
    subject: string;
    due_date: string;
    status: 'pending' | 'submitted' | 'graded';
    description?: string;
    score?: number;
  }>> => {
    try {
      const response = await api.get(`/parents/children/${childId}/homework`);
      return response.data.homework;
    } catch (error) {
      console.error(`Error fetching homework data for child ${childId}:`, error);
      throw error;
    }
  },

  // Get school events
  getSchoolEvents: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SchoolEvent[]> => {
    try {
      const response = await api.get('/parents/events', { params });
      return response.data.events;
    } catch (error) {
      console.error('Error fetching school events:', error);
      throw error;
    }
  },

  // Get parent messages
  getParentMessages: async (parentId: number): Promise<MessageData[]> => {
    try {
      const response = await api.get(`/parents/${parentId}/messages`);
      return response.data.messages;
    } catch (error) {
      console.error(`Error fetching messages for parent ${parentId}:`, error);
      throw error;
    }
  },

  // Get recent messages between parent and teacher
  getRecentMessages: async (parentId: number, teacherId: number): Promise<MessageData[]> => {
    try {
      const response = await api.get(`/parents/${parentId}/messages/recent`, {
        params: { teacherId }
      });
      return response.data.messages;
    } catch (error) {
      console.error(`Error fetching recent messages between parent ${parentId} and teacher ${teacherId}:`, error);
      throw error;
    }
  },

  // Get teachers for a specific class
  getTeachersForClass: async (classId: number): Promise<TeacherInfo[]> => {
    try {
      const response = await api.get(`/classes/${classId}/teachers`);
      return response.data.teachers;
    } catch (error) {
      console.error(`Error fetching teachers for class ${classId}:`, error);
      throw error;
    }
  },

  // Transform a backend parent into frontend Parent
  transformBackendParent: (backendParent: any): Parent => {
    const firstName =
      backendParent?.firstName ??
      backendParent?.first_name ??
      backendParent?.name ??
      '';
    const lastName =
      backendParent?.lastName ??
      backendParent?.last_name ??
      backendParent?.surname ??
      '';

    const childrenArray = Array.isArray(backendParent?.children)
      ? backendParent.children.map(parentService.transformBackendChild)
      : [];

    return {
      id: Number(backendParent?.id ?? backendParent?.parent_id ?? 0),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(backendParent?.email ?? backendParent?.email_address ?? ''),
      phone:
        backendParent?.phone ??
        backendParent?.phone_number ??
        backendParent?.telephone ??
        undefined,
      address:
        typeof backendParent?.address === 'string'
          ? backendParent.address
          : undefined,
      children: childrenArray,
      status: (backendParent?.status ?? 'active') as 'active' | 'inactive',
      profileImage:
        backendParent?.profileImage ?? backendParent?.profile_image ?? undefined,
      createdAt:
        backendParent?.createdAt ?? backendParent?.created_at ?? undefined,
      updatedAt:
        backendParent?.updatedAt ?? backendParent?.updated_at ?? undefined,
    };
  },

  // Transform a backend child record into ParentChild
  transformBackendChild: (backendChild: any): ParentChild => {
    const firstName =
      backendChild?.firstName ??
      backendChild?.first_name ??
      backendChild?.name ??
      '';
    const lastName =
      backendChild?.lastName ??
      backendChild?.last_name ??
      backendChild?.surname ??
      '';

    return {
      id: Number(backendChild?.id ?? backendChild?.student_id ?? 0),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      class:
        String(
          backendChild?.class ??
            backendChild?.class_name ??
            backendChild?.grade ??
            ''
        ),
      section: backendChild?.section ?? backendChild?.section_name ?? undefined,
      age: backendChild?.age ?? backendChild?.years ?? undefined,
      photo:
        backendChild?.photo ??
        backendChild?.profile_picture ??
        backendChild?.profileImage ??
        undefined,
      admissionNumber:
        backendChild?.admission_number ??
        backendChild?.studentId ??
        undefined,
    };
  },
};

export default parentService;

export interface ChildAcademicData {
  student_id: number;
  overall_grade: number;
  subject_grades: Array<{
    subject: string;
    grade: number;
    teacher: string;
  }>;
  recent_exams: Array<{
    exam_name: string;
    subject: string;
    score: number;
    date: string;
  }>;
  assignments: Array<{
    title: string;
    subject: string;
    due_date: string;
    status: 'pending' | 'submitted' | 'graded';
    score?: number;
  }>;
}

export interface ChildAttendanceData {
  student_id: number;
  overall_rate: number;
  monthly_breakdown: Array<{
    month: string;
    present_days: number;
    total_days: number;
    rate: number;
  }>;
  recent_absences: Array<{
    date: string;
    reason?: string;
    excused: boolean;
  }>;
}

export interface ChildFeeData {
  student_id: number;
  total_fees: number;
  paid_amount: number;
  pending_amount: number;
  fee_structure: Array<{
    category: string;
    amount: number;
    due_date: string;
    status: 'paid' | 'pending' | 'overdue';
  }>;
  payment_history: Array<{
    date: string;
    amount: number;
    method: string;
    receipt_number: string;
  }>;
}

export interface ChildBehaviorData {
  student_id: number;
  behavior_score: number;
  incidents: Array<{
    date: string;
    type: 'positive' | 'negative';
    description: string;
    teacher: string;
  }>;
  achievements: Array<{
    title: string;
    date: string;
    category: string;
  }>;
}

export interface MessageData {
  id: number;
  subject: string;
  message: string;
  sender: string;
  recipient: string;
  date: string;
  read: boolean;
}

export interface SchoolEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  type: 'academic' | 'sports' | 'cultural' | 'meeting';
  location?: string;
}

export interface TeacherInfo {
  id: number;
  name: string;
  subject: string;
  email: string;
  phone?: string;
}

export interface ParentDashboardData {
  children_count: number
  overall_attendance_rate: number
  overall_grade_average: number
  unread_notifications: number
  pending_fees_total?: number
  currency?: string
  active_applications?: number
  next_event?: {
    id: string
    title: string
    date: string | null
    type: string
    description?: string | null
  } | null
  recent_notifications?: Array<{
    id: string
    title: string
    message: string
    type: string
    read: boolean
    time: string | null
  }>
}

export interface ChildDetailedSummary {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  classroom: {
    name: string;
  };
  admission_no: string;
  rank: {
    position: number;
    total_students: number;
  };
  currency: string;
  summary: {
    academic_average: number | null;
    attendance_rate: number;
    pending_balance: number;
    fee_status: string;
    pending_assignments: number;
  };
}

