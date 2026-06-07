/**
 * Academic Structure / Department service
 * ----------------------------------------
 * Handles the unified polymorphic /departments (and /structures) API.
 *
 * All old departmentService imports continue to work via the re-exports
 * at the bottom of this file.
 */
import api from '@/lib/api';
import type {
  AcademicStructure,
  AcademicStructureCreate,
  AcademicStructureUpdate,
  AcademicStructureFilters,
  AcademicStructureType,
} from '@/types/academic_structure.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildParams(filters?: AcademicStructureFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters?.structure_type) p.structure_type = filters.structure_type;
  if (filters?.is_active !== undefined) p.is_active = String(filters.is_active);
  return p;
}

// ── Core service ──────────────────────────────────────────────────────────────

export const academicStructureService = {

  /** List all structures, optionally filtered by type / active state */
  getAll: async (filters?: AcademicStructureFilters): Promise<AcademicStructure[]> => {
    const response = await api.get('/departments', { params: buildParams(filters) });
    return response.data.data ?? [];
  },

  /** Fetch only DISCIPLINE-type structures (for Subject-form dropdowns) */
  getDisciplines: async (): Promise<AcademicStructure[]> =>
    academicStructureService.getAll({ structure_type: 'discipline', is_active: true }),

  /** Fetch only CYCLE-type structures (for Class/Level dropdowns) */
  getCycles: async (): Promise<AcademicStructure[]> =>
    academicStructureService.getAll({ structure_type: 'cycle', is_active: true }),

  /** Fetch only OPERATIONAL-type structures (for Staff/HR dropdowns) */
  getOperational: async (): Promise<AcademicStructure[]> =>
    academicStructureService.getAll({ structure_type: 'operational', is_active: true }),

  /** Fetch the enum values recognised by the API */
  getTypes: async (): Promise<{ value: AcademicStructureType; label: string }[]> => {
    const response = await api.get('/departments/types');
    return response.data.types ?? [];
  },

  getById: async (id: number): Promise<AcademicStructure> => {
    const response = await api.get(`/departments/${id}`);
    return response.data.data;
  },

  create: async (data: AcademicStructureCreate): Promise<AcademicStructure> => {
    const response = await api.post('/departments', data);
    return response.data.data;
  },

  update: async (id: number, data: AcademicStructureUpdate): Promise<AcademicStructure> => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  addStaff: async (id: number, userId: number, role?: string): Promise<void> => {
    await api.post(`/departments/${id}/staff`, { user_id: userId, role });
  },

  removeStaff: async (id: number, userId: number): Promise<void> => {
    await api.delete(`/departments/${id}/staff/${userId}`);
  },
};

// ── Backward-compat re-export ─────────────────────────────────────────────────
// Old code: `import { departmentService } from '@/services/departmentService'`
// continues to work without any changes.

export const departmentService = {
  getAllDepartments: () => academicStructureService.getDisciplines(),
  getDepartmentById: (id: number) => academicStructureService.getById(id),
  createDepartment: (d: AcademicStructureCreate) => academicStructureService.create(d),
  updateDepartment: (d: AcademicStructureUpdate & { id: number }) => {
    const { id, ...rest } = d;
    return academicStructureService.update(id, rest);
  },
  deleteDepartment: (id: number) => academicStructureService.delete(id),
  addStaffToDepartment: (deptId: number, userId: number, role?: string) =>
    academicStructureService.addStaff(deptId, userId, role),
  removeStaffFromDepartment: (deptId: number, userId: number) =>
    academicStructureService.removeStaff(deptId, userId),
};

export default departmentService;
