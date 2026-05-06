import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

import { useAuth } from '@/contexts/AuthContext';

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
  const isAdmin = user?.role === 'admin';
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
      return response.data.price;
    }
  });

  const admissionPrice = priceData || 100.00;

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
      case 'draft': return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Draft</Badge>;
      case 'submitted': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Submitted</Badge>;
      case 'under_review': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Under Review</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? 'Admission Management' : 'Admission Applications'}</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Review and manage all student admission applications' : "Manage and track your children's admission process"}
          </p>
        </div>
        {!isAdmin && (
          <Button 
            onClick={() => setIsBuyingForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <FilePlus2 size={18} />
            Buy Admission Form (GHS {admissionPrice.toFixed(2)})
          </Button>
        )}
      </div>

      {isBuyingForm && (
        <Card className="border-indigo-200 bg-indigo-50/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <CreditCard className="text-indigo-600" />
              New Admission Form
            </CardTitle>
            <CardDescription>Enter the basic details to purchase an admission form (GHS {admissionPrice.toFixed(2)})</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuyForm} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">Student First Name</Label>
                <Input 
                  id="firstName"
                  placeholder="e.g. John"
                  value={formData.student_first_name}
                  onChange={(e) => setFormData({...formData, student_first_name: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Student Last Name</Label>
                <Input 
                  id="lastName"
                  placeholder="e.g. Doe"
                  value={formData.student_last_name}
                  onChange={(e) => setFormData({...formData, student_last_name: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Target Class</Label>
                <Select 
                  value={formData.target_class_id} 
                  onValueChange={(val) => setFormData({...formData, target_class_id: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select class" />
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
            <Button variant="ghost" onClick={() => setIsBuyingForm(false)}>Cancel</Button>
            <Button 
              onClick={handleBuyForm}
              disabled={buyFormMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {buyFormMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : `Confirm & Pay GHS ${admissionPrice.toFixed(2)}`}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 animate-pulse font-medium">Loading your applications...</p>
        </div>
      ) : !applications || applications.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="bg-white p-4 rounded-full shadow-sm">
              <FileText className="h-12 w-12 text-gray-300" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-semibold text-gray-900">No applications found</h3>
              <p className="text-gray-500">
                {isAdmin ? 'There are currently no admission applications in the system.' : "You haven't purchased any admission forms yet. Click the button above to start your first application."}
              </p>
            </div>
            {!isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => setIsBuyingForm(true)}
                className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Get Started Now
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
                  Target Class: {classesData?.find((c: any) => c.id === app.target_class_id)?.name || 'Loading...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Purchased On</p>
                    <p>{new Date(app.form_purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Payment Status</p>
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
                  {app.status === 'draft' ? 'Continue Filling Form' : 'View Application Details'}
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
          <h4 className="font-semibold text-blue-900">Admission Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
            <li>Forms are non-refundable after purchase.</li>
            <li>Ensure all uploaded documents are clear and legible (PDF or JPEG preferred).</li>
            <li>Applications are typically reviewed within 5-7 working days after submission.</li>
            <li>You will be notified via SMS and Email once a decision is made.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdmissionsPage;
