import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, Download, FileText, Send } from 'lucide-react';
import { feesService } from '../../services/feesService';
import financialService from '../../services/financialService';

const FeesDashboard = () => {
  const { t } = useTranslation();

  const navigateTo = (tab: string) => {
    window.dispatchEvent(new CustomEvent('fees:navigate', { detail: { tab } }))
  }

  const action = (tab: string, type: 'create' | 'export') => {
    window.dispatchEvent(new CustomEvent('fees:action', { detail: { tab, type } }))
  }

  const { data: paymentsResp, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['fees', 'payments', 'recent'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 5 })
  });
  const { data: feeRecordsResp } = useQuery({
    queryKey: ['fees', 'records', 'dashboard'],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 100 })
  });
  const { data: overdueResp } = useQuery({
    queryKey: ['fees', 'overdue', 'dashboard'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 10 })
  });
  const { data: summaryResp } = useQuery({
    queryKey: ['fees', 'summary', 'dashboard'],
    queryFn: () => financialService.getFinancialSummary(undefined, undefined, new Date().getFullYear().toString())
  });

  const recentPayments = Array.isArray(paymentsResp?.payments) ? paymentsResp!.payments : [];
  const feeRecords = Array.isArray(feeRecordsResp?.fee_records) ? feeRecordsResp.fee_records : [];
  const overdueFees = Array.isArray(overdueResp?.overdue_fees) ? overdueResp.overdue_fees : [];
  const paymentMethodCounts = recentPayments.reduce<Record<string, number>>((acc, payment) => {
    const key = String(payment.payment_method || 'other');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const totalExpected = feeRecords.reduce((sum, record) => sum + Number(record.total_amount ?? record.final_amount ?? 0), 0);
  const totalCollected = Number(summaryResp?.total_revenue ?? 0);
  const outstandingFees = Number(summaryResp?.outstanding_fees ?? 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : Number(summaryResp?.collection_rate ?? 0);

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin_fees.revenue_overview', 'Revenue Overview')}</CardTitle>
          <CardDescription>{t('admin_fees.revenue_overview_desc', 'Fee collection trends for the current term')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-xs font-medium text-emerald-700">{t('admin_fees.collected', 'Collected')}</div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">{Number(totalCollected || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <div className="text-xs font-medium text-amber-700">{t('admin_fees.outstanding', 'Outstanding')}</div>
              <div className="mt-2 text-2xl font-bold text-amber-900">{Number(outstandingFees || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="text-xs font-medium text-blue-700">{t('admin_fees.expected', 'Expected')}</div>
              <div className="mt-2 text-2xl font-bold text-blue-900">{Number(totalExpected || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
              <div className="text-xs font-medium text-purple-700">{t('admin_fees.collection_rate_title', 'Collection Rate')}</div>
              <div className="mt-2 text-2xl font-bold text-purple-900">{collectionRate}%</div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">{t('admin_fees.recent_payment_flow', 'Recent payment flow')}</div>
            {recentPayments.length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">{t('admin_fees.recent_payment_flow_empty', 'Payments will appear here as collections are recorded.')}</div>
            ) : (
              <div className="mt-3 space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div className="font-medium text-slate-700">{payment.student_name || t('admin_fees.student', 'Student')}</div>
                    <div className="text-slate-500">{payment.payment_method}</div>
                    <div className="font-semibold text-slate-900">{Number(payment.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
 
      {/* Fee Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collection by Class */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_fees.collection_by_class', 'Outstanding Balances')}</CardTitle>
            <CardDescription>{t('admin_fees.collection_by_class_desc', 'Students and records that still need follow-up')}</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueFees.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-slate-700 dark:text-gray-400">
                {t('admin_fees.no_overdue_balances', 'No overdue balances yet.')}
              </div>
            ) : (
              <div className="space-y-3">
                {overdueFees.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{item.student_name || t('admin_fees.student', 'Student')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.class_name || t('admin_fees.class', 'Class')} • {t('admin_fees.days_overdue_count', '{{count}} day(s) overdue', { count: item.days_overdue })}</div>
                      </div>
                      <div className="text-sm font-semibold text-red-600">{Number(item.balance || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
 
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_fees.payment_methods', 'Payment Methods')}</CardTitle>
            <CardDescription>{t('admin_fees.payment_methods_desc', 'Distribution by payment method')}</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(paymentMethodCounts).length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-slate-700 dark:text-gray-400">
                {t('admin_fees.payment_method_trends_empty', 'Payment method trends will appear after collections start coming in.')}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(paymentMethodCounts).map(([method, count]) => (
                  <div key={method}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize text-gray-700 dark:text-gray-200">{method.replace('_', ' ')}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-indigo-600"
                        style={{ width: `${Math.min(100, (count / Math.max(recentPayments.length, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle>{t('admin_fees.recent_activity', 'Recent Activity')}</CardTitle>
            <CardDescription>{t('admin_fees.recent_activity_desc', 'Latest fee transactions and updates')}</CardDescription>
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
            <Calendar className="h-4 w-4 mr-2" />
            {t('common.view_all', 'View All')}
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingPayments ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.loading_activity', 'Loading activity...')}</div>
            ) : recentPayments.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.no_recent_activity', 'No recent activity.')}</div>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex items-start">
                  <div className="p-2 rounded-full mr-3 bg-green-100 dark:bg-green-900/30">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin_fees.payment_received', 'Payment Received')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('admin_fees.payment_received_desc', '{{student}} paid {{amount}} via {{method}}', {
                        student: p.student_name || 'Student',
                        amount: Number(p.amount || 0).toLocaleString(),
                        method: p.payment_method
                      })}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.quick_actions', 'Quick Actions')}</CardTitle>
          <CardDescription>{t('admin_fees.quick_actions_desc', 'Common fee management tasks')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: t('admin_fees.record_payment', 'Record Payment'), icon: <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />, onClick: () => action('payments', 'create') },
              { name: t('admin_fees.generate_invoices', 'Generate Invoices'), icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />, onClick: () => action('invoices', 'create') },
              { name: t('admin_fees.send_reminders', 'Send Reminders'), icon: <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />, onClick: () => action('reminders', 'create') },
              { name: t('admin_fees.download_reports', 'Download Reports'), icon: <Download className="h-5 w-5 text-green-600 dark:text-green-400" />, onClick: () => navigateTo('reports') }
            ].map((action, index) => (
              <div
                key={index}
                className="flex items-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                onClick={action.onClick}
              >
                <div className="mr-3">{action.icon}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{action.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesDashboard;
