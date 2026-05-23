import React from 'react';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import EnterpriseUpgradeScreen from './EnterpriseUpgradeScreen';

interface EnterpriseGateProps {
  element: React.ReactElement;
}

export default function EnterpriseGate({ element }: EnterpriseGateProps) {
  const { current, isLoading } = useSaasTenant();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying enterprise subscription...</p>
        </div>
      </div>
    );
  }

  const tenantPlan = current?.tenant?.plan || 'trial';

  // Strict enforcement: multi-branch configurations are restricted exclusively to 'enterprise' (and 'ultimate' for full administrative access)
  if (tenantPlan.toLowerCase() !== 'enterprise' && tenantPlan.toLowerCase() !== 'ultimate') {
    return <EnterpriseUpgradeScreen />;
  }

  return element;
}
