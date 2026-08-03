import React, { useState, useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  Calendar,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  Database,
  Key,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { settingsService } from '../../services';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student' | 'parent';
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' | 'api';
  metadata?: Record<string, any>;
}

interface AuditLogFilters {
  searchTerm: string;
  category: string;
  severity: string;
  status: string;
  userRole: string;
  dateFrom: string;
  dateTo: string;
  action: string;
  resource: string;
}

const AuditLogs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<AuditLogFilters>({
    searchTerm: '',
    category: 'all',
    severity: 'all',
    status: 'all',
    userRole: 'all',
    dateFrom: '',
    dateTo: '',
    action: 'all',
    resource: 'all'
  });

  // Fetch audit logs
  const { data: auditResp, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', currentPage, pageSize, filters],
    queryFn: () => settingsService.getAuditLogs({
      page: currentPage,
      pageSize,
      ...filters
    }),
    placeholderData: keepPreviousData
  } as any);

  const auditLogs: AuditLog[] = (auditResp as any)?.data ?? [];
  const pagination = (auditResp as any)?.pagination;

  // Fetch audit statistics
  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats', filters],
    queryFn: () => settingsService.getAuditStats(filters)
  });

  // Fetch available filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-filter-options'],
    queryFn: () => settingsService.getAuditFilterOptions()
  });

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      category: 'all',
      severity: 'all',
      status: 'all',
      userRole: 'all',
      dateFrom: '',
      dateTo: '',
      action: 'all',
      resource: 'all'
    });
    setCurrentPage(1);
  };

  const handleExportLogs = async () => {
    setIsExporting(true);
    try {
      const data = await settingsService.exportAuditLogs(filters);
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('admin_settings.export_complete', 'Export Complete'),
        description: t('admin_settings.export_complete_desc', 'Audit logs have been exported successfully.'),
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: t('admin_settings.export_failed', 'Export Failed'),
        description: error.message || t('admin_settings.export_failed_desc', 'Failed to export audit logs'),
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      const err = (result as any)?.error as any;
      if (err) throw err;
      toast({
        title: t('admin_settings.logs_refreshed', 'Logs Refreshed'),
        description: t('admin_settings.logs_refreshed_desc', 'Audit logs have been refreshed successfully.'),
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: t('admin_settings.refresh_failed', 'Refresh Failed'),
        description: error.message || t('admin_settings.refresh_failed_desc', 'Failed to refresh audit logs'),
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('common.success', 'Success')}</Badge>;
      case 'failure':
        return <Badge variant="destructive">{t('common.failed', 'Failed')}</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('common.warning', 'Warning')}</Badge>;
      default:
        return <Badge variant="outline">{t('common.unknown', 'Unknown')}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">{t('admin_settings.severity_low', 'Low')}</Badge>;
      case 'medium':
        return <Badge variant="secondary">{t('admin_settings.severity_medium', 'Medium')}</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">{t('admin_settings.severity_high', 'High')}</Badge>;
      case 'critical':
        return <Badge variant="destructive">{t('admin_settings.severity_critical', 'Critical')}</Badge>;
      default:
        return <Badge variant="outline">{t('common.unknown', 'Unknown')}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <Key className="h-4 w-4" />;
      case 'authorization': return <Shield className="h-4 w-4" />;
      case 'data_access': return <Eye className="h-4 w-4" />;
      case 'data_modification': return <Database className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'api': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return t('common.no_details', 'No additional details');
    
    const formatted = Object.entries(details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    
    return formatted.length > 100 ? formatted.substring(0, 100) + '...' : formatted;
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== 'all').length;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.audit_logs', 'Journaux d\'audit')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.audit_logs_desc', 'Consulter l\'activité du système et les actions des utilisateurs')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('common.refresh', 'Actualiser')}
          </Button>
          <Button 
            onClick={handleExportLogs}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('common.export', 'Exporter')}
          </Button>
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('common.filters', 'Filtres')} {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {auditStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('admin_settings.total_logs', 'Total des journaux')}</p>
                  <p className="text-2xl font-bold">{auditStats.totalLogs.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('admin_settings.success_rate', 'Taux de réussite')}</p>
                  <p className="text-2xl font-bold">{auditStats.successRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('admin_settings.critical_events', 'Événements critiques')}</p>
                  <p className="text-2xl font-bold">{auditStats.criticalEvents}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('admin_settings.active_users', 'Utilisateurs actifs')}</p>
                  <p className="text-2xl font-bold">{auditStats.uniqueUsers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filters', 'Filtres')}
            </CardTitle>
            <CardDescription>{t('admin_settings.filter_audit_logs_desc', 'Filtrer les journaux d\'audit selon divers critères')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">{t('common.search', 'Rechercher')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder={t('admin_settings.search_logs_placeholder', 'Rechercher des journaux…')}
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">{t('common.category', 'Catégorie')}</Label>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t('common.all_categories', 'Toutes les catégories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all_categories', 'Toutes les catégories')}</SelectItem>
                    <SelectItem value="authentication">{t('admin_settings.authentication', 'Authentification')}</SelectItem>
                    <SelectItem value="authorization">{t('admin_settings.authorization', 'Autorisation')}</SelectItem>
                    <SelectItem value="data_access">{t('admin_settings.data_access', 'Accès aux données')}</SelectItem>
                    <SelectItem value="data_modification">{t('admin_settings.data_modification', 'Modification de données')}</SelectItem>
                    <SelectItem value="system">{t('admin_settings.system', 'Système')}</SelectItem>
                    <SelectItem value="security">{t('admin_settings.security', 'Sécurité')}</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="severity">{t('admin_settings.severity', 'Gravité')}</Label>
                <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder={t('common.all_severities', 'Toutes les gravités')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all_severities', 'Toutes les gravités')}</SelectItem>
                    <SelectItem value="low">{t('admin_settings.severity_low', 'Faible')}</SelectItem>
                    <SelectItem value="medium">{t('admin_settings.severity_medium', 'Moyenne')}</SelectItem>
                    <SelectItem value="high">{t('admin_settings.severity_high', 'Élevée')}</SelectItem>
                    <SelectItem value="critical">{t('admin_settings.severity_critical', 'Critique')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">{t('common.status', 'Statut')}</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('common.all_statuses', 'Tous les statuts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all_statuses', 'Tous les statuts')}</SelectItem>
                    <SelectItem value="success">{t('common.success', 'Réussite')}</SelectItem>
                    <SelectItem value="failure">{t('common.failed', 'Échec')}</SelectItem>
                    <SelectItem value="warning">{t('common.warning', 'Avertissement')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userRole">{t('common.role', 'Rôle utilisateur')}</Label>
                <Select value={filters.userRole} onValueChange={(value) => handleFilterChange('userRole', value)}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder={t('common.all_roles', 'Tous les rôles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all_roles', 'Tous les rôles')}</SelectItem>
                    <SelectItem value="admin">{t('roles.admin', 'Administrateur')}</SelectItem>
                    <SelectItem value="teacher">{t('roles.teacher', 'Enseignant')}</SelectItem>
                    <SelectItem value="student">{t('roles.student', 'Élève')}</SelectItem>
                    <SelectItem value="parent">{t('roles.parent', 'Parent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom">{t('admin_settings.from_date', 'Du')}</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo">{t('admin_settings.to_date', 'Au')}</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                {t('admin_settings.clear_all_filters', 'Réinitialiser tous les filtres')}
              </Button>
              <div className="text-sm text-gray-500">
                {filters.searchTerm || filters.category !== 'all' || filters.severity !== 'all' || filters.status !== 'all' || filters.userRole !== 'all' || filters.dateFrom || filters.dateTo
                  ? t('admin_settings.active_filters', '{{count}} filtre(s) actif(s)', { count: getActiveFiltersCount() })
                  : t('admin_settings.active_filters', '0 filtre actif', { count: 0 })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('admin_settings.activity_log', 'Journal d\'activité')}
          </CardTitle>
          <CardDescription>
            {auditLogs.length === 0 
              ? t('admin_settings.no_audit_logs_found', 'Aucun journal d\'audit ne correspond à vos critères.')
              : t('admin_settings.showing_audit_logs', 'Affichage de {{count}} entrée(s) du journal d\'audit', { count: auditLogs.length })
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('admin_settings.no_audit_logs_empty_state', 'Aucun journal d\'audit trouvé. Ajustez vos filtres ou réessayez plus tard.')}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.time', 'Heure')}</TableHead>
                      <TableHead>{t('common.user', 'Utilisateur')}</TableHead>
                      <TableHead>{t('common.action', 'Action')}</TableHead>
                      <TableHead>{t('admin_settings.resource', 'Ressource')}</TableHead>
                      <TableHead>{t('common.category', 'Catégorie')}</TableHead>
                      <TableHead>{t('admin_settings.severity', 'Gravité')}</TableHead>
                      <TableHead>{t('common.status', 'Statut')}</TableHead>
                      <TableHead>{t('common.details', 'Détails')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log: AuditLog) => (
                      <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</div>
                              <div className="text-xs text-gray-500">{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{log.userName}</div>
                              <div className="text-xs text-gray-500">{log.userRole}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatAction(log.action)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{log.resource}</div>
                            <div className="text-xs text-gray-500">{log.resourceId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(log.category)}
                            <span className="text-xs">{formatAction(log.category)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(log.severity)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {formatDetails(log.details)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              IP: {log.ipAddress}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
