import React from 'react';
import { Shield, Sparkles, CheckCircle2, ChevronRight, Lock, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function UltimateUpgradeScreen() {
  const navigate = useNavigate();

  const benefits = [
    {
      title: "Advanced Role & Permission Systems",
      desc: "Delegate tasks securely to department leads and registrars with customized sub-admin access roles."
    },
    {
      title: "School-Wide Audit Logging & Tracking",
      desc: "Full accountability with tracking of staff logins, continuous assessment changes, and system activities."
    },
    {
      title: "Bulk Data Import & Dynamic Report Builders",
      desc: "Save hours with multi-format bulk student imports and bespoke school-branded grading sheets."
    },
    {
      title: "Priority Multi-Channel Support",
      desc: "Direct access to our senior engineering team with a guaranteed under-4-hour SLA response window."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation / Back to Safety */}
      <div className="max-w-7xl mx-auto w-full mb-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold group transition-all"
        >
          <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
      </div>

      {/* Main Upgrade Board */}
      <div className="max-w-4xl mx-auto w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Glow effect at top left */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none"></div>

        {/* Benefits breakdown side */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" />
              Ultimate Exclusive Suite
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                Unlock School Administration
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Unlock the ultimate command center designed to scale school logistics, secure administrative controls, and automate multi-role operations.
              </p>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

            <div className="space-y-4">
              {benefits.map((b, idx) => (
                <div key={idx} className="flex gap-3 items-start group">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{b.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 text-[10px] text-slate-400 dark:text-slate-500 italic">
            * Plan upgrades are immediate. No downtime or data migration required.
          </div>
        </div>

        {/* Pricing & Checkout Side */}
        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/60 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 p-8 sm:p-10 flex flex-col justify-between relative">
          
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Ultimate Plan</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">$99</span>
                <span className="text-slate-500 text-sm font-semibold">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Unlimited students, staff, and complete administrative autonomy.</p>
            </div>

            {/* Lock illustration */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                <Lock size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-950 dark:text-white">Admin Console Locked</div>
                <div className="text-[10px] text-slate-500">Requires plan escalation</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate('/app/billing/plan')}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 group transition-all"
              >
                Upgrade to Ultimate
                <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/admin/dashboard')}
                className="w-full h-11 bg-white hover:bg-slate-100 text-slate-700 font-bold border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>

          <div className="pt-6 md:pt-0">
            <a
              href="mailto:sales@admipaedia.com"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
            >
              Contact Sales for Enterprise
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Trust Signatures */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
        © {new Date().getFullYear()} ADMIPAEDIA Platform. Trusted by 250+ educational centers worldwide.
      </div>
    </div>
  );
}
