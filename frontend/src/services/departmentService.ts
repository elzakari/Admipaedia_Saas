import { api } from '@/lib/api';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  head_id?: number;
  is_active: boolean;
  subjects_count?: number;
  staff_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const departmentService = {
  getAllDepartments: async (): Promise<Department[]> => {
    const response = await api.get('/departments');
    return response.data.data;
  },

  getDepartmentById: async (id: number): Promise<Department> => {
    const response = await api.get(`/departments/${id}`);
    return response.data.data;
  },

  createDepartment: async (department: Partial<Department>): Promise<Department> => {
    const response = await api.post('/departments', department);
    return response.data.data;
  },

  updateDepartment: async (department: Partial<Department> & { id: number }): Promise<Department> => {
    const { id, ...data } = department;
    const response = await api.put(`/departments/${id}`, data);
    return response.data.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  // Additional methods for department staff management
  addStaffToDepartment: async (departmentId: number, userId: number, role?: string): Promise<void> => {
    await api.post(`/departments/${departmentId}/staff`, { user_id: userId, role });
  },

  removeStaffFromDepartment: async (departmentId: number, userId: number): Promise<void> => {
    await api.delete(`/departments/${departmentId}/staff/${userId}`);
  },
};

export default departmentService;
