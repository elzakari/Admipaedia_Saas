import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  Building, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie
} from 'recharts';
import api from '@/lib/api';

interface BranchMetrics {
  branch_id: string;
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
  collections_by_method: Record<string, number>;
  fees_by_status: Record<string, number>;
}

interface BranchComparison {
  branch_id: string;
  branch_name: string;
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
}

interface SaaSStats {
  active_plan_name: string;
  invoice_count: number;
  total_paid: number;
  balance_due: number;
  next_due_date: string | null;
}

interface GlobalMetrics {
  global_billed: number;
  global_collected: number;
  global_outstanding: number;
  global_collection_rate: number;
  collections_by_method: Record<string, number>;
  fees_by_status: Record<string, number>;
  branch_comparison: BranchComparison[];
  saas_subscription: SaaSStats;
}

interface BranchOption {
  id: string;
  name: string;
}

export const RevenueOverview: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('accountant');
  const [isProprietor, setIsProprietor] = useState<boolean>(false);
  
  // State for active views
  const [viewMode, setViewMode] = useState<'branch' | 'global'>('branch');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  // Scoped Data
  const [branchData, setBranchData] = useState<BranchMetrics | null>(null);
  const [globalData, setGlobalData] = useState<GlobalMetrics | null>(null);

  // Fetch initial profile context and data
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Resolve user profile role
        const profileResp = await api.get('/auth/me');
        const role = profileResp.data?.role || 'accountant';
        setUserRole(role);
        
        const proprietorRoles = ['admin', 'school_admin', 'super_admin', 'super_manager'];
        const matchesProprietor = proprietorRoles.includes(role);
        setIsProprietor(matchesProprietor);
        
        // 2. Fetch list of branches for selection if proprietor
        if (matchesProprietor) {
          const branchResp = await api.get('/branches');
          const branchList = branchResp.data?.branches || branchResp.data || [];
          setBranches(branchList);
          
          // Default selection to active branch context or the first available branch
          const activeBranchId = localStorage.getItem('active_branch_id') || localStorage.getItem('saas_current_branch_id') || '';
          const resolvedBranchId = branchList.find((b: any) => b.id === activeBranchId)?.id || branchList[0]?.id || '';
          setSelectedBranchId(resolvedBranchId);
          setViewMode('global'); // Proprietors default to broad global view
        } else {
          // Locked accountant view
          setViewMode('branch');
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setError('Failed to load user profile or branch configuration.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeDashboard();
  }, []);

  // Fetch metrics depending on selection
  useEffect(() => {
    const fetchMetrics = async () => {
      if (viewMode === 'branch') {
        if (!isProprietor) {
          // Locked local accountant query
          setLoading(true);
          try {
            const resp = await api.get('/saas/financial/branch-ledger');
            setBranchData(resp.data?.data);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Access Denied: Unauthorised to fetch branch financial statistics.');
          } finally {
            setLoading(false);
          }
        } else if (selectedBranchId) {
          // Proprietor choosing specific branch
          setLoading(true);
          try {
            const resp = await api.get('/saas/financial/branch-ledger', {
              params: { branch_id: selectedBranchId }
            });
            setBranchData(resp.data?.data);
          } catch (err: any) {
            setError('Failed to fetch specific branch financials.');
          } finally {
            setLoading(false);
          }
        }
      } else if (viewMode === 'global' && isProprietor) {
        // Proprietor requesting global cross-campus view
        setLoading(true);
        try {
          const resp = await api.get('/saas/financial/global-ledger');
          setGlobalData(resp.data?.data);
        } catch (err: any) {
          setError('Failed to load global cross-campus financials.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
  }, [viewMode, selectedBranchId, isProprietor]);

  // Loading and Error transitions
  if (loading && !branchData && !globalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="text-gray-500 font-medium">Aggregating Ledger statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-bold text-lg">System Security Restriction</h3>
            <p className="text-red-700 mt-1 text-sm leading-relaxed">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Retry Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active view payload
  const activeBilled = viewMode === 'branch' ? branchData?.total_billed || 0 : globalData?.global_billed || 0;
  const activeCollected = viewMode === 'branch' ? branchData?.total_collected || 0 : globalData?.global_collected || 0;
  const activeOutstanding = viewMode === 'branch' ? branchData?.total_outstanding || 0 : globalData?.global_outstanding || 0;
  const activeRate = viewMode === 'branch' ? branchData?.collection_rate || 0 : globalData?.global_collection_rate || 0;
  const collectionsByMethod = viewMode === 'branch' ? branchData?.collections_by_method : globalData?.collections_by_method;
  const feesByStatus = viewMode === 'branch' ? branchData?.fees_by_status : globalData?.fees_by_status;

  // Chart data formatting
  const methodChartData = collectionsByMethod ? Object.entries(collectionsByMethod).map(([key, val]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value: val
  })) : [];

  const statusPieData = feesByStatus ? Object.entries(feesByStatus).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val
  })) : [];

  const PIE_COLORS = ['#fbbf24', '#f59e0b', '#10b981', '#ef4444']; // yellow, orange, green, red

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* A. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Revenue Ledger & Financial Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Multi-campus collection analytics and SaaS subscription matrices.</p>
        </div>
        
        {/* Toggle Switch / Controls */}
        <div className="flex items-center gap-3">
          {isProprietor ? (
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200 shadow-inner">
              <button
                onClick={() => setViewMode('global')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  viewMode === 'global' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Global View
              </button>
              <button
                onClick={() => setViewMode('branch')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  viewMode === 'branch' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Campus Scoped
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Lock className="h-3.5 w-3.5" />
              <span>Campus Restricted Accountant Profile</span>
            </span>
          )}

          {viewMode === 'branch' && isProprietor && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* B. Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Billed */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-3 bottom-3 opacity-15">
            <Layers className="h-28 w-28 text-white" />
          </div>
          <p className="text-indigo-100 text-xs font-bold tracking-wider uppercase">Total Billed (Fees)</p>
          <p className="text-3xl font-extrabold mt-3">${activeBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-100 bg-white/10 px-3 py-1 rounded-xl w-fit">
            <span>Aggregated Gross Ledger</span>
          </div>
        </div>

        {/* 2. Total Collected */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 bottom-3 text-emerald-500/10">
            <DollarSign className="h-28 w-28" />
          </div>
          <p className="text-gray-400 text-xs font-bold tracking-wider uppercase">Total Collected</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-3">${activeCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time collections</span>
          </div>
        </div>

        {/* 3. Outstanding Balance */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 bottom-3 text-amber-500/10">
            <Clock className="h-28 w-28" />
          </div>
          <p className="text-gray-400 text-xs font-bold tracking-wider uppercase">Outstanding Balance</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-3">${activeOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-xl w-fit">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Requires Collection Follow-up</span>
          </div>
        </div>

        {/* 4. Collection Efficiency */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 bottom-3 text-indigo-500/10">
            <TrendingUp className="h-28 w-28" />
          </div>
          <p className="text-gray-400 text-xs font-bold tracking-wider uppercase">Collection Efficiency</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-3">{activeRate.toFixed(2)}%</p>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(activeRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* C. Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Bar Chart of collections by method */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              <span>Collections by Payment Channel</span>
            </h3>
          </div>
          <div className="h-64">
            {methodChartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Collected']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]}>
                    {methodChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#4f46e5' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="text-xs font-semibold">No completed collections recorded for this selection.</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Donut Chart / status breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-500" />
            <span>Fee Status Composition</span>
          </h3>
          <div className="h-44 relative flex items-center justify-center">
            {statusPieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} items`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                <AlertCircle className="h-8 w-8" />
                <span className="text-xs font-semibold">No fees assigned.</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-gray-50">
            {statusPieData.map((d, index) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                <span className="text-gray-600 font-medium truncate">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* D. Proprietor Cross-Campus & SaaS Details Section */}
      {viewMode === 'global' && globalData && isProprietor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Campus Comparison Table */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>Campus Revenue Comparison Breakdown</span>
            </h3>
            <div className="overflow-x-auto border border-gray-50 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="p-3">CAMPUS NAME</th>
                    <th className="p-3 text-right">TOTAL BILLED</th>
                    <th className="p-3 text-right">TOTAL COLLECTED</th>
                    <th className="p-3 text-right">OUTSTANDING BALANCE</th>
                    <th className="p-3 text-right">COLLECTION RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {globalData.branch_comparison.map((b) => (
                    <tr key={b.branch_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span>{b.branch_name}</span>
                      </td>
                      <td className="p-3 text-right text-gray-600 font-medium">${b.total_billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">${b.total_collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-amber-600 font-semibold">${b.total_outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
                          {b.collection_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. SaaS Billing subscription widget */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">SaaS Subscription Status</span>
                <TrendingUp className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Active Subscription Plan</p>
                <h4 className="text-xl font-black text-white mt-1">{globalData.saas_subscription.active_plan_name}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Paid SaaS Fees</p>
                <p className="text-base font-extrabold text-emerald-400 mt-1">${globalData.saas_subscription.total_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">SaaS Balance Due</p>
                <p className="text-base font-extrabold text-amber-400 mt-1">${globalData.saas_subscription.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="h-4 w-4 text-indigo-400" />
                <span>Next Billing Cycle:</span>
              </div>
              <span className="font-bold">
                {globalData.saas_subscription.next_due_date 
                  ? new Date(globalData.saas_subscription.next_due_date).toLocaleDateString()
                  : 'No upcoming invoice'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueOverview;
