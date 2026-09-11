import React from 'react';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import { usePlanContext } from '@/hooks/usePlanContext';
import { useTenantAuthority } from '@/hooks/useTenantAuthority';
import UltimateUpgradeScreen from './UltimateUpgradeScreen';
import { canAccessAdministration } from '@/lib/administrationAccess';

interface AdministrationGateProps {
  element: React.ReactElement;
}

export default function AdministrationGate({ element }: AdministrationGateProps) {
  const { current, isLoading } = useSaasTenant();
  const { data: planContext, isLoading: isPlanContextLoading } = usePlanContext();
  const {
    primaryRole: authorityRole,
    isLoading: isAuthorityLoading,
  } = useTenantAuthority();

  if (isLoading || isAuthorityLoading || isPlanContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying subscriptions...</p>
        </div>
      </div>
    );
  }

  // Ordinary school administrators require a validated active tenant.
  // Preserve the existing platform super-admin compatibility path.
  if (!current && authorityRole === 'super_admin') {
    return element;
  }

  const hasAdministrationAccess = canAccessAdministration({
    role: authorityRole || undefined,
    planSlug: current?.tenant?.plan || planContext?.plan?.slug || 'trial',
    enabledFeatures: current?.tenant?.enabled_features || [],
    featureFlags: planContext?.features || null,
  });

  if (!hasAdministrationAccess) {
    return <UltimateUpgradeScreen />;
  }

  return element;
}
