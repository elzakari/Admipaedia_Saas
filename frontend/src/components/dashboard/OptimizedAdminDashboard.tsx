import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import saasService, { AdminDashboardMetrics } from '../../services/saasService';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useEnhancedDashboardData } from '../../hooks/useEnhancedDashboardData';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../services/websocketService';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { Plus, ArrowRight } from 'lucide-react';
import {
  LazyStatisticsGrid,
  LazyCalendarWidget,
  LazyNotificationList,
  LazyAdvancedAnalyticsWidget,
  LazyEnhancedRealTimeWidget,
  LazyPerformanceDashboardWidget,
} from './LazyDashboardComponents';
import {
  LayoutGrid,
  List,
  RefreshCw,
  Filter,
  Activity,
  Search,
  Download,
  TrendingUp,
  Calendar,
  Bell,
  BarChart3,
  PieChart,
  Gauge,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import PerformanceMonitorWidget from './PerformanceMonitorWidget';
import { exportData } from '../../utils/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { useSwipeable } from 'react-swipeable';

interface DashboardLayout {
  id: string;
  name: string;
  components: string[];
  columns: number;
}

const DASHBOARD_LAYOUTS: DashboardLayout[] = [
  {
    id: 'overview',
    name: 'Overview',
    components: ['statistics', 'calendar', 'notifications', 'realtime'],
    columns: 2,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    components: ['statistics', 'analytics', 'performance', 'realtime'],
    columns: 2,
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    components: ['realtime', 'notifications', 'statistics'],
    columns: 1,
  },
  {
    id: 'compact',
    name: 'Compact',
    components: ['statistics', 'notifications'],
    columns: 1,
  },
];

const COMPONENT_ICONS = {
  statistics: TrendingUp,
  calendar: Calendar,
  notifications: Bell,
  analytics: BarChart3,
  performance: PieChart,
  realtime: Activity,
};

export default function OptimizedAdminDashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { executeAction, quickActions } = useEnhancedNavigation();

  const [liveMetrics, setLiveMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [liveAnalytics, setLiveAnalytics] = useState<any | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<any | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  const fetchLiveMetrics = useCallback(async () => {
    setIsMetricsLoading(true);
    try {
      const tenantId = localStorage.getItem('saas_current_tenant_id') || undefined;
      const [resMetrics, resAnalytics, resTelemetry] = await Promise.all([
        saasService.getAdminDashboardMetrics(tenantId).catch(err => {
          console.error('Failed to fetch live admin metrics:', err);
          return null;
        }),
        saasService.getAdminDashboardAnalytics(tenantId).catch(err => {
          console.error('Failed to fetch live admin analytics:', err);
          return null;
        }),
        saasService.getDashboardTelemetry(tenantId).catch(err => {
          console.error('Failed to fetch live dashboard telemetry:', err);
          return null;
        })
      ]);

      if (resMetrics && resMetrics.success) {
        setLiveMetrics(resMetrics.data);
      }
      if (resAnalytics && resAnalytics.success) {
        setLiveAnalytics(resAnalytics.data);
      }
      if (resTelemetry && resTelemetry.success) {
        setLiveTelemetry(resTelemetry.data);
      }
    } catch (err) {
      console.error('Failed in fetchLiveMetrics orchestration:', err);
    } finally {
      setIsMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMetrics();
  }, [fetchLiveMetrics]);

  const handleQuickActionClick = (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId);
    if (action) {
      executeAction(action);
    }
  };

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedLayout, setSelectedLayout] = useLocalStorage('dashboard-layout', 'overview');
  
  const { filters } = useDashboardFilters();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage('dashboard-view', 'grid');

  const [announcement, setAnnouncement] = useState('');
  const [showPerformance, setShowPerformance] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--admiperf-panel-width', showPerformance ? '340px' : '0px');
    return () => {
      root.style.setProperty('--admiperf-panel-width', '0px');
    };
  }, [showPerformance]);

  // Handle announcements with expiration
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear announcement after 3 seconds to allow re-announcing the same message
    setTimeout(() => {
      setAnnouncement(prev => prev === message ? '' : prev);
    }, 3000);
  }, []);

  // Get current layout configuration
  const currentLayout = useMemo(() => {
    const found = DASHBOARD_LAYOUTS.find(layout => layout.id === selectedLayout);
    return found ?? DASHBOARD_LAYOUTS[0];
  }, [selectedLayout]) as DashboardLayout;

  // Filter components based on search query
  const filteredComponents = useMemo(() => {
    if (!filters.searchQuery) return currentLayout.components;
    const query = filters.searchQuery.toLowerCase();
    return currentLayout.components.filter(comp =>
      comp.toLowerCase().includes(query) ||
      (COMPONENT_ICONS[comp as keyof typeof COMPONENT_ICONS] && comp.toLowerCase().includes(query))
    );
  }, [currentLayout.components, filters.searchQuery]);

  // Enhanced dashboard data with selective loading
  const dashboardData = useEnhancedDashboardData({
    enableStatistics: currentLayout.components.includes('statistics'),
    enableEvents: currentLayout.components.includes('calendar'),
    enableNotifications: currentLayout.components.includes('notifications'),
    startDate: filters.startDate,
    endDate: filters.endDate,
    category: filters.category
  });

  // Determine if gradient or casaos theme is active
  const isGradientTheme = theme === 'gradient';
  const isCasaosTheme = theme === 'casaos';

  // Dynamic classes based on theme
  const containerClasses = isCasaosTheme
    ? 'space-y-4 p-4 lg:p-6 max-w-[1600px] mx-auto'
    : isGradientTheme
      ? 'gradient-bg min-h-screen'
      : 'space-y-4';

  const cardClasses = isCasaosTheme
    ? 'glass-card border-0 shadow-2xl'
    : isGradientTheme
      ? 'gradient-card'
      : '';

  // Handle refresh with loading state
  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple refreshes
    setRefreshing(true);
    announce('Refreshing dashboard data...');
    try {
      await Promise.all([
        dashboardData.refreshAll(),
        fetchLiveMetrics()
      ]);
      announce('Data update complete.');
    } catch (error) {
      announce('Failed to refresh data.');
    } finally {
      setRefreshing(false);
    }
  }, [dashboardData, announce, refreshing, fetchLiveMetrics]);

  // Live data invalidation via WebSocket
  // Live data invalidation via WebSocket
  const { subscribe } = useWebSocket('/dashboard');
  useEffect(() => {
    const unsubscribe = subscribe('data_invalidated', (event: any) => {
      console.log('Dashboard data invalidated via WebSocket:', event.type);
      if (event.type === 'statistics' || event.type === 'all') {
        dashboardData.statistics?.refresh();
      }
      if (event.type === 'events' || event.type === 'all') {
        dashboardData.events?.mutate();
      }
      if (event.type === 'notifications' || event.type === 'all') {
        dashboardData.notifications?.mutate();
      }

      if (event.type === 'all') {
        dashboardData.refreshAll();
      }
    });

    return () => unsubscribe();
  }, [subscribe, dashboardData]);

  // Swipe handlers for mobile view switching
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const layouts = DASHBOARD_LAYOUTS.map(l => l.id);
      const currentIndex = layouts.indexOf(selectedLayout);
      if (currentIndex < layouts.length - 1) {
        const nextLayout = DASHBOARD_LAYOUTS[currentIndex + 1];
        if (nextLayout) {
          setSelectedLayout(nextLayout.id);
          announce(`Swiped to ${nextLayout.name} layout`);
        }
      }
    },
    onSwipedRight: () => {
      const layouts = DASHBOARD_LAYOUTS.map(l => l.id);
      const currentIndex = layouts.indexOf(selectedLayout);
      if (currentIndex > 0) {
        const prevLayout = DASHBOARD_LAYOUTS[currentIndex - 1];
        if (prevLayout) {
          setSelectedLayout(prevLayout.id);
          announce(`Swiped to ${prevLayout.name} layout`);
        }
      }
    },
    trackMouse: false
  });

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    const stats = dashboardData.statistics?.statistics || [];
    if (stats.length === 0) return;

    exportData(stats, {
      format,
      filename: `dashboard_stats_${new Date().toISOString().split('T')[0]}`,
      title: 'Dashboard Statistics Report',
      fields: ['title', 'value', 'change_value', 'color'],
      headers: ['Metric', 'Current Value', 'Change (%)', 'Category']
    });
  }, [dashboardData.statistics]);

  // Render component based on type
  const renderComponent = (componentType: string, index: number) => {
    const baseProps = {
      filters,
      refreshing,
      onRefresh: handleRefresh,
      className: "h-full"
    };

    switch (componentType) {
      case 'statistics':
        return (
          <LazyStatisticsGrid
            key={`${componentType}-${index}`}
            {...baseProps}
          />
        );
      case 'calendar':
        return (
          <LazyCalendarWidget
            key={`${componentType}-${index}`}
            {...baseProps}
          />
        );
      case 'notifications':
        return (
          <LazyNotificationList
            key={`${componentType}-${index}`}
            {...baseProps}
          />
        );
      case 'analytics':
        return (
          <LazyAdvancedAnalyticsWidget
            key={`${componentType}-${index}`}
            {...baseProps}
            liveMetrics={liveMetrics || undefined}
            liveTelemetry={liveTelemetry || undefined}
            isLoading={isMetricsLoading}
          />
        );
      case 'performance':
        return (
          <LazyPerformanceDashboardWidget
            key={`${componentType}-${index}`}
            {...baseProps}
            liveMetrics={liveMetrics || undefined}
            liveAnalytics={liveAnalytics || undefined}
            liveTelemetry={liveTelemetry || undefined}
            isLoading={isMetricsLoading}
          />
        );
      case 'realtime':
        return (
          <LazyEnhancedRealTimeWidget
            key={`${componentType}-${index}`}
            {...baseProps}
            liveMetrics={liveMetrics || undefined}
            liveAnalytics={liveAnalytics || undefined}
            liveTelemetry={liveTelemetry || undefined}
            isLoading={isMetricsLoading}
          />
        );
      default:
        return null;
    }
  };

  // Grid layout classes
  const gridClasses = useMemo(() => {
    if (isMobile) return 'grid grid-cols-1 gap-4';

    // Special handling for casaos layout to use its own grid
    if (selectedLayout === 'casaos') return 'space-y-0';

    const cols = viewMode === 'list' ? 1 : currentLayout.columns;
    return `grid grid-cols-1 lg:grid-cols-${cols} gap-4`;
  }, [isMobile, viewMode, currentLayout.columns, selectedLayout]);

  return (
    <div className={cn(containerClasses, "pt-4 sm:pt-6 pb-20 md:pb-6")} {...(isMobile ? swipeHandlers : {})}>
      {/* Visually hidden ARIA live region for status announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0'
        }}
      >
        {announcement}
      </div>
      <div className={isCasaosTheme ? 'space-y-8' : isGradientTheme ? 'p-6 space-y-6' : 'space-y-6'}>
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className={cn(
              "text-3xl font-black tracking-tight drop-shadow-sm",
              isCasaosTheme ? "text-white" : isGradientTheme ? 'gradient-text-primary' : 'text-gray-900'
            )}>
              {t('common.dashboard')}
            </h1>
            <p className={cn(
              "mt-1 text-sm font-medium",
              isCasaosTheme ? "text-slate-500" : isGradientTheme ? 'gradient-text-secondary' : 'text-gray-500'
            )}>
              {t('dashboard.subtitle', 'Monitor and manage your educational platform')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className={cn(
              "flex items-center rounded-xl p-1 shrink-0",
              isCasaosTheme ? "bg-white/5 border border-white/5 backdrop-blur-md" : isGradientTheme ? 'gradient-glass border-0' : 'bg-gray-100 border'
            )}>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setViewMode('grid'); announce('View mode changed to grid.'); }}
                className={cn(
                  "h-8 w-8 p-0 rounded-lg transition-all",
                  isCasaosTheme && viewMode === 'grid' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "",
                  isGradientTheme && viewMode === 'grid' ? 'gradient-primary-btn' : ''
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setViewMode('list'); announce('View mode changed to list.'); }}
                className={cn(
                  "h-8 w-8 p-0 rounded-lg transition-all",
                  isCasaosTheme && viewMode === 'list' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "",
                  isGradientTheme && viewMode === 'list' ? 'gradient-primary-btn' : ''
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPerformance(!showPerformance)}
              className={cn(
                "h-10 rounded-xl transition-all gap-2 px-4 hidden md:flex",
                isCasaosTheme 
                  ? showPerformance 
                    ? "bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-600/20" 
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Gauge className={cn("h-4 w-4", showPerformance ? "text-white" : "text-slate-400")} />
              <span>{t('common.performance')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                "h-10 rounded-xl transition-all gap-2 px-4",
                isCasaosTheme ? "bg-white/5 border-white/10 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                isGradientTheme ? 'gradient-glass border-0 hover:gradient-primary-btn' : ''
              )}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing ? 'animate-spin' : '')} />
              <span>{t('common.refresh')}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 rounded-xl transition-all gap-2 px-4",
                    isCasaosTheme ? "bg-white/5 border-white/10 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                    isGradientTheme ? 'gradient-glass border-0 hover:gradient-primary-btn' : ''
                  )}
                >
                  <Download className="h-4 w-4" />
                  <span>{t('common.export')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuLabel>{t('common.export')} {t('common.dashboard')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                  {t('dashboard.export_csv', 'CSV Format')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  {t('dashboard.export_pdf', 'PDF Report')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Layout Selector */}
        <Card className={cn(
          "p-5 overflow-hidden transition-all duration-300",
          isCasaosTheme ? "glass-card border-0" : cardClasses
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <h3 className={cn(
                "font-semibold text-sm tracking-wide uppercase",
                isCasaosTheme ? "text-slate-400" : isGradientTheme ? 'gradient-text-primary' : 'text-gray-900'
              )}>
                {t('dashboard.layout_config')}
              </h3>
              <Select
                value={selectedLayout}
                onValueChange={(layoutId) => {
                  setSelectedLayout(layoutId);
                  const layout = DASHBOARD_LAYOUTS.find(l => l.id === layoutId);
                  announce(`Switched to ${layout?.name || layoutId} layout.`);
                }}
              >
                <SelectTrigger className={cn(
                  "w-56 h-10 rounded-xl",
                  isCasaosTheme ? "bg-white/5 border-white/10 text-white" : isGradientTheme ? 'gradient-glass border-0' : ''
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isCasaosTheme ? "bg-[#1E293B] border-white/10 text-white" : ""}>
                  {DASHBOARD_LAYOUTS.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      <div className="flex items-center gap-2">
                        <span>{layout.name}</span>
                        <Badge variant="secondary" className={cn(
                          "text-[10px] uppercase font-bold",
                          isCasaosTheme ? "bg-blue-600/20 text-blue-400 border-blue-500/20" : ""
                        )}>
                          {layout.id === 'casaos' ? 'High-Fidelity' : `${layout.components.length} widgets`}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Component Indicators */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
              {currentLayout.components.map((component) => {
                const Icon = COMPONENT_ICONS[component as keyof typeof COMPONENT_ICONS];
                const componentColors: Record<string, string> = {
                  statistics: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                  calendar: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
                  notifications: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
                  analytics: 'text-green-500 bg-green-500/10 border-green-500/20',
                  performance: 'text-red-500 bg-red-500/10 border-red-500/20',
                  realtime: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
                };
                const colorClass = componentColors[component] || 'text-slate-400 bg-white/5 border-white/10';

                return (
                  <div
                    key={component}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border shadow-sm",
                      isCasaosTheme 
                        ? colorClass 
                        : isGradientTheme
                          ? 'gradient-glass gradient-text-secondary'
                          : 'bg-gray-100'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t(`dashboard.components.${component.replace('casaos_', '')}`, component)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card className={cn(
          "p-6 transition-all duration-300",
          isCasaosTheme ? "glass-card border-0 shadow-2xl" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl"
        )}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={cn(
              "text-lg font-bold tracking-tight",
              isCasaosTheme ? "text-white" : "text-slate-900 dark:text-white"
            )}>
              {t('common.quick_actions', 'Quick Actions')}
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              {t('dashboard.quick_actions.shortcuts', 'Shortcuts to frequent tasks')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleQuickActionClick('create-student')}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                isCasaosTheme
                  ? "bg-white/5 border-white/5 hover:bg-white/10"
                  : "bg-slate-50 dark:bg-slate-800/50 hover:bg-white border-slate-100 dark:border-slate-700/50 hover:border-blue-100 dark:hover:border-blue-900/50"
              )}
            >
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-xl group-hover:scale-105 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "block text-sm font-semibold truncate",
                  isCasaosTheme ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>
                  {t('quick_actions.create_student.label', 'Add New Student')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.create_student.description', 'Create student profile')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('view-attendance')}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                isCasaosTheme
                  ? "bg-white/5 border-white/5 hover:bg-white/10"
                  : "bg-slate-50 dark:bg-slate-800/50 hover:bg-white border-slate-100 dark:border-slate-700/50 hover:border-emerald-100 dark:hover:border-emerald-900/50"
              )}
            >
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-xl group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "block text-sm font-semibold truncate",
                  isCasaosTheme ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>
                  {t('quick_actions.view_attendance.label', 'View Attendance')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.view_attendance.description', 'Check daily records')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('generate-report')}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                isCasaosTheme
                  ? "bg-white/5 border-white/5 hover:bg-white/10"
                  : "bg-slate-50 dark:bg-slate-800/50 hover:bg-white border-slate-100 dark:border-slate-700/50 hover:border-purple-100 dark:hover:border-purple-900/50"
              )}
            >
              <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 rounded-xl group-hover:scale-105 transition-transform">
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "block text-sm font-semibold truncate",
                  isCasaosTheme ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>
                  {t('quick_actions.generate_report.label', 'Generate Report')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.generate_report.description', 'Create custom exports')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('open-calendar')}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-amber-500/50",
                isCasaosTheme
                  ? "bg-white/5 border-white/5 hover:bg-white/10"
                  : "bg-slate-50 dark:bg-slate-800/50 hover:bg-white border-slate-100 dark:border-slate-700/50 hover:border-amber-100 dark:hover:border-amber-900/50"
              )}
            >
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-xl group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "block text-sm font-semibold truncate",
                  isCasaosTheme ? "text-white" : "text-slate-800 dark:text-slate-200"
                )}>
                  {t('quick_actions.open_calendar.label', 'Open Calendar')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.open_calendar.description', 'View events & schedules')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
            </button>
          </div>
        </Card>

        {/* Dashboard Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedLayout}-${viewMode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={gridClasses}
            role="list"
            aria-label="Dashboard widgets"
          >
            {filteredComponents.map((component, index) => (
              <motion.div
                key={`${component}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  selectedLayout === 'casaos' ? "" : "min-h-[400px] transition-all duration-300",
                  isCasaosTheme && selectedLayout !== 'casaos' ? "glass-card hover:shadow-blue-600/5 hover:-translate-y-1" : isGradientTheme ? 'gradient-card rounded-2xl' : ''
                )}
                role="listitem"
              >
                {renderComponent(component, index)}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* No Results */}
        {filteredComponents.length === 0 && (
          <Card className={`p-12 text-center ${cardClasses}`}>
            <div className={isGradientTheme ? 'gradient-text-muted' : 'text-gray-500'}>
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className={`text-lg font-semibold mb-2 ${isGradientTheme ? 'gradient-text-primary' : ''}`}>
                No components found
              </h3>
              <p>Try adjusting your search query or select a different layout.</p>
            </div>
          </Card>
        )}

        {/* Performance Indicators */}
        {dashboardData.isLoading && (
          <div className="fixed bottom-4 right-4">
            <Card className={`p-3 flex items-center gap-2 shadow-lg ${cardClasses}`}>
              <div className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ${isGradientTheme ? 'border-gradient-primary' : 'border-blue-600'
                }`} />
              <span className={`text-sm ${isGradientTheme ? 'gradient-text-secondary' : 'text-gray-600'}`}>
                Loading dashboard data...
              </span>
            </Card>
          </div>
        )}
        {/* Performance Overlay */}
        <AnimatePresence>
          {showPerformance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-slate-950/10 backdrop-blur-[1px]"
              onClick={() => setShowPerformance(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPerformance && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed bottom-6 right-6 w-[340px] max-h-[calc(100vh-6rem)] z-[70] shadow-2xl"
            >
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 z-10 hover:bg-slate-800/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPerformance(false);
                  }}
                >
                  <Filter className="h-3 w-3 rotate-45 text-slate-400" />
                </Button>
                <PerformanceMonitorWidget />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Navigation Bar */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-4 z-40">
            {DASHBOARD_LAYOUTS.slice(0, 4).map((layout) => {
              const Icon = layout.id === 'overview' ? LayoutGrid : layout.id === 'analytics' ? BarChart3 : layout.id === 'monitoring' ? Activity : List;
              const isActive = selectedLayout === layout.id;
              return (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={cn(
                    "flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors",
                    isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                  <span className="text-[10px]">{layout.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute bottom-0 h-1 w-12 bg-blue-600 rounded-t-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
