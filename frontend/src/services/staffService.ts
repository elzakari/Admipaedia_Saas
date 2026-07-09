import api from '../lib/api';

export interface StaffRecord {
  id: number;
  user_id?: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  job_title?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  phone_number?: string | null;
  joining_date?: string | null;
  status?: 'active' | 'inactive' | 'on_leave';
  email?: string | null;
  department_id?: number | null;
  department_name?: string | null;
}

export interface StaffDirectoryItem {
  id: number;
  entity_type: 'teacher' | 'staff';
  entity_key: string;
  name: string;
  position: string;
  department_name?: string | null;
  email?: string | null;
  phone?: string | null;
  join_date?: string | null;
  status?: string | null;
  employee_id?: string | null;
  department_id?: number | null;
}

export interface StaffAttendanceSummaryItem {
  entity_type: 'teacher' | 'staff';
  entity_id: number;
  entity_key: string;
  name: string;
  position: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

const staffService = {
  normalizeDirectoryItem(item: any): StaffDirectoryItem {
    const entityType = (item?.entity_type || item?.entityType || '').toString().toLowerCase() === 'teacher'
      ? 'teacher'
      : 'staff';
    return {
      id: Number(item?.id || 0),
      entity_type: entityType,
      entity_key: String(item?.entity_key || `${entityType}-${item?.id || 0}`),
      name: String(item?.name || item?.full_name || '').trim(),
      position: String(item?.position || (entityType === 'teacher' ? 'Teacher' : 'Staff')),
      department_name: item?.department_name || item?.departmentName || null,
      email: item?.email || null,
      phone: item?.phone || item?.phone_number || null,
      join_date: item?.join_date || item?.joinDate || item?.joining_date || null,
      status: item?.status || 'active',
      employee_id: item?.employee_id || item?.employeeId || null,
      department_id: item?.department_id || item?.departmentId || null,
    };
  },

  async getStaff(params?: { page?: number; per_page?: number; search?: string }) {
    const response = await api.get('/staff', { params });
    return {
      staff: response.data?.staff || [],
      pagination: response.data?.pagination || {},
    };
  },

  async getStaffById(staffId: number): Promise<StaffRecord> {
    const response = await api.get(`/staff/${staffId}`);
    return response.data?.staff;
  },

  async createStaff(payload: Partial<StaffRecord> & { email?: string }) {
    const response = await api.post('/staff', payload);
    return response.data?.staff;
  },

  async updateStaff(staffId: number, payload: Partial<StaffRecord>) {
    const response = await api.put(`/staff/${staffId}`, payload);
    return response.data?.staff;
  },

  async deleteStaff(staffId: number) {
    await api.delete(`/staff/${staffId}`);
  },

  async assignDepartment(staffId: number, payload: { department_id: number; role?: string }) {
    const response = await api.post(`/staff/${staffId}/assign-department`, payload);
    return response.data;
  },

  async getDirectory(search?: string): Promise<{ directory: StaffDirectoryItem[]; summary: Record<string, number> }> {
    const response = await api.get('/staff/directory', { params: search ? { search } : undefined });
    const directory = Array.isArray(response.data?.directory)
      ? response.data.directory.map((item: any) => staffService.normalizeDirectoryItem(item))
      : [];
    return {
      directory,
      summary: response.data?.summary || {
        total: directory.length,
        teachers: directory.filter((row: StaffDirectoryItem) => row.entity_type === 'teacher').length,
        staff: directory.filter((row: StaffDirectoryItem) => row.entity_type === 'staff').length,
        active: directory.filter((row: StaffDirectoryItem) => String(row.status || '').toLowerCase() === 'active').length,
      },
    };
  },

  async getAttendanceSummary(month: string): Promise<{ month: string; summary: StaffAttendanceSummaryItem[]; by_entity: Record<string, any[]> }> {
    const response = await api.get('/staff/attendance-summary', { params: { month } });
    return response.data?.data || { month, summary: [], by_entity: {} };
  },
};

export default staffService;
