import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, Download, FileText, Send } from 'lucide-react';
import { feesService } from '../../services/feesService';

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

  const recentPayments = Array.isArray(paymentsResp?.payments) ? paymentsResp!.payments : [];

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin_fees.revenue_overview', 'Revenue Overview')}</CardTitle>
          <CardDescription>{t('admin_fees.revenue_overview_desc', 'Fee collection trends for the current term')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.revenue_chart_placeholder', 'Revenue chart will be rendered here')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Fee Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collection by Class */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_fees.collection_by_class', 'Collection by Class')}</CardTitle>
            <CardDescription>{t('admin_fees.collection_by_class_desc', 'Fee collection breakdown by class')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.class_chart_placeholder', 'Class-wise collection chart will be rendered here')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin_fees.payment_methods', 'Payment Methods')}</CardTitle>
            <CardDescription>{t('admin_fees.payment_methods_desc', 'Distribution by payment method')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.methods_chart_placeholder', 'Payment methods chart will be rendered here')}</p>
            </div>
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
