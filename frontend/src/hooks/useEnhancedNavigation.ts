import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
import { useMediaQuery } from './useMediaQuery';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  icon: string;
  action: () => void | Promise<void>;
  category: 'navigation' | 'data' | 'settings' | 'help';
  keywords: string[];
  shortcut?: string;
  requiresAuth?: boolean;
  roles?: string[];
}

interface NavigationItem {
  id: string;
  label: string;
  labelKey?: string;
  path: string;
  icon: string;
  category: string;
  keywords: string[];
  description?: string;
  descriptionKey?: string;
  badge?: string | number;
}

interface SearchResult {
  type: 'action' | 'navigation' | 'data';
  item: QuickAction | NavigationItem | any;
  score: number;
  matchedKeywords: string[];
}

export function useEnhancedNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [recentActions, setRecentActions] = useLocalStorage<string[]>('recent-actions', []);
  const [favoriteActions, setFavoriteActions] = useLocalStorage<string[]>('favorite-actions', []);
  const [navigationHistory, setNavigationHistory] = useLocalStorage<string[]>('navigation-history', []);

  // Define quick actions
  const quickActions = useMemo<QuickAction[]>(() => [
    {
      id: 'create-student',
      label: 'Add New Student',
      labelKey: 'quick_actions.create_student.label',
      description: 'Create a new student profile',
      descriptionKey: 'quick_actions.create_student.description',
      icon: 'UserPlus',
      action: () => navigate('/students/new'),
      category: 'data',
      keywords: ['student', 'add', 'create', 'new', 'register'],
      shortcut: 'Ctrl+Shift+S',
    },
    {
      id: 'create-teacher',
      label: 'Add New Teacher',
      labelKey: 'quick_actions.create_teacher.label',
      description: 'Create a new teacher profile',
      descriptionKey: 'quick_actions.create_teacher.description',
      icon: 'UserPlus',
      action: () => navigate('/teachers/new'),
      category: 'data',
      keywords: ['teacher', 'add', 'create', 'new', 'staff'],
      shortcut: 'Ctrl+Shift+T',
    },
    {
      id: 'view-attendance',
      label: 'View Attendance',
      labelKey: 'quick_actions.view_attendance.label',
      description: 'Check attendance records',
      descriptionKey: 'quick_actions.view_attendance.description',
      icon: 'Calendar',
      action: () => navigate('/attendance'),
      category: 'navigation',
      keywords: ['attendance', 'present', 'absent', 'records'],
      shortcut: 'Ctrl+A',
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      labelKey: 'quick_actions.generate_report.label',
      description: 'Create custom reports',
      descriptionKey: 'quick_actions.generate_report.description',
      icon: 'FileText',
      action: () => navigate('/reports'),
      category: 'data',
      keywords: ['report', 'analytics', 'export', 'data'],
      shortcut: 'Ctrl+R',
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      labelKey: 'quick_actions.system_settings.label',
      description: 'Configure system preferences',
      descriptionKey: 'quick_actions.system_settings.description',
      icon: 'Settings',
      action: () => navigate('/settings'),
      category: 'settings',
      keywords: ['settings', 'config', 'preferences', 'system'],
      shortcut: 'Ctrl+,',
    },
    {
      id: 'refresh-dashboard',
      label: 'Refresh Dashboard',
      labelKey: 'quick_actions.refresh_dashboard.label',
      description: 'Reload all dashboard data',
      descriptionKey: 'quick_actions.refresh_dashboard.description',
      icon: 'RefreshCw',
      action: async () => {
        window.location.reload();
        toast.success('Dashboard refreshed');
      },
      category: 'data',
      keywords: ['refresh', 'reload', 'update', 'sync'],
      shortcut: 'F5',
    },
    {
      id: 'export-data',
      label: 'Export Data',
      labelKey: 'quick_actions.export_data.label',
      description: 'Export system data to CSV/Excel',
      descriptionKey: 'quick_actions.export_data.description',
      icon: 'Download',
      action: () => navigate('/export'),
      category: 'data',
      keywords: ['export', 'download', 'csv', 'excel', 'backup'],
      shortcut: 'Ctrl+E',
    },
    {
      id: 'help-center',
      label: 'Help Center',
      labelKey: 'quick_actions.help_center.label',
      description: 'Get help and documentation',
      descriptionKey: 'quick_actions.help_center.description',
      icon: 'HelpCircle',
      action: () => navigate('/help'),
      category: 'help',
      keywords: ['help', 'support', 'documentation', 'guide'],
      shortcut: 'F1',
    },
  ], [navigate]);

  // Define navigation items
  const navigationItems = useMemo<NavigationItem[]>(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      category: 'main',
      keywords: ['dashboard', 'home', 'overview', 'main'],
      description: 'Main dashboard overview',
    },
    {
      id: 'students',
      label: 'Students',
      path: '/students',
      icon: 'Users',
      category: 'management',
      keywords: ['students', 'pupils', 'learners', 'manage'],
      description: 'Manage student records',
    },
    {
      id: 'teachers',
      label: 'Teachers',
      path: '/teachers',
      icon: 'UserCheck',
      category: 'management',
      keywords: ['teachers', 'staff', 'faculty', 'instructors'],
      description: 'Manage teacher profiles',
    },
    {
      id: 'classes',
      label: 'Classes',
      path: '/classes',
      icon: 'BookOpen',
      category: 'academic',
      keywords: ['classes', 'subjects', 'courses', 'curriculum'],
      description: 'Manage class schedules',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/attendance',
      icon: 'Calendar',
      category: 'academic',
      keywords: ['attendance', 'present', 'absent', 'tracking'],
      description: 'Track attendance records',
    },
    {
      id: 'exams',
      label: 'Exams',
      path: '/exams',
      icon: 'FileText',
      category: 'academic',
      keywords: ['exams', 'tests', 'assessments', 'grades'],
      description: 'Manage examinations',
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: 'BarChart3',
      category: 'analytics',
      keywords: ['reports', 'analytics', 'statistics', 'insights'],
      description: 'Generate reports and analytics',
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: 'Settings',
      category: 'system',
      keywords: ['settings', 'configuration', 'preferences'],
      description: 'System configuration',
    },
  ], []);
  
  // Calculate search score - Move before searchResults to avoid ReferenceError
  const calculateSearchScore = useCallback((query: string, label: string, keywords: string[], description?: string) => {
    let score = 0;
    const queryWords = query.split(' ').filter(word => word.length > 0);

    queryWords.forEach(word => {
      // Exact label match (highest score)
      if (label.toLowerCase().includes(word)) {
        score += label.toLowerCase() === word ? 100 : 50;
      }

      // Keyword matches
      keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(word)) {
          score += keyword.toLowerCase() === word ? 30 : 15;
        }
      });

      // Description match (lower score)
      if (description && description.toLowerCase().includes(word)) {
        score += 5;
      }
    });

    return score;
  }, []);

  // Get matched keywords for highlighting - Move before searchResults to avoid ReferenceError
  const getMatchedKeywords = useCallback((query: string, keywords: string[]) => {
    const queryWords = query.toLowerCase().split(' ');
    return keywords.filter(keyword => 
      queryWords.some(word => keyword.toLowerCase().includes(word))
    );
  }, []);

  // Search functionality with fuzzy matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search quick actions
    quickActions.forEach(action => {
      const score = calculateSearchScore(query, action.label, action.keywords, action.description);
      if (score > 0) {
        results.push({
          type: 'action',
          item: action,
          score,
          matchedKeywords: getMatchedKeywords(query, action.keywords),
        });
      }
    });

    // Search navigation items
    navigationItems.forEach(item => {
      const score = calculateSearchScore(query, item.label, item.keywords, item.description);
      if (score > 0) {
        results.push({
          type: 'navigation',
          item,
          score,
          matchedKeywords: getMatchedKeywords(query, item.keywords),
        });
      }
    });

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [searchQuery, quickActions, navigationItems, calculateSearchScore, getMatchedKeywords]);

  // Execute action and track usage
  const executeAction = useCallback(async (action: QuickAction) => {
    try {
      await action.action();
      
      // Update recent actions
      setRecentActions(prev => {
        const updated = [action.id, ...prev.filter(id => id !== action.id)];
        return updated.slice(0, 10); // Keep only last 10
      });
      
      toast.success(`${action.label} executed`);
    } catch (error) {
      console.error('Action execution failed:', error);
      toast.error('Action failed to execute');
    }
  }, [setRecentActions]);

  // Navigate and track history
  const navigateWithHistory = useCallback((path: string, label?: string) => {
    navigate(path);
    
    // Update navigation history
    setNavigationHistory(prev => {
      const updated = [path, ...prev.filter(p => p !== path)];
      return updated.slice(0, 20); // Keep only last 20
    });
    
    if (label) {
      toast.success(`Navigated to ${label}`);
    }
  }, [navigate, setNavigationHistory]);

  // Toggle favorite action
  const toggleFavorite = useCallback((actionId: string) => {
    setFavoriteActions(prev => {
      if (prev.includes(actionId)) {
        return prev.filter(id => id !== actionId);
      } else {
        return [...prev, actionId];
      }
    });
  }, [setFavoriteActions]);

  // Get recent actions
  const getRecentActions = useCallback(() => {
    return recentActions
      .map(id => quickActions.find(action => action.id === id))
      .filter(Boolean) as QuickAction[];
  }, [recentActions, quickActions]);

  // Get favorite actions
  const getFavoriteActions = useCallback(() => {
    return favoriteActions
      .map(id => quickActions.find(action => action.id === id))
      .filter(Boolean) as QuickAction[];
  }, [favoriteActions, quickActions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command palette toggle
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Quick action shortcuts
      quickActions.forEach(action => {
        if (action.shortcut && isShortcutMatch(event, action.shortcut)) {
          event.preventDefault();
          executeAction(action);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickActions, executeAction]);

  // Check if keyboard event matches shortcut
  const isShortcutMatch = useCallback((event: KeyboardEvent, shortcut: string) => {
    const parts = shortcut.toLowerCase().split('+');
    const hasCtrl = parts.includes('ctrl') && (event.ctrlKey || event.metaKey);
    const hasShift = parts.includes('shift') && event.shiftKey;
    const hasAlt = parts.includes('alt') && event.altKey;
    const key = parts[parts.length - 1];

    return (
      (!parts.includes('ctrl') || hasCtrl) &&
      (!parts.includes('shift') || hasShift) &&
      (!parts.includes('alt') || hasAlt) &&
      event.key.toLowerCase() === key
    );
  }, []);

  return {
    // State
    searchQuery,
    setSearchQuery,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isMobile,
    
    // Data
    quickActions,
    navigationItems,
    searchResults,
    
    // Actions
    executeAction,
    navigateWithHistory,
    toggleFavorite,
    
    // Computed
    getRecentActions,
    getFavoriteActions,
    
    // Current state
    currentPath: location.pathname,
    navigationHistory,
  };
}