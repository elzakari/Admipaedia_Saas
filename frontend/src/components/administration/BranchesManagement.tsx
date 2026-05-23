import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Edit2, Check, X, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import api from '../../lib/api';

interface BranchItem {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_active: boolean;
}

export default function BranchesManagement() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating / editing
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/school/branches');
      if (response.data && response.data.success) {
        setBranches(response.data.branches || []);
      } else {
        setError(response.data.message || 'Failed to retrieve branches');
      }
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      setError(err.response?.data?.message || 'Failed to retrieve branches. Ensure you are on the Enterprise plan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.strip()) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post('/school/branches', {
        name: name.strip(),
        code: code.strip() || null,
        address: address.strip() || null
      });

      if (response.data && response.data.success) {
        setIsAddOpen(false);
        setName('');
        setCode('');
        setAddress('');
        fetchBranches();
      } else {
        setError(response.data.message || 'Failed to create branch');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !name.strip()) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await api.put(`/school/branches/${editingBranch.id}`, {
        name: name.strip(),
        code: code.strip() || null,
        address: address.strip() || null
      });

      if (response.data && response.data.success) {
        setEditingBranch(null);
        setName('');
        setCode('');
        setAddress('');
        fetchBranches();
      } else {
        setError(response.data.message || 'Failed to update branch');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (branchId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this branch? This will restrict local session contexts.')) return;

    try {
      const response = await api.delete(`/school/branches/${branchId}`);
      if (response.data && response.data.success) {
        fetchBranches();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate branch');
    }
  };

  const openAdd = () => {
    setName('');
    setCode('');
    setAddress('');
    setIsAddOpen(true);
    setEditingBranch(null);
  };

  const openEdit = (branch: BranchItem) => {
    setName(branch.name);
    setCode(branch.code || '');
    setAddress(branch.address || '');
    setEditingBranch(branch);
    setIsAddOpen(false);
  };

  // String helpers for 3-language labels
  const labelBranches = t('navigation.branches', 'Branches');
  const labelHq = t('navigation.hq', 'Headquarters');
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-slate-700 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{labelBranches} ({t('navigation.branches_ewe', 'Alɔwo')})</h2>
            <p className="text-sm text-slate-500">{t('branches.manage_desc', 'Manage physical school campuses and regional hubs')}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-2">
          <Plus size={16} />
          {t('branches.add_new', 'Add Campus')}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Forms Drawer/Block */}
      {(isAddOpen || editingBranch) && (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            {editingBranch ? `${t('branches.edit_title', 'Edit Campus')}: ${editingBranch.name}` : t('branches.add_title', 'Configure New Campus')}
          </h3>
          <form onSubmit={editingBranch ? handleEdit : handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.name', 'Campus Name')}</label>
              <Input
                type="text"
                placeholder="e.g. Accra North Campus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.code', 'Unique Code')}</label>
              <Input
                type="text"
                placeholder="e.g. ACC-N"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.address', 'Physical Address')}</label>
              <Input
                type="text"
                placeholder="e.g. 12 Ring Road, Accra"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddOpen(false); setEditingBranch(null); }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"
              >
                {submitting ? t('common.saving', 'Saving...') : editingBranch ? t('common.save_changes', 'Save Changes') : t('branches.create_btn', 'Deploy Branch')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Branches List */}
      {branches.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <Building2 size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-700 dark:text-slate-300">{t('branches.empty_title', 'No Branches Deployed')}</h4>
            <p className="text-sm text-slate-500">{t('branches.empty_desc', 'This headquarters does not have active regional campuses yet.')}</p>
          </div>
          <Button onClick={openAdd} variant="outline" className="rounded-xl border-slate-300 dark:border-slate-700">
            {t('branches.provision_first', 'Provision First Branch')}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.table.name', 'Campus')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.table.code', 'Code')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.table.address', 'Location')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('branches.table.status', 'Status')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <div className="font-bold text-slate-950 dark:text-white text-sm">{b.name}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {b.code ? <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">{b.code}</span> : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-500 flex items-center gap-1.5 mt-2">
                      <MapPin size={14} className="shrink-0" />
                      <span>{b.address || t('branches.no_address', 'No location set')}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {b.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(b)}
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                        >
                          <Edit2 size={14} />
                        </Button>
                        {b.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(b.id)}
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-lg text-slate-400"
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Add string strip utility just in case
if (!String.prototype.strip) {
  String.prototype.strip = function() {
    return this.trim();
  };
}

declare global {
  interface String {
    strip(): string;
  }
}
