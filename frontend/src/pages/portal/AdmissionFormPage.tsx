import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Home, 
  ShieldCheck, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  CheckCircle2, 
  Loader2,
  AlertTriangle
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog';

const AdmissionFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'parent';
  const [currentStep, setCurrentStep] = useState(1);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [formData, setFormData] = useState<any>({
    // Student Info
    dob: '',
    gender: '',
    blood_group: '',
    religion: '',
    nationality: '',
    // Parent/Guardian
    guardian_occupation: '',
    emergency_contact: '',
    // Address
    home_address: '',
    city: '',
    state: '',
    // Previous School
    prev_school_name: '',
    prev_school_class: '',
    leaving_reason: ''
  });

  // Fetch application details
  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const response = await api.get(`/admissions/application/${id}`);
      return response.data.data;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (application?.form_data) {
      setFormData(application.form_data);
    }
  }, [application]);

  const isSubmitted = application?.status !== 'draft' && application?.status !== 'returned';
  const isReadOnly = isAdmin || isSubmitted;

  // Mutation to save draft
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/admissions/application/${id}`, { form_data: data });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Draft saved');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['all-applications'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save draft');
    }
  });

  // Mutation to submit form
  const submitFormMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/saas/admissions/${id}/status`, { status: 'submitted', form_data: data });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['all-applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      navigate('/admissions');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const reviewMutation = useMutation({
    mutationFn: async (payload: { status: 'under_review' | 'approved' | 'rejected' | 'returned'; notes?: string | null }) => {
      const response = await api.patch(`/saas/admissions/${id}/status`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Application updated');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['all-applications'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update application');
    }
  });

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
              currentStep === step 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110' 
                : currentStep > step 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
            }`}>
              {currentStep > step ? <CheckCircle2 size={20} /> : step}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold mt-2 ${
              currentStep === step ? 'text-indigo-600' : 'text-gray-400'
            }`}>
              {step === 1 ? 'Personal' : step === 2 ? 'Guardian' : step === 3 ? 'Address' : 'History'}
            </span>
          </div>
          {step < 4 && <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={formData.blood_group} onValueChange={(v) => handleInputChange('blood_group', v)} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Religion</Label>
              <Input placeholder="e.g. Christian" value={formData.religion} onChange={(e) => handleInputChange('religion', e.target.value)} disabled={isReadOnly} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Guardian Occupation</Label>
              <Input placeholder="e.g. Software Engineer" value={formData.guardian_occupation} onChange={(e) => handleInputChange('guardian_occupation', e.target.value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Number</Label>
              <Input placeholder="e.g. +233 24 000 0000" value={formData.emergency_contact} onChange={(e) => handleInputChange('emergency_contact', e.target.value)} disabled={isReadOnly} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Home Address</Label>
              <Input placeholder="House No, Street, Landmark" value={formData.home_address} onChange={(e) => handleInputChange('home_address', e.target.value)} disabled={isReadOnly} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Accra" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>State/Region</Label>
                <Input placeholder="Greater Accra" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Previous School Name</Label>
              <Input placeholder="e.g. Lincoln International School" value={formData.prev_school_name} onChange={(e) => handleInputChange('prev_school_name', e.target.value)} disabled={isReadOnly} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Last Class Attended</Label>
                <Input placeholder="e.g. Basic 4" value={formData.prev_school_class} onChange={(e) => handleInputChange('prev_school_class', e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Reason for Leaving</Label>
                <Input placeholder="e.g. Relocation" value={formData.leaving_reason} onChange={(e) => handleInputChange('leaving_reason', e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="mt-4 text-gray-500">Loading form data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admissions')} className="mb-2">
        <ArrowLeft size={18} className="mr-2" />
        Back to Applications
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? 'Review Application:' : 'Admission Form:'} {application?.student_first_name} {application?.student_last_name}
          </h1>
          <p className="text-gray-500">Application ID: #{id}</p>
        </div>
        {isSubmitted && (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1.5 text-sm flex items-center gap-2 border-green-200">
            <CheckCircle2 size={16} />
            Form Submitted
          </Badge>
        )}
        {application?.status === 'returned' && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 px-4 py-1.5 text-sm flex items-center gap-2 border-amber-200">
            <AlertTriangle size={16} />
            Returned for changes
          </Badge>
        )}
      </div>

      {!isSubmitted && renderStepIndicator()}

      <Card className="border-gray-200 shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              {currentStep === 1 ? <User size={24} /> : currentStep === 2 ? <ShieldCheck size={24} /> : currentStep === 3 ? <Home size={24} /> : <FileText size={24} />}
            </div>
            <div>
              <CardTitle className="text-xl">
                {currentStep === 1 ? 'Student Personal Details' : currentStep === 2 ? 'Guardian Information' : currentStep === 3 ? 'Address & Residency' : 'Academic History'}
              </CardTitle>
              <CardDescription>
                Please provide accurate information for the admission review
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between bg-gray-50/50 p-6 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft size={18} className="mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-3">
            {!isSubmitted && isParent ? (
              <Button
                variant="outline"
                disabled={saveDraftMutation.isPending}
                onClick={() => saveDraftMutation.mutate(formData)}
              >
                {saveDraftMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
            ) : null}

            {currentStep < 4 ? (
              <Button 
                onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next Step
                <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              !isSubmitted && isParent && (
                <Button 
                  onClick={() => submitFormMutation.mutate(formData)}
                  disabled={submitFormMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  {submitFormMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Submit Final Application
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        </CardFooter>
      </Card>

      {isAdmin && (application?.status === 'submitted' || application?.status === 'under_review') ? (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Admin review actions</CardTitle>
            <CardDescription>Update the application status during review.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={reviewMutation.isPending}
              onClick={() => {
                const notes = window.prompt('Review notes (optional)');
                if (notes !== null) {
                  reviewMutation.mutate({ status: 'under_review', notes });
                }
              }}
            >
              Mark Under Review
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={reviewMutation.isPending}
              onClick={() => setShowApprovalModal(true)}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 hover:bg-amber-50 text-amber-700 hover:text-amber-800"
              disabled={reviewMutation.isPending}
              onClick={() => {
                const notes = window.prompt('Feedback notes for parent (optional):');
                if (notes !== null) {
                  reviewMutation.mutate({ status: 'returned', notes });
                }
              }}
            >
              Return to Parent
            </Button>
            <Button
              variant="destructive"
              disabled={reviewMutation.isPending}
              onClick={() => {
                const notes = window.prompt('Rejection reason (optional)');
                if (notes !== null) {
                  reviewMutation.mutate({ status: 'rejected', notes });
                }
              }}
            >
              Reject
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isSubmitted && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 flex gap-4 mt-8">
          <AlertTriangle className="text-yellow-500 shrink-0" size={24} />
          <div>
            <h4 className="font-semibold text-yellow-900">{isAdmin ? 'Reviewing Submission' : 'Application Under Review'}</h4>
            <p className="text-sm text-yellow-800 mt-1">
              {isAdmin 
                ? "This application has been submitted. Review the details below to make an admission decision."
                : "Your application has been submitted and is currently being processed by the admissions office. You can no longer edit the form details. We will notify you once a decision is made."
              }
            </p>
          </div>
        </div>
      )}

      {application?.status === 'returned' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex gap-4 mt-8">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div className="w-full">
            <h4 className="font-semibold text-amber-900">Application Returned for Corrections</h4>
            <p className="text-sm text-amber-800 mt-1">
              {isAdmin
                ? "This application has been returned to the parent for corrections. It is read-only for you until the parent re-submits."
                : "The admissions team has reviewed your application and requested some corrections. Please update the fields in the form above and submit again."
              }
            </p>
            {application?.form_data?._review?.notes && (
              <div className="mt-3 bg-white p-3 rounded-lg border border-amber-100">
                <span className="font-semibold text-xs text-amber-600 uppercase tracking-wider block">Feedback / Notes from Admin:</span>
                <p className="text-sm text-gray-800 mt-0.5 italic">"{application.form_data._review.notes}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[480px] font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="text-green-500" size={24} />
              Confirm Admission Approval
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              Review the credentials that will be generated for the student upon approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
              <p className="text-sm text-green-800 font-medium">
                Approving this form will initialize the student profile and generate their credentials:
              </p>
              <div className="bg-white rounded-lg p-3 border border-green-100 space-y-2 text-sm shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Generated Username:</span>
                  <span className="font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    {application?.expected_username}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Parent Email (Recipient):</span>
                  <span className="font-semibold text-gray-900">
                    {application?.parent_email}
                  </span>
                </div>
              </div>
              <p className="text-xs text-green-700 italic">
                * An automated account activation and password configuration link will be emailed directly to the parent address above.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval-notes" className="text-sm font-semibold text-gray-700">
                Approval Notes / Comments (Optional)
              </Label>
              <Input
                id="approval-notes"
                placeholder="e.g. Welcome to ADMIPAEDIA! We are excited to have you."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalModal(false);
                setApprovalNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
              disabled={reviewMutation.isPending}
              onClick={() => {
                reviewMutation.mutate({ 
                  status: 'approved', 
                  notes: approvalNotes || null 
                }, {
                  onSuccess: () => {
                    setShowApprovalModal(false);
                    setApprovalNotes('');
                  }
                });
              }}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Confirm & Approve'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdmissionFormPage;
