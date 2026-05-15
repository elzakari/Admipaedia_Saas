import React, { useState, useEffect, useMemo } from 'react';
import { performanceRegistry, PerformanceMetric } from '../../services/performanceRegistry';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { BarChart3, Activity, Zap, Clock, Smartphone, Tablet, Monitor, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

const PerformanceMonitorWidget: React.FC = () => {
    const [lastMetric, setLastMetric] = useState<PerformanceMetric | null>(null);
    const { theme } = useTheme();
    
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
    const isDesktop = useMediaQuery('(min-width: 1025px)');

    const panelClasses = theme === 'light'
      ? 'bg-white/95 border-slate-200 text-slate-900'
      : 'bg-slate-950/90 border-white/10 text-slate-50';

    useEffect(() => {
        const unsubscribe = performanceRegistry.subscribe((metric) => {
            setLastMetric(metric);
        });

        return unsubscribe;
    }, []);

    const getStatusColor = (value: number, threshold: number) => {
        if (value < threshold) return 'text-emerald-400';
        if (value < threshold * 2) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getStatusBg = (value: number, threshold: number) => {
        if (value < threshold) return 'bg-emerald-500/10 border-emerald-500/20';
        if (value < threshold * 2) return 'bg-amber-500/10 border-amber-500/20';
        return 'bg-rose-500/10 border-rose-500/20';
    };

    const apiSummary = useMemo(() => {
        const apiMetrics = performanceRegistry.getMetricNames().filter(n => n.startsWith('api_'));
        if (apiMetrics.length === 0) return null;

        let totalAvg = 0;
        let count = 0;
        apiMetrics.forEach(name => {
            const summary = performanceRegistry.getSummary(name);
            if (summary) {
                totalAvg += summary.avg;
                count++;
            }
        });
        return count > 0 ? totalAvg / count : 0;
    }, [lastMetric]);

    const slowComponents = useMemo(() => {
        const renderMetrics = performanceRegistry.getMetricNames().filter(n => n.startsWith('component_render_'));
        return renderMetrics
            .map(name => ({ name: name.replace('component_render_', ''), summary: performanceRegistry.getSummary(name) }))
            .filter(item => item.summary && item.summary.avg > 16)
            .sort((a, b) => (b.summary?.avg || 0) - (a.summary?.avg || 0))
            .slice(0, 3);
    }, [lastMetric]);

    return (
        <Card className={cn("backdrop-blur-xl overflow-hidden h-full shadow-2xl ring-1", panelClasses, theme === 'light' ? 'ring-slate-200/70' : 'ring-white/10')}>
            <CardHeader className={cn("pb-2", theme === 'light' ? 'border-b border-slate-200/60' : 'border-b border-white/10')}>
                <div className="flex items-center justify-between">
                    <CardTitle className={cn("text-sm font-black tracking-tight flex items-center", theme === 'light' ? 'text-slate-800' : 'text-slate-200')}>
                        <Activity className={cn("w-4 h-4 mr-2", theme === 'light' ? 'text-indigo-600' : 'text-indigo-300')} />
                        Performance Monitor
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", theme === 'light' ? 'text-emerald-700' : 'text-emerald-300')}>
                          LIVE
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${getStatusBg(apiSummary || 0, 300)} transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-[10px] uppercase tracking-wider font-black", theme === 'light' ? 'text-slate-600' : 'text-slate-400')}>
                              API Latency
                            </span>
                            <Clock className={`w-3 h-3 ${getStatusColor(apiSummary || 0, 300)}`} />
                        </div>
                        <div className="flex items-baseline space-x-1">
                            <span className={`text-xl font-mono font-bold ${getStatusColor(apiSummary || 0, 300)}`}>
                                {apiSummary ? apiSummary.toFixed(0) : '--'}
                            </span>
                            <span className={cn("text-[10px] font-bold", theme === 'light' ? 'text-slate-500' : 'text-slate-500')}>
                              ms
                            </span>
                        </div>
                    </div>

                    <div className={cn(
                      "p-3 rounded-xl border",
                      theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
                    )}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-[10px] uppercase tracking-wider font-black", theme === 'light' ? 'text-slate-600' : 'text-slate-400')}>
                              Active Tracks
                            </span>
                            <Zap className={cn("w-3 h-3", theme === 'light' ? 'text-amber-600' : 'text-amber-400')} />
                        </div>
                        <div className="flex items-baseline space-x-1">
                            <span className={cn("text-xl font-mono font-bold", theme === 'light' ? 'text-slate-900' : 'text-slate-200')}>
                                {performanceRegistry.getMetricNames().length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Responsive Testing Section */}
                <div className={cn(
                  "p-3 rounded-xl space-y-2 border",
                  theme === 'light' ? 'bg-indigo-50 border-indigo-200/70' : 'bg-indigo-500/10 border-indigo-500/20'
                )}>
                    <h4 className={cn(
                      "text-[10px] uppercase tracking-wider font-black flex items-center gap-2",
                      theme === 'light' ? 'text-indigo-700' : 'text-indigo-200'
                    )}>
                        <Monitor className="w-3 h-3" />
                        Responsive Testing
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div className={cn(
                          "flex flex-col items-center p-1 rounded-lg border transition-all",
                          isMobile
                            ? (theme === 'light' ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200')
                            : (theme === 'light' ? 'bg-white/60 border-slate-200 text-slate-400 opacity-70' : 'bg-white/5 border-white/10 text-slate-400 opacity-60')
                        )}>
                            <Smartphone className="w-3 h-3 mb-1" />
                            <span className="text-[8px] font-bold uppercase">Mobile</span>
                        </div>
                        <div className={cn(
                          "flex flex-col items-center p-1 rounded-lg border transition-all",
                          isTablet
                            ? (theme === 'light' ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200')
                            : (theme === 'light' ? 'bg-white/60 border-slate-200 text-slate-400 opacity-70' : 'bg-white/5 border-white/10 text-slate-400 opacity-60')
                        )}>
                            <Tablet className="w-3 h-3 mb-1" />
                            <span className="text-[8px] font-bold uppercase">Tablet</span>
                        </div>
                        <div className={cn(
                          "flex flex-col items-center p-1 rounded-lg border transition-all",
                          isDesktop
                            ? (theme === 'light' ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200')
                            : (theme === 'light' ? 'bg-white/60 border-slate-200 text-slate-400 opacity-70' : 'bg-white/5 border-white/10 text-slate-400 opacity-60')
                        )}>
                            <Monitor className="w-3 h-3 mb-1" />
                            <span className="text-[8px] font-bold uppercase">Desktop</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <span className={cn("text-[9px] font-bold uppercase tracking-tight", theme === 'light' ? 'text-slate-600' : 'text-slate-300')}>
                          Theme Mode
                        </span>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                          theme === 'light' ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                        )}>
                            {theme === 'dark' || theme === 'casaos' ? <Moon className={cn("w-2.5 h-2.5", 'text-indigo-300')} /> : <Sun className={cn("w-2.5 h-2.5", theme === 'light' ? 'text-amber-600' : 'text-amber-300')} />}
                            <span className={cn("text-[9px] font-black uppercase", theme === 'light' ? 'text-slate-800' : 'text-slate-200')}>
                              {theme}
                            </span>
                        </div>
                    </div>
                </div>

                {slowComponents.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Heaviest Renders</h4>
                            <BarChart3 className="w-3 h-3 text-rose-400" />
                        </div>
                        <div className="space-y-2">
                            {slowComponents.map((comp) => (
                                <div key={comp.name} className="flex items-center justify-between group">
                                    <span className="text-xs text-slate-400 truncate max-w-[120px] group-hover:text-slate-200 transition-colors">
                                        {comp.name}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((comp.summary?.avg || 0) / 100 * 100, 100)}%` }}
                                                className={`h-full ${getStatusBg(comp.summary?.avg || 0, 16).replace('bg-', 'bg-').split(' ')[0]}`}
                                            />
                                        </div>
                                        <span className={`text-xs font-mono font-medium ${getStatusColor(comp.summary?.avg || 0, 16)}`}>
                                            {comp.summary?.avg.toFixed(1)}ms
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-800/50">
                    <div className="flex items-center space-x-4 opacity-50">
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 uppercase">LCP</span>
                            <span className="text-xs font-mono">--</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 uppercase">FID</span>
                            <span className="text-xs font-mono">--</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 uppercase">CLS</span>
                            <span className="text-xs font-mono">--</span>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {lastMetric && (
                        <motion.div
                            key={lastMetric.timestamp}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2 flex items-center"
                        >
                            <Activity className="w-3 h-3 text-blue-400 mr-2" />
                            <span className="text-[9px] text-slate-400 truncate flex-1">
                                {lastMetric.name.replace(/^(api_|component_render_|operation_)/, '')}
                            </span>
                            <span className="text-[9px] font-mono text-blue-400">
                                {lastMetric.value.toFixed(1)}ms
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};

export default PerformanceMonitorWidget;
