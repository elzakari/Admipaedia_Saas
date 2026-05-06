import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { useCreateSubject, useUpdateSubject } from '../../hooks/useSubjects';
import { toast } from 'sonner';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import MobileOptimizedTextarea from '../common/MobileOptimizedTextarea';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { BookOpen, Hash, FileText, Building, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorHandling';

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectData?: any;
  onSuccess?: () => void;
}

const departmentOptions = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'social_studies', label: 'Social Studies' },
  { value: 'arts', label: 'Arts' },
  { value: 'physical_education', label: 'Physical Education' }
];

export function SubjectFormModal({ isOpen, onClose, subjectData, onSuccess }: SubjectFormModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { height, isVisible } = useMobileKeyboard();
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    credit_hours: 1,
    is_active: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (subjectData) {
      setFormData({
        name: subjectData.name || '',
        code: subjectData.code || '',
        description: subjectData.description || '',
        department: subjectData.department || '',
        credit_hours: subjectData.credit_hours || 1,
        is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
      });
    } else {
      // Reset form for new subject
      setFormData({
        name: '',
        code: '',
        description: '',
        department: '',
        credit_hours: 1,
        is_active: true,
      });
    }
    setErrors({});
  }, [subjectData, isOpen]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Subject code is required';
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.code)) {
      newErrors.code = 'Subject code must be 2-10 uppercase letters/numbers';
    }
    
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    
    if (formData.credit_hours < 1 || formData.credit_hours > 10) {
      newErrors.credit_hours = 'Credit hours must be between 1 and 10';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    handleInputChange(name, value);
  };
  
  const handleStatusToggle = () => {
    setFormData(prev => ({
      ...prev,
      is_active: !prev.is_active
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (subjectData) {
        await updateSubject.mutateAsync({
          id: subjectData.id,
          data: formData
        });
        toast.success('Subject updated successfully');
      } else {
        await createSubject.mutateAsync(formData);
        toast.success('Subject created successfully');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving subject:', error);
      
      let errorMessage = 'Failed to save subject. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = getErrorMessage(error);
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`sm:max-w-[500px] max-h-[90vh] overflow-y-auto ${
            isMobile && isVisible ? 'h-screen' : ''
          }`}
          style={{
            height: isMobile && isVisible ? `${height}px` : 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              {subjectData ? 'Edit Subject' : 'Add New Subject'}
            </DialogTitle>
            <DialogDescription>
              {subjectData ? 'Update the details of this subject.' : 'Create a new academic subject for the curriculum.'}
            </DialogDescription>
          </DialogHeader>
          
          <ResponsiveForm onSubmit={handleSubmit}>
            <FormSection>
              <FormRow>
                <FormField label="Subject Name" htmlFor="name" error={errors.name} required>
                  <MobileOptimizedInput
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter subject name"
                    leftIcon={<BookOpen className="h-4 w-4" />}
                    error={errors.name}
                    autoComplete="off"
                  />
                </FormField>
                
                <FormField label="Subject Code" htmlFor="code" error={errors.code} required>
                  <MobileOptimizedInput
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="e.g., MATH101"
                    leftIcon={<Hash className="h-4 w-4" />}
                    error={errors.code}
                    autoComplete="off"
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField label="Department" htmlFor="department" error={errors.department} required>
                  <MobileOptimizedSelect
                    value={formData.department}
                    onChange={(value: string) => handleSelectChange('department', value)}
                    placeholder="Select department"
                    error={errors.department}
                    options={departmentOptions}
                  />
                </FormField>
                
                <FormField label="Credit Hours" htmlFor="credit_hours" error={errors.credit_hours} required>
                  <MobileOptimizedInput
                    id="credit_hours"
                    type="number"
                    value={formData.credit_hours.toString()}
                    onChange={(e) => handleInputChange('credit_hours', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    leftIcon={<Clock className="h-4 w-4" />}
                    error={errors.credit_hours}
                    min="1"
                    max="10"
                  />
                </FormField>
              </FormRow>
              
              <FormField label="Description" htmlFor="description" error={errors.description}>
                <MobileOptimizedTextarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter subject description (optional)"
                  rows={3}
                />
              </FormField>
              
              <FormField label="Status" htmlFor="is_active">
                <div className="flex items-center space-x-3">
                  {formData.is_active ? (
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                  <TouchFriendlyButton
                    type="button"
                    variant={formData.is_active ? "primary" : "outline"}
                    size="sm"
                    onClick={handleStatusToggle}
                    className={`min-w-[80px] ${
                      formData.is_active 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </TouchFriendlyButton>
                </div>
              </FormField>
            </FormSection>
            
            <DialogFooter className={`${isMobile ? 'flex-col gap-3 pt-6' : 'flex-row gap-2'}`}>
              <TouchFriendlyButton
                type="button"
                variant="outline"
                onClick={onClose}
                size={isMobile ? "lg" : "md"}
                className={isMobile ? 'w-full order-2' : ''}
              >
                Cancel
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit"
                loading={isSubmitting}
                size={isMobile ? "lg" : "md"}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {subjectData ? 'Update Subject' : 'Create Subject'}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}