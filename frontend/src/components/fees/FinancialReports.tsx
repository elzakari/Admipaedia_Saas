import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Download, Calendar, Filter, ChevronDown, BarChart4, PieChart, TrendingUp, FileText, Printer } from 'lucide-react';
import { feesService } from '../../services/feesService';
import financialService from '../../services/financialService';

const FinancialReports = () => {
  const { t } = useTranslation();
  const [reportPeriod, setReportPeriod] = useState('current-term');
  const { data: summary } = useQuery({
    queryKey: ['fees', 'reports', 'summary'],
    queryFn: () => financialService.getFinancialSummary(undefined, undefined, new Date().getFullYear().toString())
  });
  const { data: overdueResp } = useQuery({
    queryKey: ['fees', 'reports', 'overdue'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 100 })
  });
  const { data: paymentsResp } = useQuery({
    queryKey: ['fees', 'reports', 'payments'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 100 })
  });

  const totalRevenue = Number(summary?.total_revenue ?? 0);
  const outstanding = Number(summary?.outstanding_fees ?? 0);
  const collectionRate = Number(summary?.collection_rate ?? 0);
  const defaulterCount = Array.isArray(overdueResp?.overdue_fees) ? overdueResp.overdue_fees.length : 0;
  const recentPaymentsCount = Array.isArray(paymentsResp?.payments) ? paymentsResp.payments.length : 0;
  
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
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print', 'Print')}
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export', 'Export')}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_fees.total_revenue', 'Total Revenue')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalRevenue.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{outstanding.toLocaleString()}</p>
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
            {/* Revenue Trends */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.revenue_trends', 'Revenue Trends')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.revenue_trends_desc', 'Monthly fee collection for the current term')}</p>
                </div>
                <button className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <Download className="h-3 w-3 mr-1" />
                  {t('common.export', 'Export')}
                </button>
              </div>
              <div className="p-4">
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.revenue_trend_chart_placeholder', 'Revenue trend chart will be rendered here')}</p>
                </div>
              </div>
            </div>
            
            {/* Payment Method Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.payment_methods', 'Payment Methods')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.payment_methods_desc', 'Distribution by payment method')}</p>
                </div>
                <div className="p-4">
                  <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.payment_method_chart_placeholder', 'Payment method chart will be rendered here')}</p>
                  </div>
                </div>
              </div>
              
              {/* Class-wise Collection */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin_fees.class_wise_collection', 'Class-wise Collection')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_fees.class_wise_collection_desc', 'Fee collection by class')}</p>
                </div>
                <div className="p-4">
                  <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">{t('admin_fees.class_wise_chart_placeholder', 'Class-wise collection chart will be rendered here')}</p>
                  </div>
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
                    { name: t('admin_fees.collection_summary', 'Collection Summary'), icon: <BarChart4 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> },
                    { name: t('admin_fees.outstanding_fees', 'Outstanding Fees'), icon: <FileText className="h-5 w-5 text-red-600 dark:text-red-400" /> },
                    { name: t('admin_fees.payment_history', 'Payment History'), icon: <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" /> },
                    { name: t('admin_fees.defaulters_report', 'Defaulters Report'), icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" /> },
                    { name: t('admin_fees.class_wise_collection', 'Class-wise Collection'), icon: <BarChart4 className="h-5 w-5 text-blue-600 dark:text-blue-400" /> },
                    { name: t('admin_fees.term_comparison', 'Term Comparison'), icon: <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" /> }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
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
                    </div>
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
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800">
                    {t('admin_fees.generate_report_btn', 'Generate Report')}
                  </button>
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
