import React from 'react';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import { usePlanContext } from '@/hooks/usePlanContext';
import { useAuth } from '@/contexts/AuthContext';
import UltimateUpgradeScreen from './UltimateUpgradeScreen';
import { canAccessAdministration } from '@/lib/administrationAccess';

interface AdministrationGateProps {
  element: React.ReactElement;
}

export default function AdministrationGate({ element }: AdministrationGateProps) {
  const { current, isLoading } = useSaasTenant();
  const { data: planContext, isLoading: isPlanContextLoading } = usePlanContext();
  const { user } = useAuth();

  if (isLoading || isPlanContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying subscriptions...</p>
        </div>
      </div>
    );
  }

  // Gracefully handle null tenant states when the user holds administrative credentials
  const isUserAdmin = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'super_admin';
  if (!current && isUserAdmin) {
    return element;
  }

  const hasAdministrationAccess = canAccessAdministration({
    role: user?.role,
    planSlug: current?.tenant?.plan || planContext?.plan?.slug || 'trial',
    enabledFeatures: current?.tenant?.enabled_features || [],
    featureFlags: planContext?.features || null,
  });

  if (!hasAdministrationAccess) {
    return <UltimateUpgradeScreen />;
  }

  return element;
}
