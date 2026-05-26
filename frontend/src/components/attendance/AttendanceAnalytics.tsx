import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Loader2, 
  AlertTriangle, 
  Filter, 
  Calendar, 
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import api from '@/lib/api';

interface DailyTrend {
  date: string;
  day: number;
  presence_rate: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

interface AnalyticsData {
  branch_id: string;
  year: number;
  month: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  total_records: number;
  presence_rate: number;
  daily_trends: DailyTrend[];
}

interface ClassItem {
  id: number;
  name: string;
}

export const AttendanceAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Load Class list for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const resp = await api.get('/classes');
        // Handle variations in api response structure
        const list = resp.data?.classes || resp.data?.data || resp.data || [];
        setClasses(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load classes for selection:', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch Analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        year: selectedYear,
        month: selectedMonth
      };
      if (selectedClassId) {
        params.class_id = parseInt(selectedClassId);
      }
      
      const resp = await api.get('/saas/attendance/analytics', { params });
      if (resp.data?.success) {
        setAnalytics(resp.data.analytics);
      } else {
        setError('Failed to fetch attendance analytics.');
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Access Denied: Unauthorised to fetch attendance statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedClassId, selectedYear, selectedMonth]);

  // Construct charts data
  const statusData = analytics ? [
    { name: 'Present', count: analytics.present_count, fill: '#10b981' },
    { name: 'Late', count: analytics.late_count, fill: '#f59e0b' },
    { name: 'Absent', count: analytics.absent_count, fill: '#ef4444' },
    { name: 'Excused', count: analytics.excused_count, fill: '#64748b' }
  ] : [];

  const radialData = analytics ? [
    {
      name: 'Presence',
      value: parseFloat(analytics.presence_rate.toString()),
      fill: '#6366f1'
    }
  ] : [];

  const activeBranchName = localStorage.getItem('active_branch_name') || 'Main Campus';

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-indigo-600 animate-pulse" />
              <span>Attendance Tracker Analytics</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Building className="h-3 w-3 shrink-0" />
              <span>Campus: {activeBranchName}</span>
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-start">
          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none font-bold transition-all shadow-inner focus:ring-1 focus:ring-indigo-100"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none font-bold transition-all shadow-inner focus:ring-1 focus:ring-indigo-100"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none font-bold transition-all shadow-inner focus:ring-1 focus:ring-indigo-100"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm max-w-2xl animate-shake">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-extrabold text-rose-800">Analytical Error</span>
            <p className="mt-0.5 text-rose-600 font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <span className="text-slate-400 font-bold text-sm tracking-wider uppercase">Compiling metrics...</span>
        </div>
      ) : !analytics || analytics.total_records === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center gap-3 shadow-sm max-w-xl mx-auto mt-12">
          <Calendar className="h-12 w-12 text-slate-300 animate-pulse" />
          <div>
            <h3 className="font-black text-slate-800 text-sm tracking-tight">No Attendance Logs Found</h3>
            <p className="text-slate-400 text-xs mt-1 leading-normal max-w-xs">
              No presence records have been submitted for this class/branch in the selected month cycle.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Key Metrics cards row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Days</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{analytics.present_count}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Late Arrivals</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{analytics.late_count}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent Days</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{analytics.absent_count}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-150">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recorded</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{analytics.total_records}</h3>
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Speedometer Radial Chart */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col gap-4 items-center text-center">
              <div className="w-full text-left">
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Active Presence Rate</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                  Decimal-Precise Attendance Ratio
                </span>
              </div>
              
              <div className="relative h-[220px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="70%" 
                    outerRadius="100%" 
                    barSize={16} 
                    data={radialData}
                    startAngle={180}
                    endAngle={-180}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={30}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-3">
                  <h2 className="text-3xl font-black text-slate-800">{analytics.presence_rate}%</h2>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest mt-1.5">
                    Target Met
                  </span>
                </div>
              </div>
            </div>

            {/* Status Distribution Bar Chart */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col gap-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Status Distribution</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                  Logs Count Classified By Status
                </span>
              </div>
              
              <div className="h-[220px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Area Chart: Rolling Daily Presence Rate */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Rolling Classroom Presence Rate</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                Rolling Daily Attendance Ratio Over Monthly Cycle
              </span>
            </div>
            
            <div className="h-[260px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presenceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip labelFormatter={(label, items) => {
                    const item = items[0]?.payload;
                    return item ? `Date: ${item.date}` : `Day: ${label}`;
                  }} />
                  <Area 
                    type="monotone" 
                    dataKey="presence_rate" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#presenceGrad)" 
                    name="Presence Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceAnalytics;
