// Create new types for curriculum planning
export interface Curriculum {
  id: number;
  title: string;
  description?: string;
  grade_level: string;
  subject_id: number;
  academic_year: string;
  created_by: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  subject_name?: string;
}

export interface CurriculumUnit {
  id: number;
  curriculum_id: number;
  title: string;
  description?: string;
  objectives?: string;
  resources?: string;
  duration_weeks: number;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

export interface CurriculumCreate {
  title: string;
  description?: string;
  grade_level: string;
  subject_id: number;
  academic_year: string;
}

export interface CurriculumUnitCreate {
  curriculum_id: number;
  title: string;
  description?: string;
  objectives?: string;
  resources?: string;
  duration_weeks: number;
  sequence_order: number;
}