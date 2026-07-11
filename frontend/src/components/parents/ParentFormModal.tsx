import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import MobileOptimizedTextarea from '../common/MobileOptimizedTextarea';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Calendar, Users, X } from 'lucide-react';

interface Parent {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  workplace?: string;
  emergencyContact?: string;
  relationship?: 'father' | 'mother' | 'guardian' | 'other';
  status: 'active' | 'inactive';
}

interface ParentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent?: Parent;
  onSubmit: (parent: Parent) => void;
}

const ParentFormModal: React.FC<ParentFormModalProps> = ({
  isOpen,
  onClose,
  parent,
  onSubmit
}) => {
  const { t } = useTranslation();
  // Return null early if not open to prevent expensive rendering when hidden
  if (!isOpen) return null;

  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  const [isLoading, setIsLoading] = useState(false);
  const { isVisible: isKeyboardVisible, height: keyboardHeight } = useMobileKeyboard();
  
  const [formData, setFormData] = useState<Parent>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: undefined,
    occupation: '',
    workplace: '',
    emergencyContact: '',
    relationship: undefined,
    status: 'active'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Parent, string>>>({});

  // Initialize form data when parent prop changes
  useEffect(() => {
    if (parent) {
      setFormData(parent);
    } else {
      // Reset form for new parent
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: undefined,
        occupation: '',
        workplace: '',
        emergencyContact: '',
        relationship: undefined,
        status: 'active'
      });
    }
    setErrors({});
  }, [parent]);

  const handleInputChange = (field: keyof Parent, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputEvent = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    handleInputChange(name as keyof Parent, value);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Parent, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('admin_parents.form.validation.first_name_req', 'First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('admin_parents.form.validation.last_name_req', 'Last name is required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('admin_parents.form.validation.email_req', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('admin_parents.form.validation.email_invalid', 'Please enter a valid email address');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('admin_parents.form.validation.phone_req', 'Phone number is required');
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('admin_parents.form.validation.phone_invalid', 'Please enter a valid phone number');
    }

    if (!formData.address.trim()) {
      newErrors.address = t('admin_parents.form.validation.address_req', 'Address is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('admin_parents.form.validation.fix_errors', 'Please fix the errors in the form'));
      return;
    }

    setIsLoading(true);
    
    try {
      await onSubmit(formData);
      toast.success(parent ? t('admin_parents.toast.update_success', 'Parent updated successfully') : t('admin_parents.toast.create_success', 'Parent created successfully'));
      onClose();
    } catch (error) {
      console.error('Error submitting parent form:', error);
      toast.error(t('admin_parents.form.validation.save_failed', 'Failed to save parent information'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className={`
            max-w-4xl overflow-y-auto
            ${isMobile ? 'mx-2 my-4 max-w-[calc(100vw-1rem)]' : ''}
            ${isTablet ? 'max-w-2xl' : ''}
            ${isKeyboardVisible ? 'max-h-[60vh]' : 'max-h-[90vh]'}
          `}
          style={{
            height: isMobile && isKeyboardVisible ? `${keyboardHeight * 0.6}px` : 'auto'
          }}
        >
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                {parent ? t('admin_parents.form.edit_title', 'Edit Parent') : t('admin_parents.form.add_title', 'Add New Parent')}
              </DialogTitle>
              {isMobile && (
                <TouchFriendlyButton
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isLoading}
                  icon={<X className="h-4 w-4" />}
                  className="h-8 w-8 p-0"
                >
                  {null}
                </TouchFriendlyButton>
              )}
            </div>
          </DialogHeader>

          <ResponsiveForm onSubmit={handleSubmit} className="py-4">
            {/* Basic Information */}
            <FormSection 
              title={t('admin_parents.form.basic_info_title', 'Basic Information')} 
              description={t('admin_parents.form.basic_info_desc', "Enter the parent's personal details")}
            >
              <FormRow>
                <FormField 
                  label={t('admin_parents.form.first_name', 'First Name')} 
                  htmlFor="firstName" 
                  required 
                  error={errors.firstName}
                >
                  <MobileOptimizedInput
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.first_name_placeholder', 'Enter first name')}
                    disabled={isLoading}
                    autoComplete="given-name"
                    leftIcon={<User className="h-4 w-4" />}
                  />
                </FormField>

                <FormField 
                  label={t('admin_parents.form.last_name', 'Last Name')} 
                  htmlFor="lastName" 
                  required 
                  error={errors.lastName}
                >
                  <MobileOptimizedInput
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.last_name_placeholder', 'Enter last name')}
                    disabled={isLoading}
                    autoComplete="family-name"
                    leftIcon={<User className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField 
                  label={t('admin_parents.form.gender', 'Gender')} 
                  htmlFor="gender"
                >
                  <MobileOptimizedSelect
                    value={formData.gender || ''}
                    onChange={(value: string) => handleInputChange('gender', value)}
                    placeholder={t('admin_parents.form.gender_placeholder', 'Select gender')}
                    disabled={isLoading}
                    options={[
                      { value: 'male', label: t('admin_parents.form.gender_male', 'Male') },
                      { value: 'female', label: t('admin_parents.form.gender_female', 'Female') },
                      { value: 'other', label: t('admin_parents.form.gender_other', 'Other') }
                    ]}
                  />
                </FormField>

                <FormField 
                  label={t('admin_parents.form.dob', 'Date of Birth')} 
                  htmlFor="dateOfBirth"
                >
                  <MobileOptimizedInput
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={handleInputEvent}
                    disabled={isLoading}
                    leftIcon={<Calendar className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>

              <FormField 
                label={t('admin_parents.form.relationship', 'Relationship to Student')} 
                htmlFor="relationship"
              >
                <MobileOptimizedSelect
                  value={formData.relationship || ''}
                  onChange={(value: string) => handleInputChange('relationship', value)}
                  placeholder={t('admin_parents.form.relationship_placeholder', 'Select relationship')}
                  disabled={isLoading}
                  options={[
                    { value: 'father', label: t('admin_parents.form.rel_father', 'Father') },
                    { value: 'mother', label: t('admin_parents.form.rel_mother', 'Mother') },
                    { value: 'guardian', label: t('admin_parents.form.rel_guardian', 'Guardian') },
                    { value: 'other', label: t('admin_parents.form.rel_other', 'Other') }
                  ]}
                />
              </FormField>
            </FormSection>

            {/* Contact Information */}
            <FormSection 
              title={t('admin_parents.form.contact_info_title', 'Contact Information')} 
              description={t('admin_parents.form.contact_info_desc', 'Enter contact details and address')}
            >
              <FormRow>
                <FormField 
                  label={t('admin_parents.form.email_placeholder', 'Email Address')} 
                  htmlFor="email" 
                  required 
                  error={errors.email}
                >
                  <MobileOptimizedInput
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.email_placeholder', 'Enter email address')}
                    disabled={isLoading}
                    autoComplete="email"
                    leftIcon={<Mail className="h-4 w-4" />}
                  />
                </FormField>

                <FormField 
                  label={t('admin_parents.form.phone_placeholder', 'Phone Number')} 
                  htmlFor="phone" 
                  required 
                  error={errors.phone}
                >
                  <MobileOptimizedInput
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.phone_placeholder', 'Enter phone number')}
                    disabled={isLoading}
                    autoComplete="tel"
                    leftIcon={<Phone className="h-4 w-4" />}
                  />
                </FormField>
              </FormRow>

              <FormField 
                label={t('admin_parents.form.emergency_contact', 'Emergency Contact')} 
                htmlFor="emergencyContact"
              >
                <MobileOptimizedInput
                  name="emergencyContact"
                  type="tel"
                  value={formData.emergencyContact || ''}
                  onChange={handleInputEvent}
                  placeholder={t('admin_parents.form.emergency_placeholder', 'Enter emergency contact number')}
                  disabled={isLoading}
                  autoComplete="tel"
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </FormField>

              <FormField 
                label={t('admin_parents.form.address', 'Address')} 
                htmlFor="address" 
                required 
                error={errors.address}
                fullWidth
              >
                <MobileOptimizedTextarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputEvent}
                  placeholder={t('admin_parents.form.address_placeholder', 'Enter full address')}
                  disabled={isLoading}
                  autoComplete="street-address"
                  maxLength={500}
                  showCharCount
                />
              </FormField>
            </FormSection>

            {/* Professional Information */}
            <FormSection 
              title={t('admin_parents.form.professional_info_title', 'Professional Information')} 
              description={t('admin_parents.form.professional_info_desc', 'Enter occupation and workplace details')}
            >
              <FormRow>
                <FormField 
                  label={t('admin_parents.form.occupation', 'Occupation')} 
                  htmlFor="occupation"
                >
                  <MobileOptimizedInput
                    name="occupation"
                    value={formData.occupation || ''}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.occupation_placeholder', 'Enter occupation')}
                    disabled={isLoading}
                    autoComplete="organization-title"
                  />
                </FormField>

                <FormField 
                  label={t('admin_parents.form.workplace', 'Workplace')} 
                  htmlFor="workplace"
                >
                  <MobileOptimizedInput
                    name="workplace"
                    value={formData.workplace || ''}
                    onChange={handleInputEvent}
                    placeholder={t('admin_parents.form.workplace_placeholder', 'Enter workplace')}
                    disabled={isLoading}
                    autoComplete="organization"
                  />
                </FormField>
              </FormRow>

              <FormField 
                label={t('admin_parents.form.status', 'Status')} 
                htmlFor="status" 
                required
              >
                <MobileOptimizedSelect
                  value={formData.status}
                  onChange={(value: string) => handleInputChange('status', value as 'active' | 'inactive')}
                  placeholder={t('admin_parents.form.status_placeholder', 'Select status')}
                  disabled={isLoading}
                  options={[
                    { value: 'active', label: t('admin_parents.form.status_active', 'Active') },
                    { value: 'inactive', label: t('admin_parents.form.status_inactive', 'Inactive') }
                  ]}
                />
              </FormField>
            </FormSection>
          </ResponsiveForm>

          <DialogFooter className="sticky bottom-0 bg-background border-t pt-4 mt-4">
            <div className={`flex gap-3 ${isMobile ? 'flex-col-reverse' : 'flex-row justify-end'}`}>
              <TouchFriendlyButton
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                size={isMobile ? "lg" : "md"}
                fullWidth={isMobile}
              >
                {t('common.cancel', 'Cancel')}
              </TouchFriendlyButton>
              
              <TouchFriendlyButton
                type="submit"
                onClick={handleSubmit}
                loading={isLoading}
                size={isMobile ? "lg" : "md"}
                fullWidth={isMobile}
                icon={<User className="h-4 w-4" />}
              >
                {parent ? t('admin_parents.form.edit_title', 'Update Parent') : t('admin_parents.form.add_title', 'Create Parent')}
              </TouchFriendlyButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
};

export default ParentFormModal;