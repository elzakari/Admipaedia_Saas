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
    enabled: !currentAcademicYearQuery.isPending
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
    const totalPaidFromRecentPayments = recentPayments.reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

    const serverSummary = summaryQuery.data as any | undefined;
    const serverTotalBilled = Number(serverSummary?.total_billed ?? NaN);
    const serverTotalRevenue = Number(serverSummary?.total_revenue ?? NaN);
    const serverCollectedPayments = Number(serverSummary?.total_collected_payments ?? NaN);
    const serverFeeCollections = Number(serverSummary?.total_fee_collections ?? NaN);
    const serverOutstanding = Number(serverSummary?.outstanding_fees ?? NaN);

    const hasPaymentsData = recentPayments.length > 0;
    const hasFeeRecordsPaid = totalPaidFromRecords > 0;

    function pickBestServerNumber(
      candidates: number[],
      fallbackPaginationBased: number,
      zeroTrustsServer: boolean,
    ): number {
      // Prefer finite, positive server numbers first. If the server says 0 but we
      // have paginated data that says non-zero (e.g. due to an academic-year
      // scoping bug / null branch_id / missing allocation rows), prefer the
      // non-zero paginated total instead of displaying a confusing "0".
      for (const n of candidates) {
        if (!Number.isFinite(n)) continue;
        if (n > 0) return n;
        if (zeroTrustsServer && n === 0) return 0;
      }
      return fallbackPaginationBased;
    }

    const totalExpected = pickBestServerNumber(
      [serverTotalBilled, totalExpectedFromRecords],
      totalExpectedFromRecords,
      !hasFeeRecordsPaid && totalExpectedFromRecords === 0,
    );

    let totalCollected = pickBestServerNumber(
      [serverTotalRevenue, serverCollectedPayments, serverFeeCollections],
      totalPaidFromRecords,
      !hasPaymentsData && !hasFeeRecordsPaid,
    );
    if (totalCollected === 0 && hasPaymentsData) {
      // Server says 0 but the recent-payments list (populated by the Hodia
      // Franck row in the screenshots) has visible rows. Use the paginated sum
      // so the 25k cash payment shows up even if get_financial_summary() is
      // still mis-scoping an academic year filter or allocation join on prod.
      totalCollected = Math.max(totalPaidFromRecords, totalPaidFromRecentPayments);
    }

    let outstandingFees = pickBestServerNumber(
      [serverOutstanding, Number(serverSummary?.total_overdue_balance ?? NaN)],
      outstandingBalanceFromRecords,
      !hasFeeRecordsPaid && outstandingBalanceFromRecords === 0,
    );
    if (outstandingFees === 0 && outstandingBalanceFromRecords > 0) {
      outstandingFees = outstandingBalanceFromRecords;
    }

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

    const serverCollectionRate = Number(serverSummary?.collection_rate ?? NaN);
    let collectionRate =
      (typeof serverCollectionRate === 'number' && Number.isFinite(serverCollectionRate) && serverCollectionRate > 0)
        ? Math.round(serverCollectionRate)
        : 0;
    if ((collectionRate === 0 || !Number.isFinite(collectionRate)) && totalExpected > 0) {
      collectionRate = Math.round((totalCollected / totalExpected) * 100);
    }

    const serverOverdue =
      serverSummary && typeof serverSummary.overdue_count === 'number'
        ? Number(serverSummary.overdue_count)
        : null;
    const paginatedOverdue = overdueQuery.data?.pagination?.total ?? overdueFees.length;
    const overdueCount =
      typeof serverOverdue === 'number' && serverOverdue > 0
        ? Math.max(serverOverdue, paginatedOverdue)
        : (serverOverdue === 0 && paginatedOverdue === 0
            ? 0
            : Math.max(typeof serverOverdue === 'number' ? serverOverdue : 0, paginatedOverdue));

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
      summaryQuery.isLoading,
    summaryQuery,
    overdueQuery,
    paymentsQuery,
    feeRecordsQuery
  };
}
