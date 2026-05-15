import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import MobileOptimizedTextarea from '../common/MobileOptimizedTextarea';
import { useCreateTeacher, useUpdateTeacher, useUpdateTeacherStatus } from '../../hooks/useTeachers';
import { Teacher } from '../../types/teacher.types';
import { TeacherCreate, TeacherUpdate } from '../../services/teacherService';
import { useOfflineData } from "../../hooks/useOfflineData";
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/constants';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Hash, Building, Activity } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorHandling';

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher;
}

interface FormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  bloodGroup?: string;
  qualification?: string;
  specialization?: string;
  joinDate?: string;
  employeeId?: string;
  departmentId?: string;
  bio?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'active' | 'inactive' | 'on_leave';
}

const validationRules = {
  firstName: [
    { type: 'required', message: 'First name is required' },
    { type: 'minLength', value: 2, message: 'First name must be at least 2 characters' }
  ],
  lastName: [
    { type: 'required', message: 'Last name is required' },
    { type: 'minLength', value: 2, message: 'Last name must be at least 2 characters' }
  ],
  email: [
    { type: 'required', message: 'Email is required' },
    { type: 'email', message: 'Please enter a valid email address' }
  ],
  phone: [
    { type: 'pattern', value: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number' }
  ],
  employeeId: [
    { type: 'pattern', value: /^[A-Z0-9]{3,10}$/, message: 'Employee ID must be 3-10 alphanumeric characters' }
  ]
};

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

const departmentOptions = [
  { value: '1', label: 'Mathematics' },
  { value: '2', label: 'Science' },
  { value: '3', label: 'Languages' },
  { value: '4', label: 'Social Studies' },
  { value: '5', label: 'Arts' },
  { value: '6', label: 'Physical Education' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' }
];

export function TeacherFormModal({ isOpen, onClose, teacher }: TeacherFormModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useMobileKeyboard();
  
  const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm<FormData>({
    defaultValues: teacher ? {
      firstName: teacher.firstName || '',
      middleName: (teacher as any).middleName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      dateOfBirth: teacher.dateOfBirth || '',
      gender: (teacher as any).gender || 'male',
      nationality: (teacher as any).nationality || '',
      bloodGroup: (teacher as any).bloodGroup || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      joinDate: teacher.joinDate || new Date().toISOString().split('T')[0],
      employeeId: teacher.employeeId || '',
      departmentId: teacher.departmentId || '',
      bio: (teacher as any).bio || '',
      emergencyContactName: (teacher as any).emergencyContactName || '',
      emergencyContactPhone: (teacher as any).emergencyContactPhone || '',
      status: teacher.status || 'active'
    } : {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: 'male',
      nationality: '',
      bloodGroup: '',
      qualification: '',
      specialization: '',
      joinDate: new Date().toISOString().split('T')[0],
      employeeId: '',
      departmentId: '',
      bio: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      status: 'active'
    }
  });
  
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const { isOnline, saveForOfflineSync } = useOfflineData();
  const updateTeacherStatus = useUpdateTeacherStatus();
  
  const onSubmit = async (data: FormData) => {
    try {
      // Transform form data to match API expectations
      const apiData: any = {
        first_name: data.firstName,
        middle_name: data.middleName,
        last_name: data.lastName,
        email: data.email,
        phone_number: data.phone,
        address: data.address,
        qualification: data.qualification,
        specialization: data.specialization,
        joining_date: data.joinDate,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        nationality: data.nationality,
        blood_group: data.bloodGroup,
        employee_id: data.employeeId,
        department_id: data.departmentId,
        bio: data.bio,
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_phone: data.emergencyContactPhone
      };
  
      if (isOnline) {
        if (teacher) {
          // First update the teacher's general information
          const updatedTeacher = await updateTeacher.mutateAsync({
            id: teacher.id,
            data: apiData
          });
          
          // If status has changed, update it separately
          if (data.status !== teacher.status) {
            await updateTeacherStatus.mutateAsync({
              id: teacher.id,
              status: data.status
            });
          }
          
          toast.success('Teacher updated successfully!');
        } else {
          // For new teachers, we don't need to worry about status
          // as it defaults to 'active'
          await createTeacher.mutateAsync(apiData);
          toast.success('Teacher created successfully!');
        }
      } else {
        // Handle offline mode
        const url = teacher 
          ? `/api/v1/teachers/${teacher.id}` 
          : '/api/v1/teachers';
        
        const method = teacher ? 'PUT' : 'POST';
        
        await saveForOfflineSync({
          url,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(apiData)
        });
        
        toast.info(teacher 
          ? 'Teacher will be updated when you are back online' 
          : 'Teacher will be created when you are back online');
      }
      
      onClose();
      reset();
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to save teacher. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data && error.response.data.errors) {
          // Format validation errors
          const validationErrors = Object.entries(error.response.data.errors)
            .map(([field, messages]) => `${field}: ${messages}`)
            .join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };
  
  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`sm:max-w-[600px] max-h-[90vh] overflow-y-auto ${
            isMobile && isKeyboardVisible ? 'h-screen' : ''
          }`}
          style={{
            height: isMobile && isKeyboardVisible ? `calc(100vh - ${keyboardHeight}px)` : 'auto'
          }}
        >
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
              {teacher ? 'Edit Teacher' : 'Add New Teacher'}
            </DialogTitle>
            <DialogDescription>
              {teacher ? 'Update teacher information and contact details.' : 'Fill in the required information to add a new teacher to the system.'}
            </DialogDescription>
          </DialogHeader>
          
          <ResponsiveForm onSubmit={handleSubmit(onSubmit)}>
            <FormSection title="Personal Information">
              <FormRow>
                <FormField label="First Name" htmlFor="firstName" error={errors.firstName?.message} required>
                  <MobileOptimizedInput
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    leftIcon={<User className="h-4 w-4" />}
                    placeholder="Enter first name"
                    {...register('firstName', { 
                      required: 'First name is required',
                      minLength: { value: 2, message: 'First name must be at least 2 characters' }
                    })}
                    error={errors.firstName?.message}
                  />
                </FormField>

                <FormField label="Middle Name" htmlFor="middleName" error={errors.middleName?.message}>
                  <MobileOptimizedInput
                    id="middleName"
                    type="text"
                    autoComplete="additional-name"
                    leftIcon={<User className="h-4 w-4" />}
                    placeholder="Enter middle name"
                    {...register('middleName')}
                    error={errors.middleName?.message}
                  />
                </FormField>
                
                <FormField label="Last Name" htmlFor="lastName" error={errors.lastName?.message} required>
                  <MobileOptimizedInput
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    leftIcon={<User className="h-4 w-4" />}
                    placeholder="Enter last name"
                    {...register('lastName', { 
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                    })}
                    error={errors.lastName?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
                  <MobileOptimizedInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    leftIcon={<Mail className="h-4 w-4" />}
                    placeholder="Enter email address"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    error={errors.email?.message}
                  />
                </FormField>
                
                <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
                  <MobileOptimizedInput
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    leftIcon={<Phone className="h-4 w-4" />}
                    placeholder="Enter phone number"
                    {...register('phone', {
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    error={errors.phone?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField label="Date of Birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
                  <MobileOptimizedInput
                    id="dateOfBirth"
                    type="date"
                    autoComplete="bday"
                    leftIcon={<Calendar className="h-4 w-4" />}
                    {...register('dateOfBirth')}
                    error={errors.dateOfBirth?.message}
                  />
                </FormField>
                
                <FormField label="Gender" htmlFor="gender" error={errors.gender?.message}>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={genderOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select gender"
                        error={errors.gender?.message}
                      />
                    )}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Nationality" htmlFor="nationality" error={errors.nationality?.message}>
                  <MobileOptimizedInput
                    id="nationality"
                    type="text"
                    leftIcon={<MapPin className="h-4 w-4" />}
                    placeholder="Enter nationality"
                    {...register('nationality')}
                    error={errors.nationality?.message}
                  />
                </FormField>

                <FormField label="Blood Group" htmlFor="bloodGroup" error={errors.bloodGroup?.message}>
                  <Controller
                    name="bloodGroup"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={[
                          { value: 'A+', label: 'A+' },
                          { value: 'A-', label: 'A-' },
                          { value: 'B+', label: 'B+' },
                          { value: 'B-', label: 'B-' },
                          { value: 'AB+', label: 'AB+' },
                          { value: 'AB-', label: 'AB-' },
                          { value: 'O+', label: 'O+' },
                          { value: 'O-', label: 'O-' }
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select blood group"
                        error={errors.bloodGroup?.message}
                      />
                    )}
                  />
                </FormField>
              </FormRow>
              
              <FormField label="Address" htmlFor="address" error={errors.address?.message} fullWidth>
                <MobileOptimizedTextarea
                  id="address"
                  placeholder="Enter address"
                  autoComplete="street-address"
                  {...register('address')}
                  error={errors.address?.message}
                  maxLength={500}
                  showCharCount
                />
              </FormField>
            </FormSection>
            
            <FormSection title="Professional Information">
              <FormRow>
                <FormField label="Qualification" htmlFor="qualification" error={errors.qualification?.message}>
                  <MobileOptimizedInput
                    id="qualification"
                    type="text"
                    leftIcon={<GraduationCap className="h-4 w-4" />}
                    placeholder="Enter qualification"
                    {...register('qualification')}
                    error={errors.qualification?.message}
                  />
                </FormField>
                
                <FormField label="Specialization" htmlFor="specialization" error={errors.specialization?.message}>
                  <MobileOptimizedInput
                    id="specialization"
                    type="text"
                    leftIcon={<Briefcase className="h-4 w-4" />}
                    placeholder="Enter specialization"
                    {...register('specialization')}
                    error={errors.specialization?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField label="Join Date" htmlFor="joinDate" error={errors.joinDate?.message}>
                  <MobileOptimizedInput
                    id="joinDate"
                    type="date"
                    leftIcon={<Calendar className="h-4 w-4" />}
                    {...register('joinDate')}
                    error={errors.joinDate?.message}
                  />
                </FormField>
                
                <FormField label="Employee ID" htmlFor="employeeId" error={errors.employeeId?.message}>
                  <MobileOptimizedInput
                    id="employeeId"
                    type="text"
                    leftIcon={<Hash className="h-4 w-4" />}
                    placeholder="Enter employee ID"
                    {...register('employeeId', {
                      pattern: {
                        value: /^[A-Z0-9]{3,10}$/,
                        message: 'Employee ID must be 3-10 alphanumeric characters'
                      }
                    })}
                    error={errors.employeeId?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField label="Department" htmlFor="departmentId" error={errors.departmentId?.message}>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={departmentOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select department"
                        error={errors.departmentId?.message}
                        searchable
                      />
                    )}
                  />
                </FormField>
                
                <FormField label="Status" htmlFor="status" error={errors.status?.message}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={statusOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select status"
                        error={errors.status?.message}
                      />
                    )}
                  />
                </FormField>
              </FormRow>
            </FormSection>

            <FormSection title="Additional Information">
              <FormField label="Bio" htmlFor="bio" error={errors.bio?.message} fullWidth>
                <MobileOptimizedTextarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  {...register('bio')}
                  error={errors.bio?.message}
                  maxLength={1000}
                  showCharCount
                />
              </FormField>

              <FormRow>
                <FormField label="Emergency Contact Name" htmlFor="emergencyContactName" error={errors.emergencyContactName?.message}>
                  <MobileOptimizedInput
                    id="emergencyContactName"
                    type="text"
                    leftIcon={<User className="h-4 w-4" />}
                    placeholder="Enter contact name"
                    {...register('emergencyContactName')}
                    error={errors.emergencyContactName?.message}
                  />
                </FormField>

                <FormField label="Emergency Contact Phone" htmlFor="emergencyContactPhone" error={errors.emergencyContactPhone?.message}>
                  <MobileOptimizedInput
                    id="emergencyContactPhone"
                    type="tel"
                    leftIcon={<Phone className="h-4 w-4" />}
                    placeholder="Enter contact phone"
                    {...register('emergencyContactPhone', {
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    error={errors.emergencyContactPhone?.message}
                  />
                </FormField>
              </FormRow>
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
                variant="primary"
                size={isMobile ? "lg" : "md"}
                loading={createTeacher.isPending || updateTeacher.isPending}
                className={isMobile ? 'w-full order-1' : ''}
              >
                {teacher ? 'Update Teacher' : 'Create Teacher'}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}


