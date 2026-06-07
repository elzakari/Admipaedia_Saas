/**
 * Unified Academic Structure TypeScript types
 * Replaces the flat Department interface with a polymorphic AcademicStructure
 * that covers Disciplines, School Cycles, and Operational divisions.
 *
 * All old code that imports `Department` from this file continues to work
 * via the backward-compat alias at the bottom.
 */

// ── Discriminator enum ────────────────────────────────────────────────────────

export type AcademicStructureType =
  | 'discipline'    // subject-area grouping  (Mathematics, Sciences, Humanities)
  | 'cycle'         // school-level division  (Maternelle, Primary, Junior High, Lycée)
  | 'operational';  // administrative unit    (Finance, Admissions, IT, Maintenance)

export const ACADEMIC_STRUCTURE_TYPES: { value: AcademicStructureType; label: string }[] = [
  { value: 'discipline',   label: 'Academic Discipline' },
  { value: 'cycle',        label: 'School Cycle / Level' },
  { value: 'operational',  label: 'Operational Division' },
];

// ── Core interface ────────────────────────────────────────────────────────────

export interface AcademicStructure {
  id: number;
  name: string;
  code: string;
  description?: string;

  /** Polymorphic discriminator */
  structure_type: AcademicStructureType;

  /** FK to the head-of-department user */
  head_id?: number;

  /** Self-referential hierarchy (CYCLE inside CYCLE, DISCIPLINE inside DISCIPLINE) */
  parent_id?: number;
  display_order?: number;

  /** Subject count – populated by the API via Method field */
  subjects_count?: number;
  staff_count?: number;

  allocated_budget?: number;
  is_active: boolean;

  created_at?: string;
  updated_at?: string;
}

// ── Payload types for create / update ────────────────────────────────────────

export interface AcademicStructureCreate {
  name: string;
  code?: string;                        // auto-generated if omitted
  description?: string;
  structure_type?: AcademicStructureType; // defaults to 'discipline' on server
  head_id?: number;
  parent_id?: number;
  display_order?: number;
  allocated_budget?: number;
  is_active?: boolean;
}

export type AcademicStructureUpdate = Partial<AcademicStructureCreate>;

// ── Filter type for list queries ──────────────────────────────────────────────

export interface AcademicStructureFilters {
  structure_type?: AcademicStructureType;
  is_active?: boolean;
}

// ── Backward-compat aliases ───────────────────────────────────────────────────
// Code that imports `Department` from this file keeps compiling.

/** @deprecated Use AcademicStructure instead */
export type Department = AcademicStructure;

/** @deprecated Use AcademicStructureCreate instead */
export type DepartmentCreate = AcademicStructureCreate;

/** @deprecated Use AcademicStructureUpdate instead */
export type DepartmentUpdate = AcademicStructureUpdate;
