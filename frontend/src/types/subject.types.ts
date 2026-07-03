export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  department?: string;
  department_name?: string | null;
  credit_hours?: number;
  is_active: boolean;
  classes?: Array<{ id: number; name: string }>;
  teachers?: Array<{ id: number; name: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectFilters {
  search?: string;
  department?: string;
  is_active?: boolean;
  class_id?: number;
  page?: number;
  per_page?: number;
}

export interface PaginationMeta {
  total: number;
  pages: number;
  page: number;
  per_page: number;
  next?: number | null;
  prev?: number | null;
}
