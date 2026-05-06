import React, { useMemo, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { MonitorSmartphone, X } from 'lucide-react';

const ResponsiveTest: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [open, setOpen] = useState(false);

  const floatingStyle = useMemo(() => {
    return {
      right: 'calc(1.5rem + var(--admiperf-panel-width, 0px))',
      bottom: '1.5rem'
    } as React.CSSProperties;
  }, []);
  
  return (
    <div className="fixed z-[60]" style={floatingStyle}>
      {!open ? (
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border-slate-200/70 dark:border-slate-700 shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MonitorSmartphone className="h-4 w-4 mr-2" />
          Responsive
        </Button>
      ) : (
        <div className="w-64 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200/60 dark:border-slate-700 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Responsive Testing</h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className={cn(
              'rounded-xl border p-2 text-center',
              isMobile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700'
            )}>
              <div className="text-[10px] font-black uppercase tracking-wider">Mobile</div>
              <div className="text-xs font-black">{isMobile ? '✓' : '✗'}</div>
            </div>
            <div className={cn(
              'rounded-xl border p-2 text-center',
              isTablet ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700'
            )}>
              <div className="text-[10px] font-black uppercase tracking-wider">Tablet</div>
              <div className="text-xs font-black">{isTablet ? '✓' : '✗'}</div>
            </div>
            <div className={cn(
              'rounded-xl border p-2 text-center',
              isDesktop ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700'
            )}>
              <div className="text-[10px] font-black uppercase tracking-wider">Desktop</div>
              <div className="text-xs font-black">{isDesktop ? '✓' : '✗'}</div>
            </div>
          </div>

          <div className="mt-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">System Theme</span>
              <span className="font-black">{isDarkMode ? 'Dark' : 'Light'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Current Theme</span>
              <span className="font-black"><span className="dark:hidden">Light</span><span className="hidden dark:inline">Dark</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTest;
