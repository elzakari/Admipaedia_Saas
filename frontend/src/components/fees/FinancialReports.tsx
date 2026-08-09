import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Calendar, BarChart4, PieChart, TrendingUp, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useFeesOverview } from '../../hooks/useFeesOverview';
import { formatCurrency } from '../../lib/utils';

const FinancialReports = () => {
  const { t } = useTranslation();
  const [reportPeriod, setReportPeriod] = useState('current-term');
  const { recentPayments, overdueFees, metrics, isLoadingOverview, summaryQuery } = useFeesOverview();
  const totalRevenue = Number(metrics.totalCollected ?? 0);
  const outstanding = Number(metrics.outstandingFees ?? 0);
  const collectionRate = Number(metrics.collectionRate ?? 0);
  const serverDefaulters = Number((summaryQuery.data as any)?.defaulters_count ?? NaN);
  const defaulterCount = Number.isFinite(serverDefaulters) && serverDefaulters > 0
    ? serverDefaulters
    : (metrics.overdueCount && metrics.overdueCount > 0 ? metrics.overdueCount : overdueFees.length);
  const recentPaymentsCount = Number(
    Number.isFinite(Number((summaryQuery.data as any)?.recent_payments_tracked))
      ? Number((summaryQuery.data as any).recent_payments_tracked)
      : recentPayments.length
  );
  const reportCurrency = useMemo(() => {
    const fromResp =
      ((overdueFees as any[])?.[0]?.currency as string | undefined) ||
      ((recentPayments as any[])?.[0]?.currency as string | undefined);
    return fromResp || 'XOF';
  }, [overdueFees, recentPayments]);

  const paymentMethodRows = useMemo(
    () => Object.entries(metrics.paymentMethodCounts || {})
      .sort((a, b) => b[1] - a[1])
      .map(([method, count]) => ({ method, count })),
    [metrics.paymentMethodCounts]
  );

  const topDefaulters = useMemo(
    () => overdueFees
      .slice()
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 5),
    [overdueFees]
  );

  const recentPaymentsRows = useMemo(
    () => recentPayments.slice(0, 8),
    [recentPayments]
  );

  const exportReport = (reportName: string, rows: Array<Record<string, string | number>>) => {
    if (rows.length === 0) {
      toast.info(t('admin_fees.no_report_data_to_export', 'No report data available to export.'));
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${reportName}-${reportPeriod}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t('admin_fees.report_export_ready', 'Report export is ready.'));
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle>{t('admin_fees.financial_reports', 'Financial Reports')}</CardTitle>
            <CardDescription>{t('admin_fees.financial_reports_desc', 'Generate and view comprehensive financial reports')}</CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <option value="current-term">{t('admin_fees.current_term', 'Current Term')}</option>
                <option value="previous-term">{t('admin_fees.previous_term', 'Previous Term')}</option>
                <option value="current-year">{t('admin_fees.current_academic_year', 'Current Academic Year')}</option>
                <option value="previous-year">{t('admin_fees.previous_academic_year', 'Previous Academic Year')}</option>
                <option value="custom">{t('admin_fees.custom_period', 'Custom Period')}</option>
              </select>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print', 'Print')}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('financial-summary', [
                {
                  period: reportPeriod,
                  total_revenue: totalRevenue,
                  outstanding_balance: outstanding,
                  collection_rate: collectionRate,
                  defaulters: defaulterCount,
                  recent_payments: recentPaymentsCount
                }
              ])}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('common.export', 'Export')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_fees.total_revenue', 'Total Revenue')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalRevenue, reportCurrency)}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_fees.outstanding', 'Outstanding')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(outstanding, reportCurrency)}</p>
                </div>
                <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_fees.collection_rate_title', 'Collection Rate')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{collectionRate}%</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_fees.defaulters', 'Defaulters')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{defaulterCount}</p>
                </div>
                <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {t('admin_fees.recent_payments_tracked', 'Recent payments tracked in this report view: ')}<span className="font-semibold">{recentPaymentsCount}</span>
          </div>
          
          {/* Report Sections */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.payment_methods', 'Payment Methods')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.payment_methods_desc', 'Distribution by payment method')}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport(
                      'payment-method-distribution',
                      paymentMethodRows.map((row) => ({ payment_method: row.method, payment_count: row.count }))
                    )}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t('common.export', 'Export')}
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  {paymentMethodRows.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.no_payment_methods', 'No payment method activity available yet.')}</div>
                  ) : paymentMethodRows.map((row) => (
                    <div key={row.method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{row.method.replace(/_/g, ' ')}</span>
                        <span className="text-gray-500 dark:text-gray-400">{row.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-indigo-600"
                          style={{ width: `${Math.max(10, (row.count / Math.max(recentPaymentsCount, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.outstanding_fees', 'Outstanding Fees')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.outstanding_fees_desc', 'Highest-priority overdue accounts')}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport(
                      'outstanding-fees',
                      topDefaulters.map((row: any) => ({
                        student_name: row.student_name || `Student ${row.student_id}`,
                        class_name: row.class_name || '',
                        balance: Number(row.balance || 0),
                        due_date: row.due_date || '',
                        days_overdue: Number(row.days_overdue || 0)
                      }))
                    )}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t('common.export', 'Export')}
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  {topDefaulters.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.no_defaulters', 'No overdue balances at the moment.')}</div>
                  ) : topDefaulters.map((record: any) => (
                    <div key={record.id} className="rounded-lg border border-gray-100 dark:border-slate-700 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{record.student_name || `Student ${record.student_id}`}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{record.class_name || '—'} • {record.days_overdue || 0} {t('admin_fees.days_label', 'days')}</div>
                        </div>
                        <div className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(Number(record.balance || 0), record.currency || reportCurrency)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.recent_payments', 'Recent Payments')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.recent_payments_desc', 'Latest completed fee payments in the current reporting view')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport(
                    'recent-payments',
                    recentPaymentsRows.map((payment: any) => ({
                      student_name: payment.student_name || '',
                      amount: Number(payment.amount || 0),
                      currency: payment.currency || reportCurrency,
                      payment_method: payment.payment_method || '',
                      payment_date: payment.payment_date || '',
                      reference_number: payment.reference_number || ''
                    }))
                  )}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('common.export', 'Export')}
                </Button>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recentPaymentsRows.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.no_recent_payments', 'No recent payments available.')}</div>
                  ) : recentPaymentsRows.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-slate-700 px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{payment.student_name || t('admin_fees.student_payment', 'Student payment')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{payment.payment_method || 'payment'} • {payment.payment_date || '—'}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(payment.amount || 0), payment.currency || reportCurrency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Available Reports */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.available_reports', 'Available Reports')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.available_reports_desc', 'Generate detailed financial reports')}</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        name: t('admin_fees.collection_summary', 'Collection Summary'),
                        icon: <BarChart4 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
                        exportRows: [{
                          period: reportPeriod,
                          total_revenue: totalRevenue,
                          outstanding_balance: outstanding,
                          collection_rate: collectionRate,
                        }]
                      },
                      {
                        name: t('admin_fees.outstanding_fees', 'Outstanding Fees'),
                        icon: <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />,
                        exportRows: topDefaulters.map((row: any) => ({
                          student_name: row.student_name || `Student ${row.student_id}`,
                          balance: Number(row.balance || 0),
                          days_overdue: Number(row.days_overdue || 0)
                        }))
                      },
                      {
                        name: t('admin_fees.payment_history', 'Payment History'),
                        icon: <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />,
                        exportRows: recentPaymentsRows.map((row: any) => ({
                          student_name: row.student_name || '',
                          amount: Number(row.amount || 0),
                          payment_method: row.payment_method || '',
                          payment_date: row.payment_date || ''
                        }))
                      },
                      {
                        name: t('admin_fees.defaulters_report', 'Defaulters Report'),
                        icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
                        exportRows: topDefaulters.map((row: any) => ({
                          student_name: row.student_name || `Student ${row.student_id}`,
                          class_name: row.class_name || '',
                          balance: Number(row.balance || 0),
                          due_date: row.due_date || ''
                        }))
                      },
                      {
                        name: t('admin_fees.payment_methods', 'Payment Methods'),
                        icon: <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
                        exportRows: paymentMethodRows.map((row) => ({
                          payment_method: row.method,
                          payment_count: row.count
                        }))
                      },
                      {
                        name: t('admin_fees.term_comparison', 'Term Comparison'),
                        icon: <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
                        exportRows: [{
                          reporting_period: reportPeriod,
                          payments_last_7_days: metrics.paymentsLast7Days,
                          collection_rate: collectionRate,
                          overdue_count: metrics.overdueCount
                        }]
                      }
                  ].map((report, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => exportReport(String(report.name).toLowerCase().replace(/\s+/g, '-'), report.exportRows)}
                      className="flex items-center w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left"
                    >
                      <div className="mr-3">
                        {report.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{report.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin_fees.generate_detailed_report', 'Generate detailed report')}</p>
                      </div>
                      <div className="ml-auto">
                        <Download className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Custom Report Generator */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.custom_report_generator', 'Custom Report Generator')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.custom_report_generator_desc', 'Create customized financial reports')}</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin_fees.report_type', 'Report Type')}</label>
                    <select
                      id="report-type"
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    >
                      <option>{t('admin_fees.collection_summary', 'Collection Summary')}</option>
                      <option>{t('admin_fees.outstanding_fees', 'Outstanding Fees')}</option>
                      <option>{t('admin_fees.payment_history', 'Payment History')}</option>
                      <option>{t('admin_fees.defaulters_report', 'Defaulters Report')}</option>
                      <option>{t('admin_fees.class_wise_collection', 'Class-wise Collection')}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin_fees.date_range', 'Date Range')}</label>
                    <select
                      id="date-range"
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    >
                      <option>{t('admin_fees.current_term', 'Current Term')}</option>
                      <option>{t('admin_fees.previous_term', 'Previous Term')}</option>
                      <option>{t('admin_fees.current_academic_year', 'Current Academic Year')}</option>
                      <option>{t('admin_fees.previous_academic_year', 'Previous Academic Year')}</option>
                      <option>{t('admin_fees.custom_period', 'Custom Period')}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="group-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin_fees.group_by', 'Group By')}</label>
                    <select
                      id="group-by"
                      className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    >
                      <option>{t('admin_fees.class', 'Class')}</option>
                      <option>{t('admin_fees.grade', 'Grade')}</option>
                      <option>{t('admin_fees.payment_method', 'Payment Method')}</option>
                      <option>{t('admin_fees.date', 'Date')}</option>
                      <option>{t('common.none', 'None')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoadingOverview}
                    onClick={() => exportReport('custom-financial-report', [{
                      period: reportPeriod,
                      total_revenue: totalRevenue,
                      outstanding_balance: outstanding,
                      collection_rate: collectionRate,
                      defaulters: defaulterCount,
                      recent_payments: recentPaymentsCount
                    }])}
                  >
                    {t('admin_fees.generate_report_btn', 'Generate Report')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;
