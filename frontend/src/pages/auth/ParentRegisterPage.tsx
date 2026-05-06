import React from 'react';
import { Link } from 'react-router-dom';
import ParentRegisterForm from './ParentRegisterForm';

const ParentRegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(50rem_35rem_at_90%_20%,rgba(79,70,229,0.14),transparent_55%),radial-gradient(50rem_35rem_at_50%_90%,rgba(59,130,246,0.10),transparent_60%)]" />
      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-8">
            <div className="flex items-center justify-center mb-6">
              <img
                src="/assets/images/Admipaedia_Logo.png"
                alt="Admipaedia Logo"
                className="h-10"
              />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Create parent account</h1>
              <p className="mt-2 text-sm text-slate-600">Register as a parent to monitor your child’s academic progress</p>
              <p className="mt-2 text-sm text-slate-600">
                <span>Already have an account? </span>
                <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
                  Sign in
                </Link>
              </p>
            </div>

            <ParentRegisterForm />
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>© {new Date().getFullYear()} ADMIPAEDIA. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentRegisterPage;
