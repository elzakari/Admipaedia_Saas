import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, TrendingUp, Wallet } from 'lucide-react';
import { feesService } from '../../services/feesService';

const AIInsightsBar = () => {
  const { data: feeRecordsResp } = useQuery({
    queryKey: ['fees', 'records', 'insights'],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 200 })
  });

  const { data: paymentsResp } = useQuery({
    queryKey: ['fees', 'payments', 'insights'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 200 })
  });

  const { data: overdueResp } = useQuery({
    queryKey: ['fees', 'overdue', 'insights'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 200 })
  });

  const { collectionRatePct, outstandingBalance, paymentsLast7Days } = useMemo(() => {
    const records = Array.isArray(feeRecordsResp?.fee_records) ? feeRecordsResp!.fee_records : [];
    const totalFinal = records.reduce((acc, r) => acc + (Number(r.final_amount) || 0), 0);
    const totalPaid = records.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const outstanding = records.reduce((acc, r) => acc + (Number(r.balance) || 0), 0);

    const payments = Array.isArray(paymentsResp?.payments) ? paymentsResp!.payments : [];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = payments.reduce((acc, p) => {
      const dt = p.created_at ? new Date(p.created_at).getTime() : NaN;
      if (!Number.isFinite(dt) || dt < cutoff) return acc;
      return acc + (Number(p.amount) || 0);
    }, 0);

    return {
      collectionRatePct: totalFinal > 0 ? Math.round((totalPaid / totalFinal) * 1000) / 10 : 0,
      outstandingBalance: outstanding,
      paymentsLast7Days: last7
    };
  }, [feeRecordsResp, paymentsResp]);

  const overdueCount = Array.isArray(overdueResp?.overdue_fees) ? overdueResp!.overdue_fees.length : 0;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
        <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Fee Insights</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 mr-3">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Collection Rate</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{collectionRatePct}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 mr-3">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Payments (7 days)</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentsLast7Days.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 mr-3">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Overdue Records</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{overdueCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-3">
              <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{outstandingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsBar;
