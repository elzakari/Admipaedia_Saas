import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  Users, 
  BarChart4, 
  Settings, 
  AlertTriangle, 
  Calendar, 
  Zap, 
  Clock,
  Download,
  Filter,
  Search,
  Plus,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useHeader } from '../../contexts/HeaderContext';
import { TouchFriendlyButton } from '../../components/common/TouchFriendlyButton';
import ResponsiveLayout from '../../components/layout/ResponsiveLayout';
import Header from '../../components/layout/Header';
import SidebarNav from '../../components/layout/Sidebar';
import Footer from '../../components/layout/Footer';
import { cn } from '../../lib/utils';

// Component imports
import FeesDashboard from '../../components/fees/FeesDashboard';
import FeeTemplateManager from '../../components/fees/FeeTemplateManager';
import InvoiceDashboard from '../../components/fees/InvoiceDashboard';
import PaymentHistoryTable from '../../components/fees/PaymentHistoryTable';
import SmartReminderPanel from '../../components/fees/SmartReminderPanel';
import DefaulterListView from '../../components/fees/DefaulterListView';
import AIInsightsBar from '../../components/fees/AIInsightsBar';
import FinancialReports from '../../components/fees/FinancialReports';
import FeeSettingsPanel from '../../components/fees/FeeSettingsPanel';

export function FeesPage() {
  const { t } = useTranslation();
  useTheme();
  const { setHeaderActions } = useHeader();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingAction, setPendingAction] = useState<{ tab: string; type: 'create' | 'export' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  const dispatch = (type: 'export' | 'create', tabOverride?: string) => {
    const tab = tabOverride || activeTab;
    window.dispatchEvent(new CustomEvent(`fees:${type}`, { detail: { tab } }));
  };

  useEffect(() => {
    const handler = (e: any) => {
      const tab = e?.detail?.tab
      if (!tab || typeof tab !== 'string') return
      setActiveTab(tab)
    }
    window.addEventListener('fees:navigate', handler)
    return () => window.removeEventListener('fees:navigate', handler)
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      const tab = e?.detail?.tab
      const type = e?.detail?.type
      if (!tab || typeof tab !== 'string') return
      if (type !== 'create' && type !== 'export') return
      setPendingAction({ tab, type })
      setActiveTab(tab)
    }
    window.addEventListener('fees:action', handler)
    return () => window.removeEventListener('fees:action', handler)
  }, [])

  useEffect(() => {
    if (!pendingAction) return
    if (pendingAction.tab !== activeTab) return

    const type = pendingAction.type
    const tab = pendingAction.tab

    setPendingAction(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(`fees:${type}`, { detail: { tab } }))
      })
    })
  }, [activeTab, pendingAction])
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  // Inject Actions into Global Header
  useEffect(() => {
    const actions = (
      <div className="flex items-center gap-2">
        <TouchFriendlyButton
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => window.dispatchEvent(new CustomEvent('fees:action', { detail: { tab: activeTab, type: 'export' } }))}
        >
          <Download className="h-4 w-4 mr-2" />
          {isTablet ? t('admin_parents.export', 'Export') : t('admin_fees.export_data', 'Export Data')}
        </TouchFriendlyButton>
        <TouchFriendlyButton
          variant="primary"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('fees:action', { detail: { tab: 'templates', type: 'create' } }))
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isTablet ? t('common.new', 'New') : t('admin_fees.create_new_fee', 'Create New Fee')}
        </TouchFriendlyButton>
      </div>
    );

    setHeaderActions(actions);
    return () => setHeaderActions(null);
  }, [activeTab, isTablet, setHeaderActions, t]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('fees:action', { detail: { tab: activeTab, type: 'export' } }))
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  // Tab configuration with responsive labels
  const tabs = [
    { 
      value: 'dashboard', 
      icon: BarChart4, 
      label: t('admin_fees.dashboard', 'Dashboard'),
      shortLabel: t('admin_fees.dashboard_short', 'Dash'),
      mobileLabel: t('admin_fees.dashboard', 'Dashboard')
    },
    { 
      value: 'templates', 
      icon: Settings, 
      label: t('admin_fees.fee_templates', 'Fee Templates'),
      shortLabel: t('admin_fees.fee_templates_short', 'Templates'),
      mobileLabel: t('admin_fees.fee_templates', 'Templates')
    },
    { 
      value: 'invoices', 
      icon: FileText, 
      label: t('admin_fees.invoices', 'Invoices'),
      shortLabel: t('admin_fees.invoices', 'Invoices'),
      mobileLabel: t('admin_fees.invoices', 'Invoices')
    },
    { 
      value: 'payments', 
      icon: DollarSign, 
      label: t('admin_fees.payments', 'Payments'),
      shortLabel: t('admin_fees.payments', 'Payments'),
      mobileLabel: t('admin_fees.payments', 'Payments')
    },
    { 
      value: 'reminders', 
      icon: Clock, 
      label: t('admin_fees.reminders', 'Reminders'),
      shortLabel: t('admin_fees.reminders', 'Reminders'),
      mobileLabel: t('admin_fees.reminders', 'Reminders')
    },
    { 
      value: 'defaulters', 
      icon: AlertTriangle, 
      label: t('admin_fees.defaulters', 'Defaulters'),
      shortLabel: t('admin_fees.defaulters', 'Defaulters'),
      mobileLabel: t('admin_fees.defaulters', 'Defaulters')
    },
    { 
      value: 'reports', 
      icon: BarChart4, 
      label: t('admin_fees.reports', 'Reports'),
      shortLabel: t('admin_fees.reports', 'Reports'),
      mobileLabel: t('admin_fees.reports', 'Reports')
    },
    { 
      value: 'settings', 
      icon: Settings, 
      label: t('admin_fees.settings', 'Settings'),
      shortLabel: t('admin_fees.settings', 'Settings'),
      mobileLabel: t('admin_fees.settings', 'Settings')
    }
  ];

  const getTabLabel = (tab: typeof tabs[0]) => {
    if (isSmallMobile) return '';
    if (isMobile) return tab.shortLabel;
    return tab.label;
  };

  const MainContent = () => (
    <div className={cn(
      "flex-1 overflow-hidden",
      "bg-gray-50 dark:bg-slate-900"
    )}>
      <div className={cn(
        "h-full overflow-y-auto",
        "px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8"
      )}>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Mobile Header with Menu Toggle */}
          {isMobile && (
            <div className="flex items-center justify-between mb-4">
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2"
              >
                <Menu className="h-5 w-5" />
              </TouchFriendlyButton>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {t('admin_fees.title', 'Fees Management')}
              </h1>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>
          )}

          {/* Desktop Header - Simplified */}
          {!isMobile && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400">
                  {t('admin_fees.description', 'Manage fee structures, invoices, payments, and financial reports')}
                </p>
              </div>
            </div>
          )}

          {/* AI Insights Bar - Responsive */}
          <div className={cn(
            "w-full",
            isMobile && "px-1"
          )}>
            <AIInsightsBar />
          </div>

          {/* Main Tabs Content */}
          <Tabs 
            defaultValue="dashboard" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            {/* Mobile Tabs Dropdown */}
            {isMobile ? (
              <div className="relative mb-4">
                <TouchFriendlyButton
                  variant="outline"
                  onClick={() => setMobileTabsOpen(!mobileTabsOpen)}
                  className="w-full justify-between h-12"
                >
                  <div className="flex items-center">
                    {React.createElement(
                      tabs.find(tab => tab.value === activeTab)?.icon || BarChart4,
                      { className: "h-4 w-4 mr-2" }
                    )}
                    {tabs.find(tab => tab.value === activeTab)?.mobileLabel}
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    mobileTabsOpen && "rotate-180"
                  )} />
                </TouchFriendlyButton>
                
                {mobileTabsOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TouchFriendlyButton
                          key={tab.value}
                          variant="ghost"
                          onClick={() => {
                            setActiveTab(tab.value);
                            setMobileTabsOpen(false);
                          }}
                          className={cn(
                            "w-full justify-start h-12 rounded-none border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                            activeTab === tab.value && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                          )}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {tab.mobileLabel}
                        </TouchFriendlyButton>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Desktop/Tablet Tabs */
              <TabsList className={cn(
                "grid gap-1 p-1 rounded-lg",
                "bg-gray-100 dark:bg-slate-800",
                isTablet ? "grid-cols-4" : "grid-cols-8",
                "mb-6"
              )}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value} 
                      className={cn(
                        "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                        "transition-all duration-200",
                        "min-h-[44px] px-2 py-2",
                        isTablet && "text-xs"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className={cn(
                        "truncate",
                        isTablet && "text-xs"
                      )}>
                        {getTabLabel(tab)}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            )}

            {/* Tab Content with Responsive Spacing */}
            <div className={cn(
              "space-y-4 sm:space-y-6",
              isMobile && "px-1"
            )}>
              <TabsContent value="dashboard" className="mt-0">
                <FeesDashboard />
              </TabsContent>

              <TabsContent value="templates" className="mt-0">
                <FeeTemplateManager />
              </TabsContent>

              <TabsContent value="invoices" className="mt-0">
                <InvoiceDashboard />
              </TabsContent>

              <TabsContent value="payments" className="mt-0">
                <PaymentHistoryTable />
              </TabsContent>

              <TabsContent value="reminders" className="mt-0">
                <SmartReminderPanel />
              </TabsContent>

              <TabsContent value="defaulters" className="mt-0">
                <DefaulterListView />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <FinancialReports />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <FeeSettingsPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );

  return <MainContent />;
}

export default FeesPage;
