import api from '../lib/api';
import { rbacApi } from './rbacApi';
import type { AssignRoleRequest } from '../types/rbac';

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

export type StaffOrigin =
  | 'manual_teacher'
  | 'manual_staff'
  | 'teacher_invitation'
  | 'general_invitation'
  | 'parent_invitation';

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
  user_id?: number | null;
  role_names: string[];
  has_role: boolean;
  origin: StaffOrigin;
  has_login: boolean;
}

export interface StaffDirectorySummary {
  total: number;
  teachers: number;
  staff: number;
  active: number;
  general: number;
  without_role: number;
  with_role: number;
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
    const originRaw = String(item?.origin || (entityType === 'teacher' ? 'manual_teacher' : 'manual_staff'));
    const allowedOrigins: StaffOrigin[] = ['manual_teacher', 'manual_staff', 'teacher_invitation', 'general_invitation', 'parent_invitation'];
    const origin: StaffOrigin = allowedOrigins.includes(originRaw as StaffOrigin) ? originRaw as StaffOrigin : (entityType === 'teacher' ? 'manual_teacher' : 'manual_staff');
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
      user_id: item?.user_id ?? item?.userId ?? null,
      role_names: Array.isArray(item?.role_names) ? item.role_names.map(String) : Array.isArray(item?.roleNames) ? item.roleNames.map(String) : [],
      has_role: Boolean(item?.has_role ?? item?.hasRole ?? (Array.isArray(item?.role_names) ? item.role_names.length > 0 : false)),
      origin,
      has_login: Boolean(item?.has_login ?? item?.hasLogin ?? !!item?.user_id),
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

  async assignRoleToUser(userId: number, roleName: string, reason?: string) {
    const payload: AssignRoleRequest = { user_id: userId, role_name: roleName };
    if (reason) (payload as any).reason = reason;
    return await rbacApi.assignRole(payload);
  },

  async revokeRoleFromUser(userId: number, roleName: string) {
    return await rbacApi.revokeRole(userId, roleName);
  },

  async getUserRoles(userId: number) {
    return await rbacApi.getUserRoles(userId);
  },

  async getDirectory(params?: {
    search?: string;
    entity_type?: 'teacher' | 'staff' | 'general' | 'all';
    has_role?: boolean;
  }): Promise<{ directory: StaffDirectoryItem[]; summary: StaffDirectorySummary }> {
    const queryParams: Record<string, any> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.entity_type) queryParams.entity_type = params.entity_type;
    if (params?.has_role !== undefined) queryParams.has_role = params.has_role ? '1' : '0';
    const response = await api.get('/staff/directory', { params: Object.keys(queryParams).length ? queryParams : undefined });
    const directory = Array.isArray(response.data?.directory)
      ? response.data.directory.map((item: any) => staffService.normalizeDirectoryItem(item))
      : [];
    const s = response.data?.summary || {};
    const summary: StaffDirectorySummary = {
      total: Number(s.total ?? directory.length),
      teachers: Number(s.teachers ?? directory.filter((row) => row.entity_type === 'teacher').length),
      staff: Number(s.staff ?? directory.filter((row) => row.entity_type === 'staff').length),
      active: Number(s.active ?? directory.filter((row) => String(row.status || '').toLowerCase() === 'active').length),
      general: Number(s.general ?? directory.filter((row) => row.origin === 'general_invitation').length),
      without_role: Number(s.without_role ?? directory.filter((row) => !row.has_role).length),
      with_role: Number(s.with_role ?? directory.filter((row) => row.has_role).length),
    };
    return { directory, summary };
  },

  async getAttendanceSummary(month: string): Promise<{ month: string; summary: StaffAttendanceSummaryItem[]; by_entity: Record<string, any[]> }> {
    const response = await api.get('/staff/attendance-summary', { params: { month } });
    return response.data?.data || { month, summary: [], by_entity: {} };
  },
};

export default staffService;
