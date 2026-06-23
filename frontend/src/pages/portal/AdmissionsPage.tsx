import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  FilePlus2, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  GraduationCap
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
import { formatCurrency } from '../../lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { canManageAdmissions } from './admissionsRoles';

interface AdmissionApplication {
  id: number;
  student_first_name: string;
  student_last_name: string;
  target_class_id: number;
  payment_status: 'pending' | 'paid';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  form_purchase_date: string;
  created_at: string;
}

const AdmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = canManageAdmissions(user?.role);
  const [isBuyingForm, setIsBuyingForm] = useState(false);
  const [formData, setFormData] = useState({
    student_first_name: '',
    student_last_name: '',
    target_class_id: ''
  });

  // Fetch admission form price
  const { data: priceData } = useQuery({
    queryKey: ['admission-price'],
    queryFn: async () => {
      const response = await api.get('/settings/admission-price');
      return response.data;
    }
  });

  const admissionPrice = priceData?.price ?? 100.00;
  const admissionCurrency = priceData?.currency ?? 'GHS';

  // Fetch classes for the dropdown
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes?per_page=100');
      return response.data.classes;
    }
  });

  // Fetch applications
  const { data: applications, isLoading } = useQuery<AdmissionApplication[]>({
    queryKey: isAdmin ? ['all-applications'] : ['my-applications'],
    queryFn: async () => {
      const endpoint = isAdmin ? '/admissions/all' : '/admissions/my-applications';
      const response = await api.get(endpoint);
      return response.data.data;
    }
  });

  // Mutation to buy form
  const buyFormMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admissions/buy-form', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Form purchased successfully!');
      setIsBuyingForm(false);
      setFormData({ student_first_name: '', student_last_name: '', target_class_id: '' });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate(`/admissions/form/${data.application_id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to purchase form');
    }
  });

  const handleBuyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_first_name || !formData.student_last_name || !formData.target_class_id) {
      toast.error('Please fill all fields');
      return;
    }
    buyFormMutation.mutate({
      ...formData,
      target_class_id: parseInt(formData.target_class_id)
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary" className="bg-gray-100 text-gray-700">{t('parent_admissions.statuses.draft', 'Draft')}</Badge>;
      case 'submitted': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('parent_admissions.statuses.submitted', 'Submitted')}</Badge>;
      case 'under_review': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('parent_admissions.statuses.under_review', 'Under Review')}</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('parent_admissions.statuses.approved', 'Approved')}</Badge>;
      case 'rejected': return <Badge variant="destructive">{t('parent_admissions.statuses.rejected', 'Rejected')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
        </div>
        {!isAdmin && (
          <Button 
            onClick={() => setIsBuyingForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <FilePlus2 size={18} />
            {t('parent_admissions.buy_form', { price: formatCurrency(admissionPrice, admissionCurrency), defaultValue: 'Buy Admission Form ({{price}})' })}
          </Button>
        )}
      </div>

      {isBuyingForm && (
        <Card className="border-indigo-200 bg-indigo-50/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <CreditCard className="text-indigo-600" />
              {t('parent_admissions.new_form', 'New Admission Form')}
            </CardTitle>
            <CardDescription>
              {t('parent_admissions.enter_details', { price: formatCurrency(admissionPrice, admissionCurrency), defaultValue: 'Enter the basic details to purchase an admission form ({{price}})' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuyForm} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('parent_admissions.student_first_name', 'Student First Name')}</Label>
                <Input 
                  id="firstName"
                  placeholder="e.g. John"
                  value={formData.student_first_name}
                  onChange={(e) => setFormData({...formData, student_first_name: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('parent_admissions.student_last_name', 'Student Last Name')}</Label>
                <Input 
                  id="lastName"
                  placeholder="e.g. Doe"
                  value={formData.student_last_name}
                  onChange={(e) => setFormData({...formData, student_last_name: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">{t('parent_admissions.target_class', 'Target Class')}</Label>
                <Select 
                  value={formData.target_class_id} 
                  onValueChange={(val) => setFormData({...formData, target_class_id: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t('parent_admissions.select_class', 'Select class')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classesData?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-indigo-50/50 p-4 border-t border-indigo-100">
            <Button variant="ghost" onClick={() => setIsBuyingForm(false)}>{t('parent_admissions.cancel', 'Cancel')}</Button>
            <Button 
              onClick={handleBuyForm}
              disabled={buyFormMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {buyFormMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('parent_admissions.processing', 'Processing...')}
                </>
              ) : t('parent_admissions.confirm_pay', { price: formatCurrency(admissionPrice, admissionCurrency), defaultValue: 'Confirm & Pay {{price}}' })}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 animate-pulse font-medium">{t('parent_admissions.loading', 'Loading your applications...')}</p>
        </div>
      ) : !applications || applications.length === 0 ? (
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
              <Button 
                variant="outline" 
                onClick={() => setIsBuyingForm(true)}
                className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                {t('parent_admissions.get_started', 'Get Started Now')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 overflow-hidden">
              <div className="h-2 bg-indigo-600" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  {getStatusBadge(app.status)}
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-gray-400">
                    ID: #{app.id}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User size={20} className="text-gray-400" />
                  {app.student_first_name} {app.student_last_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <GraduationCap size={14} />
                  {t('parent_admissions.target_class', 'Target Class')}: {classesData?.find((c: any) => c.id === app.target_class_id)?.name || 'Loading...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('parent_admissions.purchased_on', 'Purchased On')}</p>
                    <p>{new Date(app.form_purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">{t('parent_admissions.payment_status', 'Payment Status')}</p>
                    <p className="font-medium text-green-700 capitalize">{app.payment_status}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 p-4 border-t group-hover:bg-indigo-50 transition-colors">
                <Button 
                  onClick={() => navigate(`/admissions/form/${app.id}`)}
                  variant="ghost" 
                  className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-transparent p-0 group-hover:pl-2 transition-all"
                >
                  {app.status === 'draft' ? t('parent_admissions.continue_form', 'Continue Filling Form') : t('parent_admissions.view_details', 'View Application Details')}
                  <ChevronRight size={18} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Info Section */}
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
