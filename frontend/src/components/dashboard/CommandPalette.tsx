import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import {
  Search,
  Command,
  Clock,
  Star,
  ArrowRight,
  Keyboard,
  Hash,
  Navigation,
  Zap,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    executeAction,
    navigateWithHistory,
    toggleFavorite,
    getRecentActions,
    getFavoriteActions,
    quickActions,
  } = useEnhancedNavigation();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const recentActions = getRecentActions();
  const favoriteActions = getFavoriteActions();
  
  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, setSearchQuery]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      const results = searchQuery ? searchResults : [...favoriteActions, ...recentActions];
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (results[selectedIndex]) {
            handleItemSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchQuery, searchResults, favoriteActions, recentActions, selectedIndex, onClose]);
  
  // Handle item selection
  const handleItemSelect = (item: any) => {
    if (item.type === 'action' || item.action) {
      const action = item.type === 'action' ? item.item : item;
      executeAction(action);
    } else if (item.type === 'navigation' || item.path) {
      const navItem = item.type === 'navigation' ? item.item : item;
      navigateWithHistory(navItem.path, navItem.label);
    }
    onClose();
  };
  
  // Get icon component
  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Search, Command, Clock, Star, ArrowRight, Keyboard, Hash, Navigation, Zap,
    };
    return icons[iconName] || Search;
  };
  
  // Render results
  const renderResults = () => {
    if (searchQuery) {
      return (
        <div className="space-y-2">
          {searchResults.length > 0 ? (
            searchResults.map((result, index) => {
              const item = result.item;
              const Icon = getIcon(item.icon);
              
              return (
                <motion.div
                  key={`${result.type}-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleItemSelect(result)}
                >
                  <div className="flex-shrink-0">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {t(item.labelKey || '', item.label)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {t(`navigation.${result.type}`)}
                      </Badge>
                    </div>
                    {(item.descriptionKey || item.description) && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {t(item.descriptionKey || '', item.description || '')}
                      </p>
                    )}
                    {result.matchedKeywords.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {result.matchedKeywords.slice(0, 3).map(keyword => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.shortcut}
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try different keywords or browse categories</p>
            </div>
          )}
        </div>
      );
    }
    
    // Show favorites and recent when no search query
    return (
      <div className="space-y-6">
        {/* Favorites */}
        {favoriteActions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-yellow-500" />
              <h3 className="font-medium text-gray-900">Favorites</h3>
            </div>
            <div className="space-y-1">
              {favoriteActions.slice(0, 5).map((action, index) => {
                const Icon = getIcon(action.icon);
                const globalIndex = index;
                
                return (
                  <div
                    key={action.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleItemSelect(action)}
                  >
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {t(action.labelKey || '', action.label)}
                    </span>
                    {action.shortcut && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {action.shortcut}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Recent Actions */}
        {recentActions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Recent</h3>
            </div>
            <div className="space-y-1">
              {recentActions.slice(0, 5).map((action, index) => {
                const Icon = getIcon(action.icon);
                const globalIndex = favoriteActions.length + index;
                
                return (
                  <div
                    key={action.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleItemSelect(action)}
                  >
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {t(action.labelKey || '', action.label)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(action.id);
                      }}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Quick Actions Categories */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-500" />
            <h3 className="font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['navigation', 'data', 'settings', 'help'].map(category => {
              const categoryActions = quickActions.filter(action => action.category === category);
              if (categoryActions.length === 0) return null;
              
              return (
                <div
                  key={category}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSearchQuery(category)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium capitalize">{t(`navigation.${category}`)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {categoryActions.length} {t('common.actions', 'actions')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogTitle className="sr-only">Command Palette - Search Actions and Pages</DialogTitle>
        <DialogDescription className="sr-only">
          Use the search input to find quick actions, navigate between pages, or execute system commands. Use arrow keys to navigate and Enter to select.
        </DialogDescription>
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Search actions, pages, or type a command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div ref={listRef} className="max-h-96 overflow-y-auto p-4">
          {renderResults()}
        </div>
        
        <div className="border-t p-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                <span>↑↓ navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <span>↵ select</span>
              </div>
              <div className="flex items-center gap-1">
                <span>esc close</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>Ctrl+K to open</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}