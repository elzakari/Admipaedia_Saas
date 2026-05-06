import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  RefreshCw, 
  AlertCircle, 
  WifiOff, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpRight, 
  ArrowDownRight, 
  Users,
  UserCheck,
  Heart,
  CheckCircle,
  Clock,
  BookOpen,
  Calendar
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'Users': <Users className="h-4 w-4" />,
  'UserCheck': <UserCheck className="h-4 w-4" />,
  'Heart': <Heart className="h-4 w-4" />,
  'CheckCircle': <CheckCircle className="h-4 w-4" />,
  'Clock': <Clock className="h-4 w-4" />,
  'BookOpen': <BookOpen className="h-4 w-4" />,
  'Calendar': <Calendar className="h-4 w-4" />,
  'AlertCircle': <AlertCircle className="h-4 w-4" />
};
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import dashboardService from '../../services/dashboardService';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useEnhancedStatistics } from '../../hooks/useEnhancedDashboardData';
import { DashboardFiltersState } from '../../hooks/useDashboardFilters';

// Define DashboardStatistic interface based on typical data structure
interface DashboardStatistic {
  id: string;
  title: string;
  value: string | number;
  icon?: string | React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  } | undefined;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
}

interface StatisticCardProps extends DashboardStatistic {
  index: number;
  onCardClick?: (title: string) => void;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

const StatisticCard = React.memo<StatisticCardProps>(({
  title,
  value,
  icon,
  change,
  color = 'primary',
  onCardClick,
  isVisible = true,
  onToggleVisibility,
  index
}) => {
  const { t } = useTranslation();
  
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-700 border-blue-100',
    success: 'bg-green-50 text-green-700 border-green-100',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-100'
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return iconMap[icon] || <AlertCircle className="h-4 w-4" />;
    }
    return icon;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onCardClick) {
        onCardClick(title);
      }
    }
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(title);
    }
  };

  if (!isVisible) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-5 flex items-center justify-between">
        <span className="text-sm text-gray-500">Card hidden: {String(title)}</span>
        {onToggleVisibility && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleVisibility}
            aria-label={`Show ${title} statistic`}
          >
            Show
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "group relative bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden",
        onCardClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      )}
      role={onCardClick ? 'button' : 'article'}
      aria-labelledby={`stat-title-${index}`}
      tabIndex={onCardClick ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* Visibility Toggle Button */}
      {onToggleVisibility && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          aria-label={`Hide ${title} statistic`}
        >
          ×
        </Button>
      )}

      <div className="flex justify-between items-start mb-1">
        <div className="min-w-0 flex-1">
          <h3
            id={`stat-title-${index}`}
            className="font-sans text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest mb-0.5 leading-tight group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors"
          >
            {t(`dashboard.statistics.${title.toLowerCase().replace(' ', '_')}`, title)}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {String(value)}
            </span>
            {change && (
              <div className={cn(
                "flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                change.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {change.isPositive ? <ArrowUpRight className="h-2 w-2 mr-0.5" /> : <ArrowDownRight className="h-2 w-2 mr-0.5" />}
                {change.value}%
              </div>
            )}
          </div>
        </div>
        
        <div className={cn(
          "p-2 rounded-xl shrink-0 transition-all duration-300 group-hover:rotate-6 group-hover:scale-105",
          colorClasses[color]
        )}>
          {renderIcon()}
        </div>
      </div>

      {/* Subtle corner decoration */}
      <div className={cn(
        "absolute -bottom-2 -right-2 w-12 h-12 rounded-full opacity-5 group-hover:opacity-10 transition-opacity",
        color === 'primary' ? 'bg-blue-600' : 
        color === 'success' ? 'bg-green-600' : 
        color === 'warning' ? 'bg-yellow-600' : 
        color === 'danger' ? 'bg-red-600' : 'bg-indigo-600'
      )} />
    </motion.div>
  );
});

interface StatisticsGridProps {
  filters?: DashboardFiltersState;
  onRefresh?: () => void;
  className?: string;
}

const StatisticsGrid: React.FC<StatisticsGridProps> = ({
  filters,
  onRefresh,
  className
}) => {
  const { t } = useTranslation();
  const [, setLastRefresh] = useState<Date>(new Date());

  // Enhanced statistics hook with global filter support
  const {
    statistics,
    isLoading,
    isError: error,
    refresh,
    isValidating
  } = useEnhancedStatistics({
    startDate: filters?.startDate || null,
    endDate: filters?.endDate || null,
    category: filters?.category || null
  });

  const searchQuery = filters?.searchQuery || '';

  // Filter statistics based on search query
  const filteredStatistics = useMemo(() => {
    const statsArray = Array.isArray(statistics) ? statistics : [];
    if (!searchQuery || statsArray.length === 0) return statsArray;

    return statsArray.filter((stat: DashboardStatistic) =>
      stat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stat.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stat.value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [statistics, searchQuery]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileIndex, setMobileIndex] = useState(0);

  const nextSlide = useCallback(() => {
    if (filteredStatistics && mobileIndex < filteredStatistics.length - 1) {
      setMobileIndex(mobileIndex + 1);
    }
  }, [filteredStatistics, mobileIndex]);

  const prevSlide = useCallback(() => {
    if (mobileIndex > 0) {
      setMobileIndex(mobileIndex - 1);
    }
  }, [mobileIndex]);

  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const prevStatisticsRef = React.useRef<string>('');
  
  // Only update lastFetched when statistics actually change and are not loading
  useEffect(() => {
    if (statistics && !isLoading) {
      const currentStatsStr = JSON.stringify(statistics);
      if (prevStatisticsRef.current !== currentStatsStr) {
        prevStatisticsRef.current = currentStatsStr;
        setLastFetched(new Date());
      }
    }
  }, [statistics, isLoading]);

  const isCached = !isValidating && !!statistics;
  const canRetry = !!error && !isValidating;
  const retry = refresh;

  // Cache statistics for offline use
  useEffect(() => {
    if (statistics && statistics.length > 0) {
      dashboardService.cacheStatistics(statistics);
    }
  }, [statistics]);

  // Enhanced refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      setLastRefresh(new Date());
      onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh statistics:', error);
    }
  }, [refresh, onRefresh]);

  if (error && (!statistics || statistics.length === 0)) {
    return (
      <Card className="p-6" role="alert" aria-live="polite">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Load Statistics
            </h3>
            <p className="text-gray-600 mb-4" id="error-description">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <div className="flex gap-2 justify-center">
              {!isLoading && (
                <Button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  aria-describedby="error-description"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Try Again
                </Button>
              )}
              <Button variant="outline" onClick={handleRefresh}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-labelledby="statistics-heading">
      {/* Header with refresh and status indicators */}
      <div className="flex justify-between items-center">
        <h2 id="statistics-heading" className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
          {t('dashboard.statistics.title')}
        </h2>
        <div className="flex items-center gap-2">
          {isCached && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              <span className="sr-only">{t('dashboard.statistics.cached_data')} - </span>
              {t('dashboard.statistics.cached_data')}
            </Badge>
          )}
          {lastFetched && (
            <span className="text-xs text-gray-500" aria-label={`Last updated at ${new Date(lastFetched).toLocaleString()}`}>
              {t('dashboard.statistics.updated')} {new Date(lastFetched).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label={isLoading ? t('common.loading') : t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="sr-only">
              {isLoading ? t('common.loading') : t('common.refresh')}
            </span>
          </Button>
        </div>
      </div>

      {/* Statistics Grid / Carousel */}
      <div className="relative overflow-hidden">
        {isMobile && filteredStatistics && filteredStatistics.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-medium text-gray-500">
                {mobileIndex + 1} of {filteredStatistics.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevSlide}
                  disabled={mobileIndex === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextSlide}
                  disabled={mobileIndex === filteredStatistics.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mobileIndex}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                role="listitem"
              >
                <StatisticCard
                  {...filteredStatistics[mobileIndex]}
                  index={mobileIndex}
                />
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-1.5 mt-2">
              {filteredStatistics.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === mobileIndex ? "w-4 bg-blue-600" : "w-1.5 bg-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3",
              className
            )}
            role="list"
            aria-label="Key performance indicators"
          >
            {filteredStatistics?.map((stat: DashboardStatistic, index: number) => (
              <div key={stat.title} role="listitem">
                <StatisticCard
                  {...stat}
                  index={index}
                />
              </div>
            )) || (
                // Loading skeleton with accessibility
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow p-5 animate-pulse"
                    role="article"
                    aria-label="Loading statistic"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="h-4 bg-gray-200 rounded w-24" aria-hidden="true"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded-full" aria-hidden="true"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-16" aria-hidden="true"></div>
                    <span className="sr-only">Loading statistic {index + 1} of 4</span>
                  </div>
                ))
              )}
          </div>
        )}
      </div>

      {/* Subtle Error Indicator for partial failures */}
      {error && filteredStatistics && filteredStatistics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 flex items-center justify-between gap-3"
          role="alert"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-[10px] font-bold text-red-600 truncate uppercase tracking-wider">
              {error instanceof Error ? error.message : 'Sync failed'}
            </p>
          </div>
          {canRetry && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={retry}
              className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-lg"
            >
              Retry
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default StatisticsGrid;
