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
  student?: {
    id: number;
    admission_number?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  structure?: {
    id: number;
    academic_year?: string | null;
    term?: string | null;
    amount?: number;
    currency?: string | null;
    due_date?: string | null;
    fee_category?: string | null;
  } | null;
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

const normalizeBudget = (budget: any): Budget => ({
  id: Number(budget?.id || 0),
  category: String(budget?.category || budget?.name || 'other'),
  allocated_amount: Number(budget?.allocated_amount ?? budget?.total_amount ?? 0),
  spent_amount: Number(budget?.spent_amount ?? 0),
  academic_year: String(budget?.academic_year || budget?.fiscal_year || budget?.budget_year || ''),
  description: budget?.description || undefined,
  created_at: String(budget?.created_at || ''),
  updated_at: String(budget?.updated_at || ''),
});

const normalizeTransaction = (transaction: any): Transaction => ({
  id: Number(transaction?.id || 0),
  type: (transaction?.type || transaction?.transaction_type || 'income') as 'income' | 'expense',
  amount: Number(transaction?.amount ?? 0),
  description: String(transaction?.description || ''),
  category: String(transaction?.category || ''),
  reference_number: String(transaction?.reference_number || ''),
  date: String(transaction?.date || transaction?.transaction_date || ''),
  created_by: Number(transaction?.created_by || 0),
  created_at: String(transaction?.created_at || ''),
  updated_at: String(transaction?.updated_at || ''),
});

const normalizeFeeRecord = (record: any): FeeRecord => ({
  id: Number(record?.id || 0),
  student_id: Number(record?.student_id || record?.student?.id || 0),
  fee_structure_id: Number(record?.fee_structure_id || 0),
  academic_year: String(record?.academic_year || record?.structure?.academic_year || ''),
  total_amount: Number(record?.total_amount ?? record?.final_amount ?? 0),
  paid_amount: Number(record?.paid_amount ?? 0),
  balance: Number(record?.balance ?? 0),
  status: (record?.status || 'pending') as FeeRecord['status'],
  due_date: String(record?.due_date || record?.structure?.due_date || ''),
  created_at: String(record?.created_at || ''),
  updated_at: String(record?.updated_at || ''),
  student: record?.student ? {
    id: Number(record.student?.id || record?.student_id || 0),
    admission_number: record.student?.admission_number || null,
    first_name: record.student?.first_name || null,
    last_name: record.student?.last_name || null,
  } : null,
  structure: record?.structure ? {
    id: Number(record.structure?.id || record?.fee_structure_id || 0),
    academic_year: record.structure?.academic_year || null,
    term: record.structure?.term || null,
    amount: Number(record.structure?.amount ?? 0),
    currency: record.structure?.currency || null,
    due_date: record.structure?.due_date || null,
    fee_category: record.structure?.fee_category || null,
  } : null,
});

const normalizeFinancialSummary = (payload: any): FinancialSummary => ({
  total_revenue: Number(payload?.total_revenue ?? payload?.total_income ?? payload?.total_fee_collections ?? 0),
  total_expenses: Number(payload?.total_expenses ?? 0),
  net_income: Number(payload?.net_income ?? payload?.net_balance ?? 0),
  outstanding_fees: Number(payload?.outstanding_fees ?? 0),
  collection_rate: Number(payload?.collection_rate ?? 0),
  monthly_trends: Array.isArray(payload?.monthly_trends) ? payload.monthly_trends : [],
});

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
    const budgets = Array.isArray(response.data?.budgets) ? response.data.budgets.map(normalizeBudget) : [];
    return {
      ...(response.data || {}),
      data: budgets,
      budgets,
      pagination: response.data?.pagination || null,
    } as PaginatedResponse<Budget>;
  },

  getBudgetById: async (id: number): Promise<Budget> => {
    const response = await api.get(`/administration/budgets/${id}`);
    return normalizeBudget(response.data?.budget ?? response.data);
  },

  createBudget: async (budgetData: BudgetCreate): Promise<Budget> => {
    const response = await api.post('/administration/budgets', budgetData);
    return normalizeBudget(response.data?.budget ?? response.data);
  },

  updateBudget: async (id: number, budgetData: BudgetUpdate): Promise<Budget> => {
    const response = await api.put(`/administration/budgets/${id}`, budgetData);
    return normalizeBudget(response.data?.budget ?? response.data);
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
    const transactions = Array.isArray(response.data?.transactions) ? response.data.transactions.map(normalizeTransaction) : [];
    return {
      ...(response.data || {}),
      data: transactions,
      transactions,
      pagination: response.data?.pagination || null,
    } as PaginatedResponse<Transaction>;
  },

  getTransactionById: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/administration/transactions/${id}`);
    return normalizeTransaction(response.data?.transaction ?? response.data);
  },

  createTransaction: async (transactionData: TransactionCreate): Promise<Transaction> => {
    const response = await api.post('/administration/transactions', transactionData);
    return normalizeTransaction(response.data?.transaction ?? response.data);
  },

  updateTransaction: async (id: number, transactionData: Partial<TransactionCreate>): Promise<Transaction> => {
    const response = await api.put(`/administration/transactions/${id}`, transactionData);
    return normalizeTransaction(response.data?.transaction ?? response.data);
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
    const feeRecords = Array.isArray(response.data?.fee_records) ? response.data.fee_records.map(normalizeFeeRecord) : [];
    return {
      ...(response.data || {}),
      data: feeRecords,
      fee_records: feeRecords,
      pagination: response.data?.pagination || null,
    } as PaginatedResponse<FeeRecord>;
  },

  getFeeRecordById: async (id: number): Promise<FeeRecord> => {
    const response = await api.get(`/administration/fee-records/${id}`);
    return normalizeFeeRecord(response.data?.fee_record ?? response.data);
  },

  createFeeRecord: async (feeRecordData: FeeRecordCreate): Promise<FeeRecord> => {
    const response = await api.post('/administration/fee-records', feeRecordData);
    return normalizeFeeRecord(response.data?.fee_record ?? response.data);
  },

  updateFeeRecord: async (id: number, feeRecordData: Partial<FeeRecordCreate>): Promise<FeeRecord> => {
    const response = await api.put(`/administration/fee-records/${id}`, feeRecordData);
    return normalizeFeeRecord(response.data?.fee_record ?? response.data);
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
    return normalizeFinancialSummary(response.data?.financial_summary ?? response.data);
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
