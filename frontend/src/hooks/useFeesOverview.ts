import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { feesService } from '../services/feesService';
import financialService from '../services/financialService';

export function useFeesOverview() {
  const currentYear = new Date().getFullYear().toString();

  const paymentsQuery = useQuery({
    queryKey: ['fees', 'payments', 'overview'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const feeRecordsQuery = useQuery({
    queryKey: ['fees', 'records', 'overview'],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 100 }),
    staleTime: 60_000
  });

  const overdueQuery = useQuery({
    queryKey: ['fees', 'overdue', 'overview'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 20 }),
    staleTime: 60_000
  });

  const summaryQuery = useQuery({
    queryKey: ['fees', 'summary', 'overview', currentYear],
    queryFn: () => financialService.getFinancialSummary(undefined, undefined, currentYear),
    staleTime: 60_000
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
    const totalExpected = feeRecords.reduce(
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
    const totalCollected = Number(summaryQuery.data?.total_revenue ?? totalPaidFromRecords);
    const outstandingFees = Number(summaryQuery.data?.outstanding_fees ?? outstandingBalanceFromRecords);

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

    const collectionRate = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 100)
      : Number(summaryQuery.data?.collection_rate ?? 0);

    return {
      totalExpected,
      totalCollected,
      outstandingFees,
      collectionRate,
      paymentMethodCounts,
      paymentsLast7Days,
      overdueCount: overdueFees.length
    };
  }, [feeRecords, overdueFees.length, recentPayments, summaryQuery.data]);

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
