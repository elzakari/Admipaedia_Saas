import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  FilePlus2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  GraduationCap,
  PencilLine,
  Trash2,
  RefreshCcw,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { canManageAdmissions } from './admissionsRoles';
import {
  formatAdmissionPriceLabel,
  hasMeaningfulAdmissionFormData,
  isDiscardableAdmissionStatus,
  isEditableAdmissionStatus,
  type AdmissionStatus,
} from './admissionWorkflow';

interface AdmissionApplication {
  id: number;
  student_first_name: string;
  student_last_name: string;
  target_class_id: number;
  target_class_name?: string | null;
  payment_status: 'pending' | 'paid';
  status: AdmissionStatus;
  form_purchase_date: string;
  created_at: string;
  updated_at?: string;
  submission_date?: string | null;
  form_data?: Record<string, unknown> | null;
}

const EMPTY_FORM = {
  student_first_name: '',
  student_last_name: '',
  target_class_id: '',
};

const AdmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = canManageAdmissions(user?.role);
  const [isBuyingForm, setIsBuyingForm] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const resetFormState = () => {
    setIsBuyingForm(false);
    setEditingApplicationId(null);
    setFormData(EMPTY_FORM);
  };

  const openFormManager = (application?: AdmissionApplication | null) => {
    const target = application ?? null;
    setEditingApplicationId(target?.id ?? null);
    setFormData({
      student_first_name: target?.student_first_name ?? '',
      student_last_name: target?.student_last_name ?? '',
      target_class_id: target?.target_class_id ? String(target.target_class_id) : '',
    });
    setIsBuyingForm(true);
  };

  const { data: priceData } = useQuery({
    queryKey: ['admission-price'],
    queryFn: async () => {
      const response = await api.get('/settings/admission-price');
      return response.data;
    },
    enabled: !isAdmin,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const admissionPrice = priceData?.price ?? 100.0;
  const admissionCurrency = priceData?.currency ?? 'GHS';
  const priceLabel = formatAdmissionPriceLabel(admissionPrice, admissionCurrency);

  const { data: classesData } = useQuery({
    queryKey: ['classes', 'admission-shell'],
    queryFn: async () => {
      const response = await api.get('/classes?per_page=100');
      return response.data.classes;
    },
    enabled: !isAdmin && isBuyingForm,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: applications = [], isLoading } = useQuery<AdmissionApplication[]>({
    queryKey: isAdmin ? ['all-applications'] : ['my-applications'],
    queryFn: async () => {
      const endpoint = isAdmin ? '/admissions/all' : '/admissions/my-applications';
      const response = await api.get(endpoint);
      return response.data.data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const editableApplications = useMemo(
    () => applications.filter((application) => application.payment_status === 'paid' && isEditableAdmissionStatus(application.status)),
    [applications],
  );

  const orphanApplications = useMemo(
    () => editableApplications.filter((application) => !hasMeaningfulAdmissionFormData(application.form_data)),
    [editableApplications],
  );

  const editingApplication = useMemo(
    () => applications.find((application) => application.id === editingApplicationId) ?? null,
    [applications, editingApplicationId],
  );

  const invalidateAdmissionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    queryClient.invalidateQueries({ queryKey: ['all-applications'] });
    queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
  };

  const buyFormMutation = useMutation({
    mutationFn: async (payload: { student_first_name: string; student_last_name: string; target_class_id: number }) => {
      const response = await api.post('/admissions/buy-form', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.reused_existing ? t('parent_admissions.toasts.resumed', 'Existing editable form resumed.') : t('parent_admissions.toasts.purchased', 'Form purchased successfully.'));
      invalidateAdmissionQueries();
      resetFormState();
      navigate(`/admissions/form/${data.application_id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('parent_admissions.toasts.purchase_failed', 'Failed to purchase form'));
    },
  });

  const updateBasicsMutation = useMutation({
    mutationFn: async (payload: { id: number; student_first_name: string; student_last_name: string; target_class_id: number }) => {
      const response = await api.put(`/admissions/application/${payload.id}`, {
        student_first_name: payload.student_first_name,
        student_last_name: payload.student_last_name,
        target_class_id: payload.target_class_id,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(t('parent_admissions.toasts.updated', 'Admission form updated.'));
      invalidateAdmissionQueries();
      resetFormState();
      navigate(`/admissions/form/${variables.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('parent_admissions.toasts.update_failed', 'Failed to update application'));
    },
  });

  const discardApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await api.delete(`/admissions/application/${applicationId}`);
      return response.data;
    },
    onSuccess: (_, applicationId) => {
      if (editingApplicationId === applicationId) {
        resetFormState();
      }
      toast.success(t('parent_admissions.toasts.discarded', 'Application discarded.'));
      invalidateAdmissionQueries();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('parent_admissions.toasts.discard_failed', 'Failed to discard application'));
    },
  });

  const handlePrimaryAction = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!formData.student_first_name || !formData.student_last_name || !formData.target_class_id) {
      toast.error(t('parent_admissions.toasts.fill_fields', 'Please fill all fields'));
      return;
    }

    const payload = {
      student_first_name: formData.student_first_name.trim(),
      student_last_name: formData.student_last_name.trim(),
      target_class_id: Number(formData.target_class_id),
    };

    if (!payload.student_first_name || !payload.student_last_name || !Number.isFinite(payload.target_class_id)) {
      toast.error(t('parent_admissions.toasts.invalid_details', 'Please provide valid admission details'));
      return;
    }

    if (editingApplicationId) {
      updateBasicsMutation.mutate({ id: editingApplicationId, ...payload });
      return;
    }

    buyFormMutation.mutate(payload);
  };

  const handleOpenAdmissionManager = () => {
    openFormManager(orphanApplications[0] ?? null);
  };

  const getStatusBadge = (status: AdmissionStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">{t('parent_admissions.statuses.draft', 'Draft')}</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('parent_admissions.statuses.submitted', 'Submitted')}</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('parent_admissions.statuses.under_review', 'Under Review')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('parent_admissions.statuses.approved', 'Approved')}</Badge>;
      case 'returned':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('parent_admissions.statuses.returned', 'Returned')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('parent_admissions.statuses.rejected', 'Rejected')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resolveTargetClassName = (application: AdmissionApplication) =>
    application.target_class_name ||
    classesData?.find((cls: any) => cls.id === application.target_class_id)?.name ||
    t('parent_admissions.class_unavailable', 'Class unavailable');

  const isMutatingShell = buyFormMutation.isPending || updateBasicsMutation.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? t('parent_admissions.admin_title', 'Admission Management') : t('parent_admissions.title', 'Admission Applications')}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin
              ? t('parent_admissions.admin_subtitle', 'Review and manage all student admission applications')
              : t('parent_admissions.subtitle', "Manage and track your children's admission process")}
          </p>
          {!isAdmin && editableApplications.length > 0 ? (
            <p className="text-sm text-indigo-600 mt-2">
              {t(
                'parent_admissions.smart_crud_hint',
                {
                  count: editableApplications.length,
                  defaultValue: 'You already have {{count}} editable application(s). We will resume or update them instead of creating duplicate orphan drafts.',
                },
              )}
            </p>
          ) : null}
        </div>
        {!isAdmin && (
          <Button
            onClick={handleOpenAdmissionManager}
            className="h-auto min-h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 flex items-center gap-3 rounded-xl px-4 py-3"
          >
            <FilePlus2 size={18} className="shrink-0" />
            <span className="flex items-center gap-3">
              <span className="font-semibold">
                {t('parent_admissions.buy_form', { defaultValue: 'Buy Admission Form' })}
              </span>
              <span className="rounded-full bg-white/18 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/20">
                {priceLabel}
              </span>
            </span>
          </Button>
        )}
      </div>

      {!isAdmin && editableApplications.length > 0 ? (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <RefreshCcw className="text-indigo-600" size={18} />
              {t('parent_admissions.editable_forms_title', 'Editable admission forms')}
            </CardTitle>
            <CardDescription>
              {t(
                'parent_admissions.editable_forms_desc',
                'Continue, update, or discard drafts that are still under your control before buying another form.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableApplications.slice(0, 4).map((application) => (
              <div key={application.id} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {application.student_first_name} {application.student_last_name}
                    </div>
                    <div className="text-sm text-gray-500">{resolveTargetClassName(application)}</div>
                  </div>
                  {getStatusBadge(application.status)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/admissions/form/${application.id}`)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {t('parent_admissions.continue_form', 'Continue Filling Form')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openFormManager(application)}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    {t('parent_admissions.edit_shell', 'Edit Basics')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    disabled={discardApplicationMutation.isPending}
                    onClick={() => discardApplicationMutation.mutate(application.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('parent_admissions.discard', 'Discard')}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isBuyingForm && (
        <Card className="border-indigo-200 bg-indigo-50/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <CreditCard className="text-indigo-600" />
              {editingApplication
                ? t('parent_admissions.update_form', 'Update Admission Form Basics')
                : t('parent_admissions.new_form', 'New Admission Form')}
            </CardTitle>
            <CardDescription>
              {editingApplication
                ? t('parent_admissions.update_details', 'Adjust the student name or target class, then continue the existing form.')
                : t('parent_admissions.enter_details', { price: priceLabel, defaultValue: 'Enter the basic details to purchase an admission form priced at {{price}}.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!editingApplication && editableApplications.length > 0 ? (
              <div className="rounded-xl border border-dashed border-indigo-200 bg-white/80 p-4">
                <div className="font-medium text-indigo-900">
                  {t('parent_admissions.manage_existing_before_new', 'Existing editable forms found')}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {t(
                    'parent_admissions.manage_existing_before_new_desc',
                    'Selecting a blank draft here will recycle it instead of creating another orphan admission record.',
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editableApplications.map((application) => (
                    <Button key={application.id} size="sm" variant="outline" onClick={() => openFormManager(application)}>
                      #{application.id} {application.student_first_name} {application.student_last_name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <form onSubmit={handlePrimaryAction} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('parent_admissions.student_first_name', 'Student First Name')}</Label>
                <Input
                  id="firstName"
                  placeholder="e.g. John"
                  value={formData.student_first_name}
                  onChange={(event) => setFormData({ ...formData, student_first_name: event.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('parent_admissions.student_last_name', 'Student Last Name')}</Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Doe"
                  value={formData.student_last_name}
                  onChange={(event) => setFormData({ ...formData, student_last_name: event.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">{t('parent_admissions.target_class', 'Target Class')}</Label>
                <Select value={formData.target_class_id} onValueChange={(value) => setFormData({ ...formData, target_class_id: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t('parent_admissions.select_class', 'Select class')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classesData?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-indigo-50/50 p-4 border-t border-indigo-100">
            <Button variant="ghost" onClick={resetFormState}>
              {t('parent_admissions.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => handlePrimaryAction()} disabled={isMutatingShell} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isMutatingShell ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('parent_admissions.processing', 'Processing...')}
                </>
              ) : editingApplication ? (
                t('parent_admissions.update_and_continue', 'Update & Continue')
              ) : (
                t('parent_admissions.confirm_pay', { price: priceLabel, defaultValue: 'Confirm & Pay {{price}}' })
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 animate-pulse font-medium">{t('parent_admissions.loading', 'Loading your applications...')}</p>
        </div>
      ) : applications.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="bg-white p-4 rounded-full shadow-sm">
              <FileText className="h-12 w-12 text-gray-300" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-semibold text-gray-900">{t('parent_admissions.no_applications', 'No applications found')}</h3>
              <p className="text-gray-500">
                {isAdmin
                  ? t('parent_admissions.admin_no_applications', 'There are currently no admission applications in the system.')
                  : t('parent_admissions.parent_no_applications', "You haven't purchased any admission forms yet. Click the button above to start your first application.")}
              </p>
            </div>
            {!isAdmin && (
              <Button variant="outline" onClick={handleOpenAdmissionManager} className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                {t('parent_admissions.get_started', 'Get Started Now')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((application) => (
            <Card key={application.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 overflow-hidden">
              <div className="h-2 bg-indigo-600" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  {getStatusBadge(application.status)}
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-gray-400">
                    ID: #{application.id}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User size={20} className="text-gray-400" />
                  {application.student_first_name} {application.student_last_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <GraduationCap size={14} />
                  {t('parent_admissions.target_class', 'Target Class')}: {resolveTargetClassName(application)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('parent_admissions.purchased_on', 'Purchased On')}</p>
                    <p>{new Date(application.form_purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('parent_admissions.payment_status', 'Payment Status')}</p>
                    <p className="font-medium text-green-700 capitalize">{application.payment_status}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-4 border-t group-hover:bg-indigo-50 transition-colors">
                {!isAdmin && (isEditableAdmissionStatus(application.status) || isDiscardableAdmissionStatus(application.status)) ? (
                  <div className="flex w-full flex-wrap gap-2">
                    {isEditableAdmissionStatus(application.status) ? (
                      <>
                        <Button onClick={() => navigate(`/admissions/form/${application.id}`)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                          {t('parent_admissions.continue_form', 'Continue Filling Form')}
                        </Button>
                        <Button variant="outline" onClick={() => openFormManager(application)}>
                          <PencilLine className="mr-2 h-4 w-4" />
                          {t('parent_admissions.edit_shell', 'Edit Basics')}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => navigate(`/admissions/form/${application.id}`)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                        {t('parent_admissions.view_details', 'View Application Details')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      disabled={discardApplicationMutation.isPending}
                      onClick={() => discardApplicationMutation.mutate(application.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('parent_admissions.discard', 'Discard')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => navigate(`/admissions/form/${application.id}`)}
                    variant="ghost"
                    className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-transparent p-0 group-hover:pl-2 transition-all"
                  >
                    {application.status === 'draft'
                      ? t('parent_admissions.continue_form', 'Continue Filling Form')
                      : t('parent_admissions.view_details', 'View Application Details')}
                    <ChevronRight size={18} />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
        <AlertCircle className="text-blue-500 shrink-0" size={24} />
        <div className="space-y-2">
          <h4 className="font-semibold text-blue-900">{t('parent_admissions.guidelines', 'Admission Guidelines')}</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
            <li>{t('parent_admissions.guideline_items.non_refundable', 'Forms are non-refundable after purchase.')}</li>
            <li>{t('parent_admissions.guideline_items.clear_docs', 'Ensure all uploaded documents are clear and legible (PDF or JPEG preferred).')}</li>
            <li>{t('parent_admissions.guideline_items.review_days', 'Applications are typically reviewed within 5-7 working days after submission.')}</li>
            <li>{t('parent_admissions.guideline_items.notified_via', 'You will be notified via SMS and Email once a decision is made.')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdmissionsPage;
