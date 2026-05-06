import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { useHeader } from '../../contexts/HeaderContext';
import CommandPalette from './CommandPalette';
import QuickActionsBar from './QuickActionsBar';
import OptimizedAdminDashboard from './OptimizedAdminDashboard';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';
import { DashboardFilters } from './DashboardFilters';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import {
  Search,
  Command,
  Bell,
  Settings,
  User,
  Menu,
  X,
  Filter,
} from 'lucide-react';

export default function NavigationEnhancedDashboard() {
  const { theme } = useTheme();
  const { setHeaderSearch, setHeaderActions } = useHeader();
  const { filters, updateFilters } = useDashboardFilters();
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isMobile,
  } = useEnhancedNavigation();
  
  const [showQuickActions, setShowQuickActions] = useState(true);

  const [showFilters, setShowFilters] = useState(false);

  // Inject Search and Actions into Global Header
  useEffect(() => {
    // Search component for header
    const searchBar = (
      <div className="relative w-full max-w-2xl group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Search anything... (Ctrl+K)"
          value={filters.searchQuery || ''}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          onFocus={() => setIsCommandPaletteOpen(true)}
          className={cn(
            "pl-10 pr-12 h-11 transition-all duration-300 rounded-2xl",
            theme === 'casaos' 
              ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500" 
              : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700"
          )}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {filters.searchQuery && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-white/10"
              onClick={() => updateFilters({ searchQuery: '' })}
            >
              <X className="h-3 w-3 text-slate-400" />
            </Button>
          )}
          <Badge variant="outline" className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 rounded-lg border-white/10",
            theme === 'casaos' ? "text-slate-500 bg-white/5" : ""
          )}>
            Ctrl+K
          </Badge>
        </div>
      </div>
    );

    // Actions for header
    const actions = (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCommandPaletteOpen(true)}
          className={cn(
            "flex items-center gap-2 rounded-xl h-10 px-4",
            theme === 'casaos' ? "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10" : ""
          )}
        >
          <span>Commands</span>
        </Button>
        
        <Button
          variant={showQuickActions ? "default" : "outline"}
          size="sm"
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={cn(
            "flex items-center gap-2 rounded-xl h-10 px-4",
            theme === 'casaos' 
              ? showQuickActions 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-0" 
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
              : ""
          )}
        >
          {showQuickActions && <X className="h-4 w-4" />}
          <span>{showQuickActions ? 'Hide Actions' : 'Show Actions'}</span>
        </Button>

        <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />

        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative rounded-xl h-10 w-10",
            theme === 'casaos' ? "text-slate-300 hover:text-white hover:bg-white/5" : ""
          )}
        >
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center border-2 border-[#12151C]"
          >
            3
          </Badge>
        </Button>
      </div>
    );

    setHeaderSearch(searchBar);
    setHeaderActions(actions);

    // Cleanup on unmount
    return () => {
      setHeaderSearch(null);
      setHeaderActions(null);
    };
  }, [filters.searchQuery, isMobile, showQuickActions, setHeaderSearch, setHeaderActions, setIsCommandPaletteOpen, theme]);
  
  return (
    <div className={cn(
      "flex h-full",
      theme === 'casaos' ? "bg-transparent" : "bg-gray-50 dark:bg-slate-900"
    )}>
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Quick Actions Sidebar */}
        {showQuickActions && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : '350px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "overflow-y-auto",
              isMobile ? 'fixed inset-y-0 left-0 z-30' : 'relative h-full',
              theme === 'casaos' 
                ? "bg-[#12151C]/60 backdrop-blur-xl border-r border-white/5" 
                : "bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700"
            )}
          >
            <div className="p-4">
              <QuickActionsBar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
            </div>
          </motion.aside>
        )}
        
        {/* Dashboard Content */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          theme === 'casaos' ? "p-0" : "p-4 lg:p-6"
        )}>
          {/* Animated Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  "p-4 border-b",
                  theme === 'casaos' ? "bg-[#12151C]/80 backdrop-blur-xl border-white/5" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                )}
              >
                <div className="max-w-[1600px] mx-auto">
                  <DashboardFilters />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <OptimizedAdminDashboard />
        </main>
      </div>
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      
      {/* Mobile Overlay */}
      {isMobile && showQuickActions && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setShowQuickActions(false)}
        />
      )}
    </div>
  );
}