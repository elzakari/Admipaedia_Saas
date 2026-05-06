import api from '../lib/api';
import { Pagination, PaginatedResponse } from '../types';

// Types for financial data
export interface Budget {
  id: number;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  academic_year: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  category: string;
  allocated_amount: number;
  academic_year: string;
  description?: string;
}

export interface BudgetUpdate {
  category?: string;
  allocated_amount?: number;
  description?: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  reference_number: string;
  date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface FeeStructure {
  id: number;
  class_id: number;
  academic_year: string;
  tuition_fee: number;
  registration_fee: number;
  activity_fee: number;
  library_fee: number;
  lab_fee: number;
  transport_fee: number;
  other_fees: number;
  total_fee: number;
  created_at: string;
  updated_at: string;
}

export interface FeeStructureCreate {
  class_id: number;
  academic_year: string;
  tuition_fee: number;
  registration_fee?: number;
  activity_fee?: number;
  library_fee?: number;
  lab_fee?: number;
  transport_fee?: number;
  other_fees?: number;
}

export interface FeeRecord {
  id: number;
  student_id: number;
  fee_structure_id: number;
  academic_year: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface FeeRecordCreate {
  student_id: number;
  fee_structure_id: number;
  due_date: string;
}

export interface FeePayment {
  id: number;
  fee_record_id: number;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'mobile_money';
  reference_number: string;
  payment_date: string;
  created_by: number;
  created_at: string;
}

export interface FeePaymentCreate {
  fee_record_id: number;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'mobile_money';
  reference_number?: string;
  payment_date: string;
}

export interface OverdueFee {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  days_overdue: number;
  status: 'overdue';
}

export interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  outstanding_fees: number;
  collection_rate: number;
  monthly_trends: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
}

// Financial Service
const financialService = {
  // Budget Management
  getBudgets: async (filters: {
    academic_year?: string;
    category?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<Budget>> => {
    const response = await api.get('/administration/budgets', { params: filters });
    return response.data;
  },

  getBudgetById: async (id: number): Promise<Budget> => {
    const response = await api.get(`/administration/budgets/${id}`);
    return response.data;
  },

  createBudget: async (budgetData: BudgetCreate): Promise<Budget> => {
    const response = await api.post('/administration/budgets', budgetData);
    return response.data;
  },

  updateBudget: async (id: number, budgetData: BudgetUpdate): Promise<Budget> => {
    const response = await api.put(`/administration/budgets/${id}`, budgetData);
    return response.data;
  },

  deleteBudget: async (id: number): Promise<void> => {
    await api.delete(`/administration/budgets/${id}`);
  },

  // Transaction Management
  getTransactions: async (filters: {
    type?: 'income' | 'expense';
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get('/administration/transactions', { params: filters });
    return response.data;
  },

  getTransactionById: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/administration/transactions/${id}`);
    return response.data;
  },

  createTransaction: async (transactionData: TransactionCreate): Promise<Transaction> => {
    const response = await api.post('/administration/transactions', transactionData);
    return response.data;
  },

  updateTransaction: async (id: number, transactionData: Partial<TransactionCreate>): Promise<Transaction> => {
    const response = await api.put(`/administration/transactions/${id}`, transactionData);
    return response.data;
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await api.delete(`/administration/transactions/${id}`);
  },

  // Fee Structure Management
  getFeeStructures: async (filters: {
    class_id?: number;
    academic_year?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<FeeStructure>> => {
    const response = await api.get('/administration/fee-structures', { params: filters });
    return response.data;
  },

  getFeeStructureById: async (id: number): Promise<FeeStructure> => {
    const response = await api.get(`/administration/fee-structures/${id}`);
    return response.data;
  },

  createFeeStructure: async (feeStructureData: FeeStructureCreate): Promise<FeeStructure> => {
    const response = await api.post('/administration/fee-structures', feeStructureData);
    return response.data;
  },

  updateFeeStructure: async (id: number, feeStructureData: Partial<FeeStructureCreate>): Promise<FeeStructure> => {
    const response = await api.put(`/administration/fee-structures/${id}`, feeStructureData);
    return response.data;
  },

  deleteFeeStructure: async (id: number): Promise<void> => {
    await api.delete(`/administration/fee-structures/${id}`);
  },

  // Fee Records Management
  getFeeRecords: async (filters: {
    student_id?: number;
    academic_year?: string;
    status?: 'pending' | 'partial' | 'paid' | 'overdue';
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<FeeRecord>> => {
    const response = await api.get('/administration/fee-records', { params: filters });
    return response.data;
  },

  getFeeRecordById: async (id: number): Promise<FeeRecord> => {
    const response = await api.get(`/administration/fee-records/${id}`);
    return response.data;
  },

  createFeeRecord: async (feeRecordData: FeeRecordCreate): Promise<FeeRecord> => {
    const response = await api.post('/administration/fee-records', feeRecordData);
    return response.data;
  },

  updateFeeRecord: async (id: number, feeRecordData: Partial<FeeRecordCreate>): Promise<FeeRecord> => {
    const response = await api.put(`/administration/fee-records/${id}`, feeRecordData);
    return response.data;
  },

  deleteFeeRecord: async (id: number): Promise<void> => {
    await api.delete(`/administration/fee-records/${id}`);
  },

  // Fee Payments
  recordPayment: async (paymentData: FeePaymentCreate): Promise<FeePayment> => {
    const response = await api.post('/administration/fee-payments', paymentData);
    return response.data;
  },

  getPaymentHistory: async (feeRecordId: number): Promise<FeePayment[]> => {
    const response = await api.get(`/administration/fee-records/${feeRecordId}/payments`);
    return response.data;
  },

  // Overdue Fees
  getOverdueFees: async (filters: {
    class_id?: number;
    days_overdue?: number;
    page?: number;
    per_page?: number;
  } = {}): Promise<PaginatedResponse<OverdueFee>> => {
    const response = await api.get('/administration/overdue-fees', { params: filters });
    return response.data;
  },

  // Financial Summary
  getFinancialSummary: async (
    dateFrom?: string,
    dateTo?: string,
    academicYear?: string
  ): Promise<FinancialSummary> => {
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (academicYear) params.academic_year = academicYear;
    const response = await api.get('/administration/financial-summary', { params });
    return response.data;
  },

  generateFinancialReport: async (
    reportType: 'income' | 'expense' | 'fees' | 'summary',
    dateFrom: string,
    dateTo: string,
    format: 'pdf' | 'excel' = 'pdf'
  ): Promise<Blob> => {
    const response = await api.get('/administration/financial-reports/generate', {
      params: { type: reportType, date_from: dateFrom, date_to: dateTo, format },
      responseType: 'blob'
    });
    return response.data;
  }
};

export default financialService;