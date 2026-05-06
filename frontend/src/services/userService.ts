import { api } from '@/lib/api';
import { ApiResponseStandardizer, StandardApiResponse, StandardPaginatedResponse } from '@/lib/apiResponseStandardizer';

export interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login?: string;
    security_info?: {
        failed_login_attempts: number;
        last_password_change?: string;
        account_locked: boolean;
    };
}

export interface UserCreate {
    username: string;
    email: string;
    password?: string;
    role: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}

export interface UserUpdate {
    username?: string;
    email?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}

export interface UserSearchParams {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
    status?: 'active' | 'inactive' | 'all';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface BulkUserAction {
    user_ids: number[];
    action: 'activate' | 'deactivate' | 'delete';
}

export interface UserStatistics {
    total_users: number;
    active_users: number;
    inactive_users: number;
    recent_registrations: number;
    role_distribution: Record<string, number>;
}

export interface AuditLog {
    id: number;
    event_type: string;
    user_id: number;
    user_name?: string;
    ip_address: string;
    details: any;
    severity: string;
    created_at: string;
}

export interface AuditLogParams {
    page?: number;
    per_page?: number;
    user_id?: number;
    event_type?: string;
}

const userService = {
    // Get all users with pagination and filtering
    getUsers: async (params?: UserSearchParams): Promise<StandardPaginatedResponse<User>> => {
        try {
            const response = await api.get('/users/', { params });
            return ApiResponseStandardizer.standardizePaginatedResponse<User>(response, 'users');
        } catch (error) {
            console.error('Error fetching users:', error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Get specific user by ID
    getUser: async (userId: number): Promise<StandardApiResponse<User>> => {
        try {
            const response = await api.get(`/users/${userId}`);
            return ApiResponseStandardizer.standardizeSingleResponse<User>(response, 'user');
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Create a new user
    createUser: async (userData: UserCreate): Promise<StandardApiResponse<User>> => {
        try {
            const response = await api.post('/users/', userData);
            return ApiResponseStandardizer.standardizeSingleResponse<User>(response, 'user');
        } catch (error) {
            console.error('Error creating user:', error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Update a user
    updateUser: async (userId: number, userData: UserUpdate): Promise<StandardApiResponse<User>> => {
        try {
            const response = await api.put(`/users/${userId}`, userData);
            return ApiResponseStandardizer.standardizeSingleResponse<User>(response, 'user');
        } catch (error) {
            console.error(`Error updating user ${userId}:`, error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Delete a user
    deleteUser: async (userId: number): Promise<StandardApiResponse<void>> => {
        try {
            const response = await api.delete(`/users/${userId}`);
            return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Perform bulk actions
    bulkUserAction: async (data: BulkUserAction): Promise<StandardApiResponse<{ affected_count: number }>> => {
        try {
            const response = await api.post('/users/bulk-action', data);
            return ApiResponseStandardizer.standardizeSingleResponse<{ affected_count: number }>(response);
        } catch (error) {
            console.error('Error performing bulk user action:', error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Get user statistics
    getUserStatistics: async (): Promise<StandardApiResponse<UserStatistics>> => {
        try {
            const response = await api.get('/users/statistics');
            return ApiResponseStandardizer.standardizeSingleResponse<UserStatistics>(response, 'statistics');
        } catch (error) {
            console.error('Error fetching user statistics:', error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Reset user password
    resetPassword: async (userId: number, newPassword: string): Promise<StandardApiResponse<void>> => {
        try {
            const response = await api.post(`/users/${userId}/reset-password`, { new_password: newPassword });
            return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
        } catch (error) {
            console.error(`Error resetting password for user ${userId}:`, error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    },

    // Get audit logs
    getAuditLogs: async (params?: AuditLogParams): Promise<StandardPaginatedResponse<AuditLog>> => {
        try {
            const response = await api.get('/users/audit-logs', { params });
            return ApiResponseStandardizer.standardizePaginatedResponse<AuditLog>(response, 'audit_logs');
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            throw ApiResponseStandardizer.handleApiError(error);
        }
    }
};

export { userService };
export default userService;

