import { api } from '../lib/api';

// Library Data Interfaces
export interface LibraryBorrowingData {
  month: string;
  borrowed: number;
  returned: number;
  overdue: number;
}

export interface LibraryCategoryData {
  name: string;
  value: number;
  percentage: number;
}

export interface LibraryBorrowerTypeData {
  type: string;
  count: number;
  percentage: number;
}

export interface LibraryPopularBookData {
  id: string;
  title: string;
  author: string;
  category: string;
  borrowCount: number;
  rating: number;
}

export interface LibraryOverdueData {
  month: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface LibraryReportFilter {
  timeRange: string;
  category?: string;
  borrowerType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface LibraryStats {
  totalBooks: number;
  totalBorrowed: number;
  totalOverdue: number;
  totalMembers: number;
  borrowingRate: number;
  returnRate: number;
  overdueRate: number;
  popularCategories: string[];
}

export type LibraryBook = {
  id: number;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string;
  status?: string;
  publisher?: string | null;
  publication_year?: number | null;
  edition?: string | null;
  shelf_location?: string | null;
  total_copies?: number;
  available_copies?: number;
  description?: string | null;
  language?: string | null;
  pages?: number | null;
}

export type LibraryMember = {
  id: number;
  member_id: string;
  user_id: number;
  member_type: string;
  is_active: boolean;
  max_books: number;
  max_days: number;
  total_fines: number;
  fine_limit: number;
  user?: { first_name?: string | null; last_name?: string | null; email?: string | null };
}

export type BorrowRecord = {
  id: number;
  book_id: number;
  book_title: string;
  member_id: number;
  member_code: string;
  member_type: string;
  member_name: string;
  borrow_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: string;
  fine: number;
}

class LibraryService {
  private baseUrl = '/library';

  async getBooks(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    status?: string;
    search?: string;
    available_only?: boolean;
  }): Promise<{ books: LibraryBook[]; pagination: any }> {
    const response = await api.get(`${this.baseUrl}/books`, { params });
    return {
      books: response.data?.books || [],
      pagination: {
        total: response.data?.total,
        pages: response.data?.pages,
        page: params?.page || 1,
        per_page: params?.per_page || 20
      }
    };
  }

  async createBook(payload: Partial<LibraryBook>): Promise<LibraryBook> {
    const response = await api.post(`${this.baseUrl}/books`, payload);
    return response.data?.book;
  }

  async updateBook(bookId: number, payload: Partial<LibraryBook>): Promise<LibraryBook> {
    const response = await api.put(`${this.baseUrl}/books/${bookId}`, payload);
    return response.data?.book;
  }

  async deleteBook(bookId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/books/${bookId}`);
  }

  async getMembers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    member_type?: string;
    is_active?: boolean;
  }): Promise<{ members: LibraryMember[]; pagination: any }> {
    const response = await api.get(`${this.baseUrl}/members`, { params });
    return {
      members: response.data?.members || [],
      pagination: response.data?.pagination
    };
  }

  async getBorrowRecords(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
    member_type?: string;
  }): Promise<{ borrow_records: BorrowRecord[]; pagination: any }> {
    const response = await api.get(`${this.baseUrl}/borrow-records`, { params });
    return {
      borrow_records: response.data?.borrow_records || [],
      pagination: response.data?.pagination
    };
  }

  async borrowBook(payload: { book_id: number; member_id: number }): Promise<any> {
    const response = await api.post(`${this.baseUrl}/borrow`, payload);
    return response.data;
  }

  async returnBook(payload: { borrow_record_id: number; notes?: string }): Promise<any> {
    const response = await api.post(`${this.baseUrl}/return`, payload);
    return response.data;
  }

  // Get borrowing activity data
  async getBorrowingActivity(timeRange: string = 'year'): Promise<LibraryBorrowingData[]> {
    try {
      const response = await api.get(`${this.baseUrl}/reports/borrowing-activity`, {
        params: { timeRange }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching borrowing activity:', error);
      return [];
    }
  }

  // Get category distribution data
  async getCategoryDistribution(): Promise<LibraryCategoryData[]> {
    try {
      const response = await api.get(`${this.baseUrl}/reports/category-distribution`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching category distribution:', error);
      return [];
    }
  }

  // Get borrower type distribution
  async getBorrowerTypeDistribution(_timeRange?: string): Promise<LibraryBorrowerTypeData[]> {
    try {
      const response = await api.get(`${this.baseUrl}/reports/borrower-type-distribution`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching borrower type distribution:', error);
      return [];
    }
  }

  // Get popular books data
  async getPopularBooks(timeRangeOrLimit: any = 10, maybeLimit?: number): Promise<LibraryPopularBookData[]> {
    try {
      const limit = typeof maybeLimit === 'number' ? maybeLimit : typeof timeRangeOrLimit === 'number' ? timeRangeOrLimit : 10;
      const response = await api.get(`${this.baseUrl}/reports/popular-books`, { params: { limit } });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching popular books:', error);
      return [];
    }
  }

  // Get overdue trends data
  async getOverdueTrends(timeRange: string = 'year'): Promise<LibraryOverdueData[]> {
    try {
      const response = await api.get(`${this.baseUrl}/reports/overdue-trends`, {
        params: { timeRange }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching overdue trends:', error);
      return [];
    }
  }

  // Get library statistics
  async getLibraryStats(_timeRange?: string): Promise<LibraryStats> {
    try {
      const response = await api.get(`${this.baseUrl}/reports/stats`);
      const d = response.data?.data || {};
      const totalBooks = Number(d.total_copies ?? d.total_books ?? 0);
      const totalBorrowed = Number(d.active_borrows || 0);
      const totalOverdue = Number(d.overdue_borrows || 0);
      const totalMembers = Number(d.total_members || 0);
      const borrowingRate = totalBooks > 0 ? (totalBorrowed / totalBooks) * 100 : 0;
      const overdueRate = totalBorrowed > 0 ? (totalOverdue / totalBorrowed) * 100 : 0;
      return {
        totalBooks,
        totalBorrowed,
        totalOverdue,
        totalMembers,
        borrowingRate,
        returnRate: 0,
        overdueRate,
        popularCategories: []
      };
    } catch (error) {
      console.error('Error fetching library stats:', error);
      return {
        totalBooks: 0,
        totalBorrowed: 0,
        totalOverdue: 0,
        totalMembers: 0,
        borrowingRate: 0,
        returnRate: 0,
        overdueRate: 0,
        popularCategories: []
      };
    }
  }

  // Export report
  async exportReport(reportType: string, format: 'pdf' | 'excel' | 'csv', filters?: LibraryReportFilter): Promise<Blob> {
    try {
      const response = await api.post(`${this.baseUrl}/reports/export`, {
        reportType,
        format,
        filters
      }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  // Print report
  async printReport(reportType: string, filters?: LibraryReportFilter): Promise<string> {
    try {
      const response = await api.post(`${this.baseUrl}/reports/print`, {
        reportType,
        filters
      });
      return response.data.printUrl;
    } catch (error) {
      console.error('Error printing report:', error);
      throw error;
    }
  }

}

// Export singleton instance
const libraryService = new LibraryService();
export default libraryService;
