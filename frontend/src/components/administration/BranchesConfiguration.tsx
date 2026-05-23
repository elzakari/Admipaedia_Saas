import React from 'react';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import EnterpriseUpgradeScreen from '../onboarding/EnterpriseUpgradeScreen';
import BranchesManagement from './BranchesManagement';

export default function BranchesConfiguration() {
  const { current, isLoading } = useSaasTenant();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">Checking enterprise subscription...</p>
        </div>
      </div>
    );
  }

  const tenantPlan = current?.tenant?.plan || 'trial';

  // Strict enforcement: branches configurations are restricted to enterprise and ultimate plans
  if (tenantPlan.toLowerCase() !== 'enterprise' && tenantPlan.toLowerCase() !== 'ultimate') {
    return <EnterpriseUpgradeScreen />;
  }

  return <BranchesManagement />;
}
