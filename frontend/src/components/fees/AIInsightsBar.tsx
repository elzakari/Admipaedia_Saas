import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, TrendingUp, Wallet } from 'lucide-react';
import { useFeesOverview } from '../../hooks/useFeesOverview';

const AIInsightsBar = () => {
  const { t } = useTranslation();
  const { metrics } = useFeesOverview();
  const { collectionRate, outstandingFees, paymentsLast7Days, overdueCount } = metrics;
  const collectionRatePct = useMemo(() => Math.round(collectionRate * 10) / 10, [collectionRate]);
  const outstandingBalance = outstandingFees;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
        <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{t('admin_fees.fee_insights', 'Fee Insights')}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 mr-3">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.collection_rate_title', 'Collection Rate')}</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.payments_7days', 'Payments (7 days)')}</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.overdue_records', 'Overdue Records')}</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.outstanding_balance', 'Outstanding Balance')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{outstandingBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsBar;
