import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import MobileOptimizedInput from '../common/MobileOptimizedInput';
import MobileOptimizedSelect from '../common/MobileOptimizedSelect';
import MobileOptimizedTextarea from '../common/MobileOptimizedTextarea';
import { useCreateTeacher, useUpdateTeacher, useUpdateTeacherStatus } from '../../hooks/useTeachers';
import { Teacher } from '../../types/teacher.types';
import { useOfflineData } from "../../hooks/useOfflineData";
import { toast } from 'sonner';
import { ResponsiveForm, FormSection, FormRow, FormField } from '../common/ResponsiveForm';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { FormValidationProvider } from '../common/FormValidationProvider';
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Hash, Building, Activity, UserCheck } from 'lucide-react';

interface EnhancedTeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  qualification?: string;
  specialization?: string;
  joinDate?: string;
  employeeId?: string;
  departmentId?: string;
  status: 'active' | 'inactive' | 'on_leave';
}

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
  { value: '6', label: 'Physical Education' },
  { value: '7', label: 'Computer Science' },
  { value: '8', label: 'Music' },
  { value: '9', label: 'Religious Studies' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' }
];

export function EnhancedTeacherFormModal({ isOpen, onClose, teacher }: EnhancedTeacherFormModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useMobileKeyboard();
  
  const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm<FormData>({
    defaultValues: teacher ? {
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      dateOfBirth: teacher.dateOfBirth || '',
      gender: teacher.gender || 'male',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      joinDate: teacher.joinDate || new Date().toISOString().split('T')[0],
      employeeId: teacher.employeeId || '',
      departmentId: teacher.departmentId || '',
      status: teacher.status || 'active'
    } : {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: 'male',
      qualification: '',
      specialization: '',
      joinDate: new Date().toISOString().split('T')[0],
      employeeId: '',
      departmentId: '',
      status: 'active'
    }
  });
  
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const { isOnline, saveForOfflineSync } = useOfflineData();
  const updateTeacherStatus = useUpdateTeacherStatus();
  
  const onSubmit = async (data: FormData) => {
    try {
      const apiData: any = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_number: data.phone,
        address: data.address,
        qualification: data.qualification,
        specialization: data.specialization,
        joining_date: data.joinDate,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        employee_id: data.employeeId,
        department_id: data.departmentId
      };
  
      if (isOnline) {
        if (teacher) {
          const updatedTeacher = await updateTeacher.mutateAsync({
            id: teacher.id,
            data: apiData
          });
          
          if (data.status !== teacher.status) {
            await updateTeacherStatus.mutateAsync({
              id: teacher.id,
              status: data.status
            });
          }
          
          toast.success('Teacher updated successfully!', {
            description: 'The teacher information has been updated.',
            duration: 4000,
          });
        } else {
          await createTeacher.mutateAsync(apiData);
          toast.success('Teacher created successfully!', {
            description: 'New teacher has been added to the system.',
            duration: 4000,
          });
        }
      } else {
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
          : 'Teacher will be created when you are back online', {
          description: 'Changes will sync automatically when connection is restored.',
          duration: 5000,
        });
      }
      
      onClose();
      reset();
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      
      let errorMessage = 'Failed to save teacher. Please try again.';
      
      if (error.response?.data?.errors) {
        const validationErrors = Object.entries(error.response.data.errors)
          .map(([field, messages]) => `${field}: ${messages}`)
          .join(', ');
        errorMessage = `Validation error: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: 'Please review the form and try again.',
        duration: 6000,
      });
    }
  };
  
  return (
    <FormValidationProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`
            sm:max-w-[700px] max-h-[95vh] overflow-y-auto
            bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950
            border-2 border-blue-200 dark:border-blue-800
            shadow-2xl shadow-blue-500/20 dark:shadow-blue-400/10
            backdrop-blur-sm
            ${isMobile && isKeyboardVisible ? 'h-screen' : ''}
          `}
          style={{
            height: isMobile && isKeyboardVisible ? `calc(100vh - ${keyboardHeight}px)` : 'auto'
          }}
        >
          <DialogHeader className="pb-6 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className={`
                  ${isMobile ? 'text-xl' : 'text-2xl'} 
                  font-bold text-slate-800 dark:text-slate-100
                  tracking-tight
                `}>
                  {teacher ? 'Edit Teacher Information' : 'Add New Teacher'}
                </DialogTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {teacher ? 'Update teacher details and academic information' : 'Enter complete teacher information for academic records'}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <ResponsiveForm onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <FormSection 
              title="Personal Information" 
              className="bg-white/70 dark:bg-slate-800/70 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <FormRow>
                <FormField 
                  label="First Name" 
                  htmlFor="firstName" 
                  error={errors.firstName?.message} 
                  required
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    leftIcon={<User className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter first name"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
                    {...register('firstName', { 
                      required: 'First name is required',
                      minLength: { value: 2, message: 'First name must be at least 2 characters' }
                    })}
                    error={errors.firstName?.message}
                  />
                </FormField>
                
                <FormField 
                  label="Last Name" 
                  htmlFor="lastName" 
                  error={errors.lastName?.message} 
                  required
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    leftIcon={<User className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter last name"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
                    {...register('lastName', { 
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                    })}
                    error={errors.lastName?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField 
                  label="Email Address" 
                  htmlFor="email" 
                  error={errors.email?.message} 
                  required
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    leftIcon={<Mail className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter email address"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
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
                
                <FormField 
                  label="Phone Number" 
                  htmlFor="phone" 
                  error={errors.phone?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    leftIcon={<Phone className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter phone number"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
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
                <FormField 
                  label="Date of Birth" 
                  htmlFor="dateOfBirth" 
                  error={errors.dateOfBirth?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="dateOfBirth"
                    type="date"
                    autoComplete="bday"
                    leftIcon={<Calendar className="h-5 w-5 text-blue-500" />}
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      transition-all duration-200
                    "
                    {...register('dateOfBirth')}
                    error={errors.dateOfBirth?.message}
                  />
                </FormField>
                
                <FormField 
                  label="Gender" 
                  htmlFor="gender" 
                  error={errors.gender?.message}
                  className="space-y-2"
                >
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={genderOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select gender"
                        className="
                          h-12 text-base font-medium
                          bg-white dark:bg-slate-900
                          border-2 border-slate-300 dark:border-slate-600
                          focus:border-blue-500 dark:focus:border-blue-400
                          text-slate-800 dark:text-slate-100
                        "
                        error={errors.gender?.message}
                      />
                    )}
                  />
                </FormField>
              </FormRow>
              
              <FormField 
                label="Address" 
                htmlFor="address" 
                error={errors.address?.message} 
                fullWidth
                className="space-y-2"
              >
                <MobileOptimizedTextarea
                  id="address"
                  placeholder="Enter complete address"
                  autoComplete="street-address"
                  className="
                    min-h-[100px] text-base font-medium
                    bg-white dark:bg-slate-900
                    border-2 border-slate-300 dark:border-slate-600
                    focus:border-blue-500 dark:focus:border-blue-400
                    focus:ring-2 focus:ring-blue-500/20
                    text-slate-800 dark:text-slate-100
                    placeholder:text-slate-500 dark:placeholder:text-slate-400
                    transition-all duration-200
                    resize-none
                  "
                  {...register('address')}
                  error={errors.address?.message}
                  maxLength={500}
                  showCharCount
                />
              </FormField>
            </FormSection>
            
            <FormSection 
              title="Academic & Professional Information" 
              className="bg-white/70 dark:bg-slate-800/70 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <FormRow>
                <FormField 
                  label="Qualification" 
                  htmlFor="qualification" 
                  error={errors.qualification?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="qualification"
                    type="text"
                    leftIcon={<GraduationCap className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter highest qualification"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
                    {...register('qualification')}
                    error={errors.qualification?.message}
                  />
                </FormField>
                
                <FormField 
                  label="Specialization" 
                  htmlFor="specialization" 
                  error={errors.specialization?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="specialization"
                    type="text"
                    leftIcon={<Briefcase className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter area of specialization"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                    "
                    {...register('specialization')}
                    error={errors.specialization?.message}
                  />
                </FormField>
              </FormRow>
              
              <FormRow>
                <FormField 
                  label="Join Date" 
                  htmlFor="joinDate" 
                  error={errors.joinDate?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="joinDate"
                    type="date"
                    leftIcon={<Calendar className="h-5 w-5 text-blue-500" />}
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      transition-all duration-200
                    "
                    {...register('joinDate')}
                    error={errors.joinDate?.message}
                  />
                </FormField>
                
                <FormField 
                  label="Employee ID" 
                  htmlFor="employeeId" 
                  error={errors.employeeId?.message}
                  className="space-y-2"
                >
                  <MobileOptimizedInput
                    id="employeeId"
                    type="text"
                    leftIcon={<Hash className="h-5 w-5 text-blue-500" />}
                    placeholder="Enter employee ID"
                    className="
                      h-12 text-base font-medium
                      bg-white dark:bg-slate-900
                      border-2 border-slate-300 dark:border-slate-600
                      focus:border-blue-500 dark:focus:border-blue-400
                      focus:ring-2 focus:ring-blue-500/20
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-500 dark:placeholder:text-slate-400
                      transition-all duration-200
                      uppercase
                    "
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
                <FormField 
                  label="Department" 
                  htmlFor="departmentId" 
                  error={errors.departmentId?.message}
                  className="space-y-2"
                >
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={departmentOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select department"
                        className="
                          h-12 text-base font-medium
                          bg-white dark:bg-slate-900
                          border-2 border-slate-300 dark:border-slate-600
                          focus:border-blue-500 dark:focus:border-blue-400
                          text-slate-800 dark:text-slate-100
                        "
                        error={errors.departmentId?.message}
                        searchable
                      />
                    )}
                  />
                </FormField>
                
                <FormField 
                  label="Employment Status" 
                  htmlFor="status" 
                  error={errors.status?.message}
                  className="space-y-2"
                >
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <MobileOptimizedSelect
                        options={statusOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select status"
                        className="
                          h-12 text-base font-medium
                          bg-white dark:bg-slate-900
                          border-2 border-slate-300 dark:border-slate-600
                          focus:border-blue-500 dark:focus:border-blue-400
                          text-slate-800 dark:text-slate-100
                        "
                        error={errors.status?.message}
                      />
                    )}
                  />
                </FormField>
              </FormRow>
            </FormSection>
            
            <DialogFooter className={`
              ${isMobile ? 'flex-col gap-4 pt-8' : 'flex-row gap-3 pt-6'}
              border-t border-blue-200 dark:border-blue-800
            `}>
              <TouchFriendlyButton
                type="button"
                variant="outline"
                onClick={onClose}
                size={isMobile ? "lg" : "md"}
                className={`
                  ${isMobile ? 'w-full order-2' : 'min-w-[120px]'}
                  h-12 text-base font-semibold
                  border-2 border-slate-300 dark:border-slate-600
                  text-slate-700 dark:text-slate-300
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  hover:border-slate-400 dark:hover:border-slate-500
                  transition-all duration-200
                `}
              >
                Cancel
              </TouchFriendlyButton>
              <TouchFriendlyButton
                type="submit"
                variant="primary"
                size={isMobile ? "lg" : "md"}
                loading={createTeacher.isPending || updateTeacher.isPending}
                className={`
                  ${isMobile ? 'w-full order-1' : 'min-w-[140px]'}
                  h-12 text-base font-bold
                  bg-gradient-to-r from-blue-600 to-blue-700
                  hover:from-blue-700 hover:to-blue-800
                  text-white shadow-lg shadow-blue-500/25
                  border-0 transition-all duration-200
                  focus:ring-4 focus:ring-blue-500/30
                `}
              >
                {teacher ? 'Update Teacher' : 'Add Teacher'}
              </TouchFriendlyButton>
            </DialogFooter>
          </ResponsiveForm>
        </DialogContent>
      </Dialog>
    </FormValidationProvider>
  );
}