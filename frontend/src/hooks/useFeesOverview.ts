import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { feesService } from '../services/feesService';
import financialService from '../services/financialService';
import academicService from '../services/academicService';

export function useFeesOverview() {
  const currentAcademicYearQuery = useQuery({
    queryKey: ['academic-years', 'current'],
    queryFn: async () => {
      try {
        const year = await academicService.getCurrentAcademicYear();
        return year?.name || undefined;
      } catch {
        return undefined;
      }
    },
    staleTime: 10 * 60_000,
    retry: false
  });
  const currentAcademicYear = currentAcademicYearQuery.data;

  const paymentsQuery = useQuery({
    queryKey: ['fees', 'payments', 'overview'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const feeRecordsQuery = useQuery({
    queryKey: ['fees', 'records', 'overview', currentAcademicYear],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 100, academic_year: currentAcademicYear }),
    staleTime: 60_000
  });

  const overdueQuery = useQuery({
    queryKey: ['fees', 'overdue', 'overview', currentAcademicYear],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 50, academic_year: currentAcademicYear }),
    staleTime: 60_000
  });

  const summaryQuery = useQuery({
    queryKey: ['fees', 'summary', 'overview', currentAcademicYear],
    queryFn: () => financialService.getFinancialSummary(undefined, undefined, currentAcademicYear),
    staleTime: 60_000,
    enabled: currentAcademicYearQuery.status !== 'loading'
  });

  const recentPayments = useMemo(
    () => (Array.isArray(paymentsQuery.data?.payments) ? paymentsQuery.data.payments : []),
    [paymentsQuery.data]
  );
  const feeRecords = useMemo(
    () => (Array.isArray(feeRecordsQuery.data?.fee_records) ? feeRecordsQuery.data.fee_records : []),
    [feeRecordsQuery.data]
  );
  const overdueFees = useMemo(
    () => (Array.isArray(overdueQuery.data?.overdue_fees) ? overdueQuery.data.overdue_fees : []),
    [overdueQuery.data]
  );

  const metrics = useMemo(() => {
    const totalExpectedFromRecords = feeRecords.reduce(
      (sum, record) => sum + Number(record.total_amount ?? record.final_amount ?? 0),
      0
    );
    const totalPaidFromRecords = feeRecords.reduce(
      (sum, record) => sum + Number(record.paid_amount ?? 0),
      0
    );
    const outstandingBalanceFromRecords = feeRecords.reduce(
      (sum, record) => sum + Number(record.balance ?? 0),
      0
    );

    const totalExpected = Number(
      (summaryQuery.data && typeof (summaryQuery.data as any).total_billed === 'number')
        ? (summaryQuery.data as any).total_billed
        : totalExpectedFromRecords
    );
    const totalCollected = Number(
      (summaryQuery.data && typeof summaryQuery.data?.total_revenue === 'number')
        ? summaryQuery.data.total_revenue
        : totalPaidFromRecords
    );
    const outstandingFees = Number(
      (summaryQuery.data && typeof summaryQuery.data?.outstanding_fees === 'number')
        ? summaryQuery.data.outstanding_fees
        : outstandingBalanceFromRecords
    );

    const paymentMethodCounts = recentPayments.reduce<Record<string, number>>((acc, payment) => {
      const key = String(payment.payment_method || 'other');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const paymentsLast7Days = recentPayments.reduce((sum, payment) => {
      const timestamp = payment.created_at ? new Date(payment.created_at).getTime() : NaN;
      if (!Number.isFinite(timestamp) || timestamp < cutoff) return sum;
      return sum + Number(payment.amount || 0);
    }, 0);

    const serverCollectionRate = summaryQuery.data?.collection_rate;
    const collectionRate =
      (typeof serverCollectionRate === 'number' && Number.isFinite(serverCollectionRate) && serverCollectionRate > 0)
        ? Math.round(serverCollectionRate)
        : (totalExpected > 0
            ? Math.round((totalCollected / totalExpected) * 100)
            : 0);

    const serverOverdue =
      summaryQuery.data && typeof (summaryQuery.data as any).overdue_count === 'number'
        ? (summaryQuery.data as any).overdue_count
        : null;
    const paginatedOverdue = overdueQuery.data?.pagination?.total ?? overdueFees.length;
    const overdueCount =
      typeof serverOverdue === 'number' ? Math.max(serverOverdue, paginatedOverdue) : paginatedOverdue;

    return {
      totalExpected,
      totalCollected,
      outstandingFees,
      collectionRate,
      paymentMethodCounts,
      paymentsLast7Days,
      overdueCount
    };
  }, [feeRecords, overdueFees.length, overdueQuery.data?.pagination?.total, recentPayments, summaryQuery.data]);

  return {
    recentPayments,
    feeRecords,
    overdueFees,
    metrics,
    isLoadingPayments: paymentsQuery.isLoading,
    isLoadingOverview:
      paymentsQuery.isLoading ||
      feeRecordsQuery.isLoading ||
      overdueQuery.isLoading ||
      summaryQuery.isLoading
  };
}
