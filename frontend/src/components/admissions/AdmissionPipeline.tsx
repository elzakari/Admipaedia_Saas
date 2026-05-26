import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Loader2, 
  AlertTriangle, 
  ChevronRight, 
  Copy, 
  CheckCircle, 
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  Clock,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import api from '@/lib/api';

interface Application {
  id: number;
  parent_id: number;
  student_first_name: string;
  student_last_name: string;
  target_class_id: number | null;
  target_class_name: string | null;
  payment_status: string;
  status: string;
  submission_date: string | null;
  form_data: any;
  created_at: string | null;
}

const STATUS_COLUMNS = [
  { id: 'draft', name: 'Drafts', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'submitted', name: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'under_review', name: 'Under Review', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'accepted', name: 'Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'rejected', name: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-100' }
];

export const AdmissionPipeline: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  
  // Transition/Modal states
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [provisionedStudentId, setProvisionedStudentId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get('/saas/admissions');
      if (resp.data?.success) {
        setApplications(resp.data.applications || []);
      } else {
        setError('Failed to fetch admission applications.');
      }
    } catch (err: any) {
      console.error('Failed loading applications:', err);
      setError(err.response?.data?.message || 'Access Denied: Unauthorised to fetch admission context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = async (applicationId: number, status: string) => {
    if (updatingId !== null) return;
    setUpdatingId(applicationId);
    setError(null);
    try {
      const resp = await api.post(`/saas/admissions/${applicationId}/status`, { status });
      if (resp.data?.success) {
        // Update local list
        setApplications(prev => prev.map(app => 
          app.id === applicationId ? { ...app, status: status.toLowerCase() } : app
        ));
        
        // If accepted, display success claim modal
        if (status.toLowerCase() === 'accepted') {
          setActivationUrl(resp.data.activation_url || null);
          setProvisionedStudentId(resp.data.student_id || null);
          setShowSuccessModal(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to change status:', err);
      setError(err.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyLink = () => {
    if (activationUrl) {
      navigator.clipboard.writeText(activationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter application list
  const filteredApps = applications.filter(app => {
    const fullName = `${app.student_first_name || ''} ${app.student_last_name || ''}`.toLowerCase();
    const classMatch = app.target_class_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = fullName.includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || classMatch;

    if (paymentFilter === 'all') return matchesSearch;
    return matchesSearch && app.payment_status === paymentFilter;
  });

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600 animate-pulse" />
              <span>Student Admissions Pipeline</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              Active Tenant Scoped Pipeline Dashboard
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-100 focus:border-indigo-300 text-sm focus:ring-1 focus:ring-indigo-200 outline-none transition-all shadow-inner text-slate-700 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              <span>Form Purchase:</span>
            </span>
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {['all', 'paid', 'pending'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPaymentFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                    paymentFilter === filter
                      ? 'bg-white text-indigo-600 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Errors */}
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm max-w-2xl animate-shake">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-extrabold text-rose-800">Operation Denied</span>
            <p className="mt-0.5 text-rose-600 font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Kanban Board Layout */}
      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <span className="text-slate-400 font-bold text-sm tracking-wider uppercase">Loading admission matrix...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-start">
          {STATUS_COLUMNS.map((column) => {
            const columnApps = filteredApps.filter(app => app.status === column.id);

            return (
              <div 
                key={column.id} 
                className="bg-slate-100/60 rounded-3xl border border-slate-200/40 p-4 flex flex-col gap-4 shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-[11px] font-black tracking-wider uppercase rounded-xl border ${column.color}`}>
                      {column.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-400 bg-white border border-slate-200/50 px-2 py-0.5 rounded-full shadow-sm">
                    {columnApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex flex-col gap-3 min-h-[400px]">
                  {columnApps.length === 0 ? (
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-center p-6 text-slate-300">
                      <span className="text-xs font-bold select-none">No Applications</span>
                    </div>
                  ) : (
                    columnApps.map((app) => (
                      <div 
                        key={app.id} 
                        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3"
                      >
                        {/* Name and Target Class */}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                            {app.student_first_name} {app.student_last_name}
                          </h4>
                          <p className="text-xs text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{app.target_class_name || 'Unassigned Class'}</span>
                          </p>
                        </div>

                        {/* Badges Info */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            app.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            Form: {app.payment_status}
                          </span>
                        </div>

                        {/* Status Transition Triggers */}
                        {updatingId === app.id ? (
                          <div className="flex items-center justify-center py-1">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          </div>
                        ) : (
                          <div className="border-t border-slate-50 pt-3 flex flex-wrap gap-1.5 justify-end">
                            {app.status === 'submitted' && (
                              <button 
                                onClick={() => handleStatusChange(app.id, 'under_review')}
                                className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg active:scale-95 transition-all"
                              >
                                Review
                              </button>
                            )}
                            {app.status === 'under_review' && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(app.id, 'accepted')}
                                  className="px-2.5 py-1.5 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-lg active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>Accept</span>
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(app.id, 'rejected')}
                                  className="px-2.5 py-1.5 text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-lg active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <X className="h-3 w-3 shrink-0" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium Application Acceptance Claim Link Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl w-full max-w-md flex flex-col items-center gap-5 text-center transform scale-95 transition-all duration-300">
            <div className="bg-emerald-50 p-3 rounded-full border border-emerald-100 animate-bounce">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Admission Accepted Successfully!
              </h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                A clean Student profile and User account have been atomically provisioned in the database.
              </p>
            </div>

            {/* Token and Claim URL copy area */}
            {activationUrl && (
              <div className="w-full flex flex-col gap-2 bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left shadow-inner">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Secure Claim Account Link</span>
                </span>
                
                <div className="flex items-center gap-2 mt-1 bg-white p-2 rounded-xl border border-slate-200/70">
                  <input
                    type="text"
                    readOnly
                    value={activationUrl}
                    className="flex-1 text-xs font-mono select-all bg-transparent border-none focus:ring-0 outline-none text-slate-700 shrink truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg transition-all ${
                      copied 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1">
                  Forward this link to the student/parent to verify identity and initialize credentials. Link expires in 48 hours.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionPipeline;
