import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  RefreshCw,
  Clock,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import { settingsService } from '../../services';
import { format } from 'date-fns';
import { ADMIN_SECONDARY_BUTTON_CLASS } from '../../lib/adminUi';

const NotificationLogs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch branch-scoped notification logs using react-query
  const { data: logsResp, isLoading, isError, refetch } = useQuery({
    queryKey: ['notification-logs', currentPage, pageSize, channelFilter, statusFilter],
    queryFn: () => settingsService.getNotificationLogs({
      page: currentPage,
      per_page: pageSize,
      channel: channelFilter,
      status: statusFilter
    }),
    placeholderData: keepPreviousData
  });

  const logs = logsResp?.logs ?? [];
  const summary = logsResp?.summary ?? {
    total_count: 0,
    total_sms: 0,
    total_email: 0,
    total_success: 0,
    total_failed: 0
  };
  const pagination = logsResp?.pagination ?? {
    total: 0,
    pages: 1,
    page: 1,
    per_page: 10
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: t('admin_settings.logs_refreshed', 'Logs Refreshed'),
        description: t('admin_settings.notif_logs_refreshed_desc', 'Notification gateway logs have been successfully updated.'),
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: t('admin_settings.refresh_failed', 'Refresh Failed'),
        description: error?.message || t('admin_settings.refresh_failed_desc', 'Failed to refresh logs'),
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: 'sent' | 'failed') => {
    if (status === 'sent') {
      return (
        <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 font-medium border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t('common.sent', 'Sent')}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 gap-1 font-medium border-rose-200">
        <AlertCircle className="h-3.5 w-3.5" />
        {t('common.failed', 'Failed')}
      </Badge>
    );
  };

  const getChannelBadge = (channel: 'sms' | 'email') => {
    if (channel === 'sms') {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 gap-1 font-medium">
          <MessageSquare className="h-3.5 w-3.5" />
          {t('common.sms', 'SMS')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 gap-1 font-medium">
        <Mail className="h-3.5 w-3.5" />
        {t('common.email', 'Email')}
      </Badge>
    );
  };

  const calculateSuccessRate = () => {
    const total = summary.total_success + summary.total_failed;
    if (total === 0) return 100;
    return Math.round((summary.total_success / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('admin_settings.loading_logs', 'Loading notification logs...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('admin_settings.notification_logs_title', 'Notification Delivery Logs')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin_settings.notification_logs_subtitle', 'Monitor branch-level SMS and email delivery activity without leaving settings.')}
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className={`flex items-center gap-2 self-stretch sm:self-auto shadow-sm ${ADMIN_SECONDARY_BUTTON_CLASS}`}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Modern Analytical Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{t('admin_settings.total_outbound', 'Total Outbound')}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{summary.total_count}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{t('admin_settings.success_rate', 'Delivery Rate')}</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{calculateSuccessRate()}%</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{t('admin_settings.sms_sent', 'SMS Delivery')}</p>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{summary.total_sms}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
              <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{t('admin_settings.email_sent', 'Email Delivery')}</p>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{summary.total_email}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isError && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            {t('admin_settings.failed_load_logs', 'Notification logs are temporarily unavailable. Check branch context or refresh to retry.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Panel */}
      <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 self-start md:self-auto">
            <Filter className="h-4.5 w-4.5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.filter_by', 'Filter logs:')}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="w-full sm:w-48">
              <Select value={channelFilter} onValueChange={(val) => { setChannelFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <SelectValue placeholder={t('common.all_channels', 'All Channels')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_channels', 'All Channels')}</SelectItem>
                  <SelectItem value="sms">{t('common.sms', 'SMS Gateway')}</SelectItem>
                  <SelectItem value="email">{t('common.email', 'Email SMTP')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <SelectValue placeholder={t('common.page_size', 'Page size')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <SelectValue placeholder={t('common.all_statuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_statuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="sent">{t('common.sent', 'Delivered')}</SelectItem>
                  <SelectItem value="failed">{t('common.failed', 'Failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Logs Table */}
      <Card className="border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full">
                <Info className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold text-center">
                {t('admin_settings.no_notif_logs_found', 'No notification logs found.')}
              </p>
              <p className="text-gray-400 text-xs text-center max-w-sm">
                {t('admin_settings.no_notif_logs_desc', 'Sent and failed branch notifications appear here after SMS or email delivery attempts.' )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow>
                    <TableHead className="w-[180px] font-semibold">{t('common.timestamp', 'Timestamp')}</TableHead>
                    <TableHead className="w-[120px] font-semibold">{t('common.channel', 'Channel')}</TableHead>
                    <TableHead className="w-[200px] font-semibold">{t('common.recipient', 'Recipient')}</TableHead>
                    <TableHead className="font-semibold">{t('common.message_content', 'Message / Delivery Details')}</TableHead>
                    <TableHead className="w-[140px] font-semibold">{t('common.status', 'Status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/50 transition-colors">
                      <TableCell className="align-top py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {format(new Date(log.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {getChannelBadge(log.channel)}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{log.recipient}</span>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="space-y-1 max-w-lg">
                          {log.subject && (
                            <div className="text-xs font-semibold text-gray-500">
                              Subject: {log.subject}
                            </div>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
                            {log.content}
                          </p>
                          {log.error_message && (
                            <div className="text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30 flex items-start gap-1.5 mt-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Error:</strong> {log.error_message}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {getStatusBadge(log.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleek Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500">
            {t('common.showing_page', 'Showing page {{page}} of {{pages}} ({{total}} total events)', {
              page: pagination.page,
              pages: pagination.pages,
              total: pagination.total
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`h-8 px-2.5 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
              disabled={currentPage === pagination.pages}
              className={`h-8 px-2.5 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationLogs;
