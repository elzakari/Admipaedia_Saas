import api from '../lib/api'

export type FeeTemplateItem = {
  fee_structure_id: number
  category_id: number
  category: string
  amount: number
  currency?: string
}

export type FeeTemplateGroup = {
  id: string
  class_id: number | null
  academic_year: string
  term: string
  currency: string
  due_date: string | null
  items: FeeTemplateItem[]
  total_amount: number
  created_at?: string | null
}

export type FeeRecord = {
  id: number
  student_id: number
  fee_structure_id: number
  academic_year?: string | null
  total_amount?: number
  original_amount?: number
  discount_amount?: number
  final_amount: number
  paid_amount: number
  balance: number
  status: string
  due_date?: string | null
  created_at?: string | null
  student?: {
    id: number
    admission_number?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null
  structure?: {
    id: number
    academic_year?: string | null
    term?: string | null
    amount?: number
    currency?: string | null
    due_date?: string | null
    fee_category?: string | null
  } | null
}

export type FeePayment = {
  id: number
  student_id?: number
  student_name?: string | null
  fee_record_id?: number
  amount: number
  currency?: string | null
  payment_method: string
  reference_number?: string | null
  payment_date?: string | null
  status?: string
  created_at?: string | null
}

export const feesService = {
  getFeeTemplates: async (params?: { page?: number; per_page?: number; academic_year?: string; term?: string; class_id?: number }) => {
    const res = await api.get('/administration/fee-structures', { params })
    return res.data as { success: boolean; fee_structures: FeeTemplateGroup[]; pagination: any }
  },

  createFeeTemplate: async (payload: { class_id?: number | null; academic_year: string; term: string; due_date?: string | null; items: Array<{ category: string; amount: number }> }) => {
    const res = await api.post('/administration/fee-structures', payload)
    return res.data as { success: boolean; fee_structure: FeeTemplateGroup }
  },

  updateFeeTemplate: async (groupId: string, payload: { due_date?: string | null; items: Array<{ category: string; amount: number }> }) => {
    const res = await api.put(`/administration/fee-structures/${encodeURIComponent(groupId)}`, payload)
    return res.data as { success: boolean; fee_structure: FeeTemplateGroup }
  },

  deleteFeeTemplate: async (groupId: string) => {
    const res = await api.delete(`/administration/fee-structures/${encodeURIComponent(groupId)}`)
    return res.data as { success: boolean }
  },

  assignFeeTemplate: async (groupId: string, payload?: { student_id?: number }) => {
    const res = await api.post(`/administration/fee-structures/${encodeURIComponent(groupId)}/assign`, payload || {})
    return res.data as { success: boolean; created: number }
  },

  getFeeRecords: async (params?: { page?: number; per_page?: number; academic_year?: string; class_id?: number }) => {
    const res = await api.get('/administration/fee-records', { params })
    return res.data as { success: boolean; fee_records: FeeRecord[]; pagination: any }
  },

  createFeeRecord: async (payload: { student_id: number; fee_structure_id: number }) => {
    const res = await api.post('/administration/fee-records', payload)
    return res.data as any
  },

  getOverdueFees: async (params?: { page?: number; per_page?: number; academic_year?: string; class_id?: number }) => {
    const res = await api.get('/administration/overdue-fees', { params })
    return res.data as { success: boolean; overdue_fees: any[]; pagination: any }
  },

  getPayments: async (params?: { page?: number; per_page?: number; student_id?: number }) => {
    const res = await api.get('/administration/fee-payments', { params })
    return res.data as { success: boolean; payments: FeePayment[]; pagination: any }
  },

  recordPayment: async (payload: { fee_record_id: number; amount: number; payment_method: string; reference_number?: string; payment_date?: string }) => {
    const res = await api.post('/administration/fee-payments', payload)
    return res.data as { success: boolean; fee_payment: FeePayment }
  },

  getFeeRecordPayments: async (feeRecordId: number) => {
    const res = await api.get(`/administration/fee-records/${feeRecordId}/payments`)
    return res.data as FeePayment[]
  }
}

