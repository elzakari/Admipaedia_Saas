import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { Calendar } from 'lucide-react';
import {
  Plus,
  Search,
  Command,
  Star,
  Clock,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
} from 'lucide-react';

interface QuickActionsBarProps {
  onOpenCommandPalette: () => void;
}

export default function QuickActionsBar({ onOpenCommandPalette }: QuickActionsBarProps) {
  const { t } = useTranslation();
  const {
    executeAction,
    toggleFavorite,
    getRecentActions,
    getFavoriteActions,
    quickActions,
    isMobile,
  } = useEnhancedNavigation();
  
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  
  const recentActions = getRecentActions();
  const favoriteActions = getFavoriteActions();
  
  // Get icon component
  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Plus, Search, Command, Star, Clock, ChevronRight, ChevronLeft, MoreHorizontal, Calendar,
    };
    return icons[iconName] || Search;
  };
  
  // Render action button
  const renderActionButton = (action: any, isFavorite = false) => {
    const Icon = getIcon(action.icon);
    
    return (
      <TooltipProvider key={action.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => executeAction(action)}
                className="flex items-center gap-2 h-auto py-2 px-3"
              >
                <Icon className="h-4 w-4" />
                {!isMobile && (
                  <span className="text-sm font-medium">{String(t(action.labelKey || '', action.label))}</span>
                )}
                {action.shortcut && !isMobile && (
                  <Badge variant="secondary" className="text-[10px] font-mono ml-1 opacity-70 border-0 bg-gray-100 dark:bg-white/5">
                    {action.shortcut}
                  </Badge>
                )}
              </Button>
              
              {/* Favorite toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-white border border-gray-200 rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(action.id);
                }}
              >
                <Star 
                  className={`h-2.5 w-2.5 ${
                    isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
                  }`} 
                />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{String(t(action.labelKey || '', action.label))}</p>
              {(action.descriptionKey || action.description) && (
                <p className="text-xs text-gray-500 mt-1">
                  {String(t(action.descriptionKey || '', action.description || ''))}
                </p>
              )}
              {action.shortcut && (
                <p className="text-xs font-mono mt-1 text-blue-600">{action.shortcut}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Command Palette Trigger */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Command className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{String(t('dashboard.quick_actions.title'))}</h3>
              <p className="text-sm text-gray-500">
                {String(t('dashboard.quick_actions.subtitle'))}
              </p>
            </div>
          </div>
          
          <Button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all duration-300"
          >
            <Search className="h-4 w-4" />
            <span>{t('common.search')}</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-white/10 border-white/20 text-white border-0">
              Ctrl+K
            </Badge>
          </Button>
        </div>
      </Card>
      
      {/* Favorite Actions */}
      {favoriteActions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">{t('dashboard.quick_actions.favorites')}</h3>
              <Badge variant="secondary">{favoriteActions.length}</Badge>
            </div>
            
            {favoriteActions.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllFavorites(!showAllFavorites)}
                className="flex items-center gap-1"
              >
                <span className="text-sm">
                  {showAllFavorites ? t('common.show_less') : t('common.show_all')}
                </span>
                {showAllFavorites ? (
                  <ChevronLeft className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {(showAllFavorites ? favoriteActions : favoriteActions.slice(0, 4)).map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {renderActionButton(action, true)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}
      
      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{t('dashboard.quick_actions.recent')}</h3>
              <Badge variant="secondary">{recentActions.length}</Badge>
            </div>
            
            {recentActions.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRecent(!showAllRecent)}
                className="flex items-center gap-1"
              >
                <span className="text-sm">
                  {showAllRecent ? t('common.show_less') : t('common.show_all')}
                </span>
                {showAllRecent ? (
                  <ChevronLeft className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {(showAllRecent ? recentActions : recentActions.slice(0, 3)).map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {renderActionButton(action)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}
      
      {/* All Actions by Category */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MoreHorizontal className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">{t('dashboard.quick_actions.all_actions')}</h3>
        </div>
        
        <div className="space-y-4">
          {['navigation', 'data', 'settings', 'help'].map(category => {
            const categoryActions = quickActions.filter(action => action.category === category);
            if (categoryActions.length === 0) return null;
            
            return (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                  {t(`navigation.${category}`)} ({categoryActions.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categoryActions.map(action => renderActionButton(action))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
