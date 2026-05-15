/**
 * API Response Standardizer
 * Ensures consistent response format across all API services
 */

import type { Pagination, StandardApiResponse, StandardPaginatedResponse } from '@/types/api-responses.types';

export type { Pagination, StandardApiResponse, StandardPaginatedResponse };

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]> | undefined;
  success: boolean;

  constructor(message: string, status: number, success: boolean = false, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.success = success;
    this.errors = errors;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Standardizes API responses to ensure consistent format
 */
export class ApiResponseStandardizer {
  /**
   * Standardizes a single item response
   */
  static standardizeSingleResponse<T>(response: any, itemKey?: string): StandardApiResponse<T> {
    // Handle different response formats
    if (response.data) {
      // If response already has data wrapper
      if (itemKey && response.data[itemKey]) {
        return {
          data: response.data[itemKey],
          success: response.data.success ?? true,
          message: response.data.message,
          errors: response.data.errors
        };
      }

      // If response.data is the actual item
      if (!response.data.success && !response.data.message && !itemKey) {
        return {
          data: response.data,
          success: true
        };
      }

      return {
        data: response.data,
        success: response.data.success ?? true,
        message: response.data.message,
        errors: response.data.errors
      };
    }

    // If response is the item itself
    return {
      data: response,
      success: true
    };
  }

  /**
   * Standardizes a paginated response
   */
  static standardizePaginatedResponse<T>(response: any, itemsKey?: string): StandardPaginatedResponse<T> {
    let items: T[] = [];
    let pagination: Pagination = {
      total: 0,
      total_pages: 0,
      current_page: 1,
      per_page: 10,
      has_next: false,
      has_prev: false
    };

    if (response.data) {
      // Extract items
      if (itemsKey && response.data[itemsKey]) {
        items = response.data[itemsKey];
      } else if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        items = response.data.data;
      }

      // Extract pagination
      if (response.data.pagination) {
        const total_pages = response.data.pagination.total_pages || 0;
        const current_page = response.data.pagination.current_page || 1;
        pagination = {
          total: response.data.pagination.total || 0,
          total_pages,
          current_page,
          per_page: response.data.pagination.per_page || 10,
          has_next: response.data.pagination.has_next ?? (total_pages > 0 ? current_page < total_pages : false),
          has_prev: response.data.pagination.has_prev ?? (current_page > 1)
        };
      }
    }

    return {
      data: items,
      pagination,
      success: response.data?.success ?? true,
      message: response.data?.message
    };
  }

  /**
   * Handles API errors consistently
   */
  static handleApiError(error: any): never {
    if (error.response) {
      const { data, status } = error.response;

      // Extract the actual backend message - prioritize data.message
      let message = 'Unknown error occurred';
      if (data?.message) {
        message = data.message;
      } else if (typeof data === 'string') {
        message = data;
      } else {
        message = `HTTP ${status} Error`;
      }

      throw new ApiError(message, status, false, data?.errors);
    }

    throw new ApiError(error.message || 'Network error occurred', 0, false);
  }
}

/**
 * Response format validators
 */
export class ResponseValidator {
  static isValidPaginatedResponse(response: any): boolean {
    return (
      response &&
      response.data &&
      Array.isArray(response.data) &&
      response.pagination &&
      typeof response.pagination.total === 'number'
    );
  }

  static isValidSingleResponse(response: any): boolean {
    return response && response.data;
  }
}
