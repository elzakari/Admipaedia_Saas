/**
 * Standardized API Response Types
 * Aligned with backend ApiResponseStandardizer
 */

// Base API Response Interface
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

// Standard API Response Interface
export interface StandardApiResponse<T> extends BaseApiResponse {
  data: T;
  pagination?: Pagination;
}

// Paginated API Response Interface
export interface StandardPaginatedResponse<T> extends BaseApiResponse {
  data: T[];
  pagination: Pagination;
}

// Pagination Interface
export interface Pagination {
  total: number;
  total_pages: number;
  current_page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// API Error Response Interface
export interface ApiErrorResponse extends BaseApiResponse {
  success: false;
  error_code?: string;
  error_details?: Record<string, any>;
  status_code?: number;
}

// Validation Error Interface
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// File Upload Response Interface
export interface FileUploadResponse extends BaseApiResponse {
  data: {
    file_id: string;
    filename: string;
    file_size: number;
    file_type: string;
    upload_url?: string;
    download_url?: string;
  };
}

// Bulk Operation Response Interface
export interface BulkOperationResponse<T> extends BaseApiResponse {
  data: {
    successful: T[];
    failed: Array<{
      item: T;
      error: string;
    }>;
    summary: {
      total: number;
      successful_count: number;
      failed_count: number;
    };
  };
}