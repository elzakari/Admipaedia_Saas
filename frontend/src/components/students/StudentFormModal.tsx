import React, { useState, useEffect, FormEvent, useRef } from "react";
import { useCreateStudent, useUpdateStudent } from "@/hooks/useStudents";
import { useToast } from "@/components/ui/use-toast";
import type { Student } from "@/types/student.types";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { TouchFriendlyButton } from "../common/TouchFriendlyButton";
import MobileOptimizedInput from "../common/MobileOptimizedInput";
import MobileOptimizedSelect from "../common/MobileOptimizedSelect";
import MobileOptimizedTextarea from "../common/MobileOptimizedTextarea";
import { FormValidationProvider } from "../common/FormValidationProvider";
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Check, User, Phone, Mail, MapPin, Heart, GraduationCap, Users, Camera, Lock } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { FormProgressIndicator } from "./FormProgressIndicator";
import { FormQuickNav } from "./FormQuickNav";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_SECONDARY_BUTTON_CLASS } from "@/lib/adminUi";
import { getClassDisplayName } from "@/utils/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import studentService from "@/services/studentService";
import { resolveAvatarUrl, resolveStudentAvatar } from "@/utils/avatar";

// Format phone number function
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

// Validate phone number function
const validatePhone = (phone: string): boolean => {
  return phone.replace(/\D/g, '').length >= 10;
};

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone: string;
  class_id: string;
  parent_id: string;
  password?: string;
  
  // Personal Details
  surname: string;
  placeOfBirth: string;
  religiousDenomination: string;
  nationality: string;
  bloodGroup: string;
  
  // Contact Details
  telephone: string;
  whatsapp: string;
  postalAddress: string;
  digitalAddress: string;
  city: string;
  country: string;
  residentialAddress: string;
  localLandmark: string;
  
  // Health Details
  medicalConditions: string;
  specialCircumstance: string;
  allergies: string;
  medication: string;
  physicianName: string;
  physicianPhone: string;
  
  // Academic Details
  previousSchool: string;
  previousClass: string;
  previousTeam: string;
  previousYear: string;
  
  // Parent Details
  fatherName: string;
  fatherContact: string;
  fatherAddress: string;
  fatherEmail: string;
  fatherProfession: string;
  fatherWorkplace: string;
  
  motherName: string;
  motherContact: string;
  motherAddress: string;
  motherProfession: string;
  motherWorkplace: string;
  motherEmail: string;

  guardianName: string;
  guardianContact: string;
  profile_picture_locked: boolean;
}

type FormErrors = {
  [key: string]: string;
};

interface StudentCreate {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  admission_number: string;
  class_id?: number;
  parent_id?: number;
  place_of_birth?: string;
  religious_denomination?: string;
  nationality?: string;
  blood_group?: string;
  whatsapp?: string;
  postal_address?: string;
  digital_address?: string;
  city?: string;
  country?: string;
  residential_address?: string;
  local_landmark?: string;
  medical_conditions?: string;
  special_circumstance?: string;
  allergies?: string;
  medication?: string;
  physician_name?: string;
  physician_phone?: string;
  previous_school?: string;
  previous_class?: string;
  previous_team?: string;
  previous_year?: string;
  father_name?: string;
  father_contact?: string;
  father_address?: string;
  father_email?: string;
  father_profession?: string;
  father_workplace?: string;
  mother_name?: string;
  mother_contact?: string;
  mother_address?: string;
  mother_email?: string;
  mother_profession?: string;
  mother_workplace?: string;
  guardian_name?: string;
  guardian_contact?: string;
  profile_picture?: string | null;
  profile_picture_locked?: boolean;
  password: string;
  force_password_reset: boolean;
}

const StudentFormModalContent: React.FC<StudentFormModalProps> = (props) => {
  const { t } = useTranslation();
  const { student, isOpen, onClose, onSuccess } = props;
  const { toast } = useToast();
  const { mutateAsync: createStudentAsync } = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { height: keyboardHeight, isVisible: isKeyboardVisible } = useMobileKeyboard();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    admission_number: '',
    date_of_birth: '',
    gender: '',
    address: '',
    phone: '',
    class_id: '',
    parent_id: '',
    surname: '',
    placeOfBirth: '',
    religiousDenomination: '',
    nationality: '',
    bloodGroup: '',
    telephone: '',
    whatsapp: '',
    postalAddress: '',
    digitalAddress: '',
    city: '',
    country: '',
    residentialAddress: '',
    localLandmark: '',
    medicalConditions: '',
    specialCircumstance: '',
    allergies: '',
    medication: '',
    physicianName: '',
    physicianPhone: '',
    previousSchool: '',
    previousClass: '',
    previousTeam: '',
    previousYear: '',
    fatherName: '',
    fatherContact: '',
    fatherAddress: '',
    fatherEmail: '',
    fatherProfession: '',
    fatherWorkplace: '',
    motherName: '',
    motherContact: '',
    motherAddress: '',
    motherProfession: '',
    motherWorkplace: '',
    motherEmail: '',
    guardianName: '',
    guardianContact: '',
    profile_picture_locked: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [parentOptions, setParentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/classes', { params: { per_page: 200 } })
      .then((res) => {
        const classes = Array.isArray(res.data?.classes) ? res.data.classes : [];
        setClassOptions(classes.map((c: any) => ({ value: String(c.id), label: getClassDisplayName(c) || `Class ${c.id}` })));
      })
      .catch(() => setClassOptions([]));

    api.get('/parents', { params: { per_page: 200 } })
      .then((res) => {
        const parents = Array.isArray(res.data?.data?.parents)
          ? res.data.data.parents
          : Array.isArray(res.data?.parents)
            ? res.data.parents
            : [];
        setParentOptions(parents.map((p: any) => ({
          value: String(p.id),
          label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Parent ${p.id}`
        })));
      })
      .catch(() => setParentOptions([]));
  }, [isOpen]);
  
  // Validation rules
  const validationRules = {
    name: [
      { rule: (value: string) => value.trim().length >= 2, message: t('students_page.form.errors.name_length', 'Name must be at least 2 characters') },
      { rule: (value: string) => value.trim().length > 0, message: t('students_page.form.errors.name_required', 'Full name is required') }
    ],
    email: [
      { rule: (value: string) => value.trim().length > 0, message: t('students_page.form.errors.email_required', 'Email is required') },
      { rule: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: t('students_page.form.errors.invalid_email', 'Invalid email format') }
    ],
    date_of_birth: [
      { rule: (value: string) => value.trim().length > 0, message: t('students_page.form.errors.dob_required', 'Date of birth is required') },
      { rule: (value: string) => {
        const age = calculateAge(value);
        const { minAge, maxAge } = getExpectedAgeRangeForClass(formData.class_id);
        return age >= minAge && age <= maxAge;
      }, message: t('students_page.form.errors.age_inappropriate', 'Age should be appropriate for the selected class') }
    ],
    gender: [
      { rule: (value: string) => value.trim().length > 0, message: t('students_page.form.errors.gender_required', 'Gender is required') }
    ],
    class_id: [
      { rule: (value: string) => value.trim().length > 0, message: t('students_page.form.errors.class_required', 'Class is required') }
    ],
    parent_id: [
      { rule: (_value: string) => true, message: "" }
    ],
    phone: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_phone', 'Invalid phone number format') }
    ],
    telephone: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_telephone', 'Invalid telephone format') }
    ],
    whatsapp: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_whatsapp', 'Invalid WhatsApp format') }
    ],
    fatherEmail: [
      { rule: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: t('students_page.form.errors.invalid_father_email', "Invalid father's email format") }
    ],
    motherEmail: [
      { rule: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: t('students_page.form.errors.invalid_mother_email', "Invalid mother's email format") }
    ],
    fatherContact: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_father_contact', "Invalid father's contact format") }
    ],
    motherContact: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_mother_contact', "Invalid mother's contact format") }
    ],
    physicianPhone: [
      { rule: (value: string) => !value || validatePhone(value), message: t('students_page.form.errors.invalid_physician_phone', 'Invalid physician phone format') }
    ]
  };
  
  // Map backend field names to frontend field names for error handling
  const backendToFrontendFieldMap: Record<string, string> = {
    first_name: 'name',
    last_name: 'name',
    date_of_birth: 'date_of_birth',
    gender: 'gender',
    email: 'email',
    phone: 'phone',
    class_id: 'class_id',
    parent_id: 'parent_id',
    place_of_birth: 'placeOfBirth',
    religious_denomination: 'religiousDenomination',
    address: 'address',
    father_name: 'fatherName',
    mother_name: 'motherName',
    father_contact: 'fatherContact',
    mother_contact: 'motherContact',
    father_email: 'fatherEmail',
    mother_email: 'motherEmail'
  };

  // Initialize form data with student data
  useEffect(() => {
    if (student) {
      setFormData({
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        first_name: student.first_name || '',
        middle_name: (student as any).middle_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || (student as any).telephone || '',
        admission_number: student.admission_number || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        address: student.address || '',
        class_id: student.class_id ? student.class_id.toString() : '',
        parent_id: '',
        
        // Personal Information
        surname: (student as any).surname || '',
        placeOfBirth: (student as any).place_of_birth || '',
        religiousDenomination: (student as any).religious_denomination || '',
        nationality: (student as any).nationality || '',
        bloodGroup: (student as any).blood_group || '',
        telephone: (student as any).telephone || student.phone || '',
        whatsapp: (student as any).whatsapp || '',
        
        // Contact Information
        postalAddress: (student as any).postal_address || '',
        digitalAddress: (student as any).digital_address || '',
        city: (student as any).city || '',
        country: (student as any).country || '',
        residentialAddress: (student as any).residential_address || '',
        localLandmark: (student as any).local_landmark || '',
        
        // Health Information
        medicalConditions: (student as any).medical_conditions || '',
        specialCircumstance: (student as any).special_circumstance || '',
        allergies: (student as any).allergies || '',
        medication: (student as any).medication || '',
        physicianName: (student as any).physician_name || '',
        physicianPhone: (student as any).physician_phone || '',
        
        // Academic Information
        previousSchool: (student as any).previous_school || '',
        previousClass: (student as any).previous_class || '',
        previousTeam: (student as any).previous_team || '',
        previousYear: (student as any).previous_year || '',
        
        // Parent Information
        fatherName: (student as any).father_name || '',
        fatherContact: (student as any).father_contact || '',
        fatherAddress: (student as any).father_address || '',
        fatherEmail: (student as any).father_email || '',
        fatherProfession: (student as any).father_profession || '',
        fatherWorkplace: (student as any).father_workplace || '',
        
        motherName: (student as any).mother_name || '',
        motherContact: (student as any).mother_contact || '',
        motherAddress: (student as any).mother_address || '',
        motherEmail: (student as any).mother_email || '',
        motherProfession: (student as any).mother_profession || '',
        motherWorkplace: (student as any).mother_workplace || '',

        guardianName: (student as any).guardian_name || '',
        guardianContact: (student as any).guardian_contact || '',
        profile_picture_locked: Boolean((student as any).profile_picture_locked)
      });
      setPhotoPreview(resolveStudentAvatar(student) || '');
      setPhotoFile(null);
      setPhotoRemoved(false);
    } else {
      // Reset form when no student is provided (for creating new student)
      setFormData({
        name: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        admission_number: '',
        date_of_birth: '',
        gender: '',
        address: '',
        phone: '',
        class_id: '',
        parent_id: '',
        surname: '',
        placeOfBirth: '',
        religiousDenomination: '',
        nationality: '',
        bloodGroup: '',
        telephone: '',
        whatsapp: '',
        postalAddress: '',
        digitalAddress: '',
        city: '',
        country: '',
        residentialAddress: '',
        localLandmark: '',
        medicalConditions: '',
        specialCircumstance: '',
        allergies: '',
        medication: '',
        physicianName: '',
        physicianPhone: '',
        previousSchool: '',
        previousClass: '',
        previousTeam: '',
        previousYear: '',
        fatherName: '',
        fatherContact: '',
        fatherAddress: '',
        fatherEmail: '',
        fatherProfession: '',
        fatherWorkplace: '',
        motherName: '',
        motherContact: '',
        motherAddress: '',
        motherEmail: '',
        motherProfession: '',
        motherWorkplace: '',
        guardianName: '',
        guardianContact: '',
        profile_picture_locked: false
      });
      setPhotoPreview('');
      setPhotoFile(null);
      setPhotoRemoved(false);
    }
  }, [student]);

  // Mark a step as completed
  const markStepAsCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  // Form steps configuration
  const steps = [
    { id: 0, title: t('students_page.form.steps.personal', 'Personal'), description: t('students_page.form.steps.personal_desc', 'Student personal information'), icon: User },
    { id: 1, title: t('students_page.form.steps.contact', 'Contact'), description: t('students_page.form.steps.contact_desc', 'Address and contact details'), icon: Phone },
    { id: 2, title: t('students_page.form.steps.medical', 'Medical Info'), description: t('students_page.form.steps.medical_desc', 'Medical history and needs'), icon: Heart },
    { id: 3, title: t('students_page.form.steps.enrollment', 'Enrollment'), description: t('students_page.form.steps.enrollment_desc', 'Academic background and class placement'), icon: GraduationCap },
    { id: 4, title: t('students_page.form.steps.parent', 'Parent/Guardian'), description: t('students_page.form.steps.parent_desc', 'Parent or guardian details'), icon: Users },
    { id: 5, title: t('students_page.form.steps.review', 'Review'), description: t('students_page.form.steps.review_desc', 'Review and submit'), icon: Check }
  ];

  // Helper functions
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getExpectedAgeRangeForClass = (classId: string): { minAge: number; maxAge: number } => {
    const classMap: Record<string, { minAge: number; maxAge: number }> = {
      '1': { minAge: 5, maxAge: 7 },
      '2': { minAge: 6, maxAge: 8 },
      '3': { minAge: 7, maxAge: 9 },
      '4': { minAge: 8, maxAge: 10 },
      '5': { minAge: 9, maxAge: 11 },
      '6': { minAge: 10, maxAge: 12 }
    };
    return classMap[classId] || { minAge: 5, maxAge: 18 };
  };

  // Handle input changes
  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-populate first_name and last_name from name
      if (name === 'name') {
        const nameParts = value.trim().split(' ');
        newData.first_name = nameParts[0] || '';
        newData.last_name = nameParts.slice(1).join(' ') || '';
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Navigate to a specific step
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  // Handle input event objects
  const handleInputEvent = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle phone number formatting
    if (name === 'phone' || name === 'whatsapp' || name === 'telephone' || name === 'fatherContact' || name === 'motherContact' || name === 'physicianPhone') {
      const formattedValue = formatPhoneNumber(value);
      handleInputChange(name, formattedValue);
    } else {
      handleInputChange(name, value);
    }
  };

  // Enhanced comprehensive validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Step 1: Basic Information Validation
    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters long';
    } else if (formData.first_name.trim().length > 50) {
      newErrors.first_name = 'First name must not exceed 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.first_name.trim())) {
      newErrors.first_name = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters long';
    } else if (formData.last_name.trim().length > 50) {
      newErrors.last_name = 'Last name must not exceed 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.last_name.trim())) {
      newErrors.last_name = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Enhanced date of birth validation
    if (!formData.date_of_birth?.trim()) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const maxAge = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
      
      if (isNaN(birthDate.getTime())) {
        newErrors.date_of_birth = 'Please enter a valid date';
      } else if (birthDate > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      } else if (birthDate < minAge) {
        newErrors.date_of_birth = 'Student age cannot exceed 25 years';
      } else if (birthDate > maxAge) {
        newErrors.date_of_birth = 'Student must be at least 3 years old';
      }
    }

    // Enhanced gender validation
    if (!formData.gender?.trim()) {
      newErrors.gender = 'Gender is required';
    } else if (!['male', 'female', 'other'].includes(formData.gender.toLowerCase())) {
      newErrors.gender = 'Please select a valid gender';
    }

    // Class selection is validated in the Academic Information step

    // Enhanced email validation
    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      } else if (formData.email.trim().length > 100) {
        newErrors.email = 'Email address must not exceed 100 characters';
      }
    }

    // Enhanced phone number validation
    if (formData.phone?.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
      }
    }

    // Enhanced admission number validation
    if (formData.admission_number?.trim()) {
      if (formData.admission_number.trim().length < 3) {
        newErrors.admission_number = 'Admission number must be at least 3 characters long';
      } else if (formData.admission_number.trim().length > 20) {
        newErrors.admission_number = 'Admission number must not exceed 20 characters';
      } else if (!/^[A-Za-z0-9\-\/]+$/.test(formData.admission_number.trim())) {
        newErrors.admission_number = 'Admission number can only contain letters, numbers, hyphens, and forward slashes';
      }
    }

    // Parent contact validation
    if (formData.fatherContact?.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(formData.fatherContact.trim())) {
        newErrors.fatherContact = 'Please enter a valid father contact number';
      }
    }

    if (formData.motherContact?.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(formData.motherContact.trim())) {
        newErrors.motherContact = 'Please enter a valid mother contact number';
      }
    }

    // Parent email validation
    if (formData.fatherEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.fatherEmail.trim())) {
        newErrors.fatherEmail = 'Please enter a valid father email address';
      }
    }

    if (formData.motherEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.motherEmail.trim())) {
        newErrors.motherEmail = 'Please enter a valid mother email address';
      }
    }

    // Address validation
    if (formData.address?.trim() && formData.address.trim().length > 200) {
      newErrors.address = 'Address must not exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced step validation for multi-step form
  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Basic Information
        if (!formData.first_name?.trim()) stepErrors.first_name = 'First name is required';
        if (!formData.last_name?.trim()) stepErrors.last_name = 'Last name is required';
        if (!formData.date_of_birth?.trim()) stepErrors.date_of_birth = 'Date of birth is required';
        if (!formData.gender?.trim()) stepErrors.gender = 'Gender is required';
        
        if (formData.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.email.trim())) {
            stepErrors.email = 'Please enter a valid email address';
          }
        }
        break;

      case 1: // Contact Information
        if (formData.phone?.trim()) {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          if (!phoneRegex.test(formData.phone.trim())) {
            stepErrors.phone = 'Please enter a valid phone number';
          }
        }
        break;

      case 3: // Academic Information
        if (!formData.class_id?.trim()) stepErrors.class_id = 'Class selection is required';
        break;

      case 4: // Parent Information
        if (formData.fatherContact?.trim()) {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          if (!phoneRegex.test(formData.fatherContact.trim())) {
            stepErrors.fatherContact = 'Please enter a valid father contact number';
          }
        }
        if (formData.motherContact?.trim()) {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          if (!phoneRegex.test(formData.motherContact.trim())) {
            stepErrors.motherContact = 'Please enter a valid mother contact number';
          }
        }
        break;
    }

    setErrors(prev => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  // Transform form data to match API expected format
  const transformFormData = (data: FormData): StudentCreate => {
    const password = data.password || generatePassword();
    const classId = data.class_id ? parseInt(data.class_id, 10) : undefined;
    const parentId = data.parent_id ? parseInt(data.parent_id, 10) : undefined;
    
    return {
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      admission_number: data.admission_number || '',
      ...(classId !== undefined && { class_id: classId }),
      ...(parentId !== undefined && { parent_id: parentId }),
      place_of_birth: data.placeOfBirth || '',
      religious_denomination: data.religiousDenomination || '',
      nationality: data.nationality || '',
      blood_group: data.bloodGroup || '',
      whatsapp: data.whatsapp || '',
      postal_address: data.postalAddress || '',
      digital_address: data.digitalAddress || '',
      city: data.city || '',
      country: data.country || '',
      residential_address: data.residentialAddress || '',
      local_landmark: data.localLandmark || '',
      medical_conditions: data.medicalConditions || '',
      special_circumstance: data.specialCircumstance || '',
      allergies: data.allergies || '',
      medication: data.medication || '',
      physician_name: data.physicianName || '',
      physician_phone: data.physicianPhone || '',
      previous_school: data.previousSchool || '',
      previous_class: data.previousClass || '',
      previous_team: data.previousTeam || '',
      previous_year: data.previousYear || '',
      father_name: data.fatherName || '',
      father_contact: data.fatherContact || '',
      father_address: data.fatherAddress || '',
      father_email: data.fatherEmail || '',
      father_profession: data.fatherProfession || '',
      father_workplace: data.fatherWorkplace || '',
      mother_name: data.motherName || '',
      mother_contact: data.motherContact || '',
      mother_address: data.motherAddress || '',
      mother_profession: data.motherProfession || '',
      mother_workplace: data.motherWorkplace || '',
      mother_email: data.motherEmail || '',
      guardian_name: data.guardianName || '',
      guardian_contact: data.guardianContact || '',
      password: password,
      force_password_reset: true
    };
  };

  // Generate a random password for new students
  const generatePassword = (): string => {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Navigation functions
  const nextStep = () => {
    if (validateCurrentStep()) {
      markStepAsCompleted(currentStep);
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveProgress = () => {
    toast({
      title: t('students_page.form.toast.progress_saved_title', 'Progress Saved'),
      description: t('students_page.form.toast.progress_saved_desc', 'Your form progress has been saved locally.'),
      id: ""
    });
  };

  // Enhanced form submission with comprehensive error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: t('students_page.form.toast.validation_error_title', 'Validation Error'),
        description: t('students_page.form.toast.validation_error_desc', 'Please fix all errors in the form before submitting.'),
        id: ""
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Enhanced data transformation with proper type conversion
      const transformedData = {
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        admission_number: formData.admission_number?.trim() || null,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address?.trim() || null,
        class_id: parseInt(formData.class_id),
        
        // Additional fields with proper handling
        surname: formData.surname?.trim() || null,
        place_of_birth: formData.placeOfBirth?.trim() || null,
        religious_denomination: formData.religiousDenomination?.trim() || null,
        nationality: formData.nationality?.trim() || null,
        blood_group: formData.bloodGroup?.trim() || null,
        telephone: formData.telephone?.trim() || null,
        whatsapp: formData.whatsapp?.trim() || null,
        
        // Contact information
        postal_address: formData.postalAddress?.trim() || null,
        digital_address: formData.digitalAddress?.trim() || null,
        city: formData.city?.trim() || null,
        country: formData.country?.trim() || null,
        residential_address: formData.residentialAddress?.trim() || null,
        local_landmark: formData.localLandmark?.trim() || null,
        
        // Health information
        medical_conditions: formData.medicalConditions?.trim() || null,
        special_circumstance: formData.specialCircumstance?.trim() || null,
        allergies: formData.allergies?.trim() || null,
        medication: formData.medication?.trim() || null,
        physician_name: formData.physicianName?.trim() || null,
        physician_phone: formData.physicianPhone?.trim() || null,
        
        // Academic information
        previous_school: formData.previousSchool?.trim() || null,
        previous_class: formData.previousClass?.trim() || null,
        previous_team: formData.previousTeam?.trim() || null,
        previous_year: formData.previousYear?.trim() || null,
        
        // Parent information
        father_name: formData.fatherName?.trim() || null,
        father_contact: formData.fatherContact?.trim() || null,
        father_address: formData.fatherAddress?.trim() || null,
        father_email: formData.fatherEmail?.trim() || null,
        father_profession: formData.fatherProfession?.trim() || null,
        father_workplace: formData.fatherWorkplace?.trim() || null,
        
        mother_name: formData.motherName?.trim() || null,
        mother_contact: formData.motherContact?.trim() || null,
        mother_address: formData.motherAddress?.trim() || null,
        mother_email: formData.motherEmail?.trim() || null,
        mother_profession: formData.motherProfession?.trim() || null,
        mother_workplace: formData.motherWorkplace?.trim() || null,

        guardian_name: formData.guardianName?.trim() || null,
        guardian_contact: formData.guardianContact?.trim() || null,
        profile_picture_locked: Boolean(formData.profile_picture_locked),
        ...(student && photoRemoved && !photoFile ? { profile_picture: null } : {})
      };

      let savedStudentId: number | undefined;

      if (student) {
        // Update existing student
        const updateResponse = await updateStudentMutation.mutateAsync({
          id: student.id,
          data: transformedData
        });
        savedStudentId = Number(updateResponse?.data?.id || student.id);

        if (photoFile && savedStudentId) {
          const uploadResponse = await studentService.uploadProfilePicture(savedStudentId, photoFile);
          setPhotoPreview(resolveAvatarUrl(uploadResponse?.profile_picture_url) || '');
          setPhotoFile(null);
          setPhotoRemoved(false);
        }
        
        toast({
          title: t('common.success', 'Success'),
          description: t('students_page.form.toast.update_success', 'Student updated successfully!'),
          id: ""
        });
      } else {
        // Create new student
        const createData = {
          ...transformedData,
          password: generatePassword(),
          force_password_reset: true
        };

        const createResponse = await createStudentAsync(createData);
        savedStudentId = Number(createResponse?.data?.id);

        if (photoFile && savedStudentId) {
          const uploadResponse = await studentService.uploadProfilePicture(savedStudentId, photoFile);
          setPhotoPreview(resolveAvatarUrl(uploadResponse?.profile_picture_url) || '');
          setPhotoFile(null);
          setPhotoRemoved(false);
        }

        toast({
          title: t('common.success', 'Success'),
          description: t('students_page.form.toast.create_success', 'Student created successfully!'),
          id: ""
        });
      }
      
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('Error submitting student form:', error);
      
      // Enhanced API error handling
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        
        Object.entries(backendErrors).forEach(([backendField, errorMessages]) => {
          const frontendField = backendToFrontendFieldMap[backendField] || backendField;
          if (Array.isArray(errorMessages) && errorMessages.length > 0) {
            newErrors[frontendField] = errorMessages[0];
          } else if (typeof errorMessages === 'string') {
            newErrors[frontendField] = errorMessages;
          }
        });
        
        setErrors(prev => ({ ...prev, ...newErrors }));
        
        toast({
          title: t('students_page.form.toast.validation_error_title', 'Validation Error'),
          description: t('students_page.form.toast.validation_error_try_again', 'Please check the form for errors and try again.'),
          id: ""
        });
      } else if (error?.response?.status === 409) {
        toast({
          title: t('students_page.form.toast.conflict_error_title', 'Conflict Error'),
          description: t('students_page.form.toast.conflict_error_desc', 'A student with this admission number already exists.'),
          id: ""
        });
      } else if (error?.response?.status === 403) {
        toast({
          title: t('students_page.form.toast.permission_error_title', 'Permission Error'),
          description: t('students_page.form.toast.permission_error_desc', "You don't have permission to perform this action."),
          id: ""
        });
      } else {
        toast({
          title: t('common.error', 'Error'),
          description: error?.message || t('students_page.form.toast.submit_failed', 'Failed to submit student. Please try again.'),
          id: ""
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <Avatar className="h-24 w-24 border border-slate-200">
                  <AvatarImage src={photoPreview} alt={formData.first_name || formData.last_name ? `${formData.first_name} ${formData.last_name}`.trim() : 'Student photo'} />
                  <AvatarFallback className="text-lg font-semibold">
                    {(formData.first_name?.charAt(0) || '')}{(formData.last_name?.charAt(0) || '') || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('students_page.form.profile_picture', 'Profile Picture')}</h3>
                    <p className="text-xs text-slate-500">
                      {t('students_page.form.profile_picture_help', 'Admin can set the student profile picture here and lock it from regular changes. This photo also appears on the academic terminal report.')}
                    </p>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast({
                          title: t('students_page.form.toast.image_large_title', 'Image Too Large'),
                          description: t('students_page.form.toast.image_large_desc', 'Student profile picture must be 2MB or less.'),
                          id: ""
                        });
                        e.target.value = '';
                        return;
                      }
                      setPhotoFile(file);
                      setPhotoRemoved(false);
                      setPhotoPreview(URL.createObjectURL(file));
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <TouchFriendlyButton
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className={ADMIN_SECONDARY_BUTTON_CLASS}
                      icon={<Camera className="h-4 w-4" />}
                    >
                      {photoPreview ? t('students_page.form.change_photo', 'Change Photo') : t('students_page.form.upload_photo', 'Upload Photo')}
                    </TouchFriendlyButton>
                    <TouchFriendlyButton
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview('');
                        setPhotoRemoved(true);
                      }}
                      className={ADMIN_SECONDARY_BUTTON_CLASS}
                      disabled={!photoPreview}
                    >
                      {t('students_page.form.remove_photo', 'Remove Photo')}
                    </TouchFriendlyButton>
                  </div>
                  {photoFile && (
                    <p className="text-xs text-slate-500">{t('students_page.form.selected_file', 'Selected file:')} {photoFile.name}</p>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.profile_picture_locked}
                      onChange={(e) => setFormData(prev => ({ ...prev, profile_picture_locked: e.target.checked }))}
                    />
                    <Lock className="h-4 w-4 text-slate-500" />
                    <span>{t('students_page.form.lock_profile_picture', 'Lock student profile picture from non-admin changes')}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MobileOptimizedInput
                label={t('students_page.form.first_name', 'First Name')}
                name="first_name"
                value={formData.first_name}
                onChange={handleInputEvent}
                error={errors.first_name}
                placeholder={t('students_page.form.first_name_placeholder', 'Enter first name')}
                autoComplete="given-name"
                leftIcon={<User className="h-4 w-4" />}
                required
              />

              <MobileOptimizedInput
                label={t('students_page.form.middle_name', 'Middle Name')}
                name="middle_name"
                value={formData.middle_name}
                onChange={handleInputEvent}
                error={errors.middle_name}
                placeholder={t('students_page.form.middle_name_placeholder', 'Enter middle name (optional)')}
                autoComplete="additional-name"
                leftIcon={<User className="h-4 w-4" />}
              />

              <MobileOptimizedInput
                label={t('students_page.form.last_name', 'Last Name')}
                name="last_name"
                value={formData.last_name}
                onChange={handleInputEvent}
                error={errors.last_name}
                placeholder={t('students_page.form.last_name_placeholder', 'Enter last name')}
                autoComplete="family-name"
                leftIcon={<User className="h-4 w-4" />}
                required
              />
              
              <MobileOptimizedInput
                label={t('common.admission_number', 'Admission Number')}
                name="admission_number"
                value={formData.admission_number}
                onChange={handleInputEvent}
                error={errors.admission_number}
                placeholder={t('students_page.form.admission_number_placeholder', 'Enter admission number')}
                required
              />
              
              <MobileOptimizedInput
                label={t('teachers_page.profile.email', 'Email Address')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputEvent}
                error={errors.email}
                placeholder={t('students_page.form.email_placeholder', 'Enter email address')}
                autoComplete="email"
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />
              
              <MobileOptimizedInput
                label={t('teachers_page.profile.phone', 'Phone Number')}
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputEvent}
                error={errors.phone}
                placeholder={t('students_page.form.phone_placeholder', 'Enter phone number')}
                autoComplete="tel"
                leftIcon={<Phone className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('common.date_of_birth', 'Date of Birth')}
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleInputEvent}
                error={errors.date_of_birth}
                required
              />
              
              <MobileOptimizedSelect
                label={t('common.gender', 'Gender')}
                value={formData.gender}
                onChange={(value: string) => handleInputChange('gender', value)}
                error={errors.gender}
                placeholder={t('admission_form.placeholders.select_gender', 'Select gender')}
                options={[
                  { value: 'male', label: t('admission_form.genders.male', 'Male') },
                  { value: 'female', label: t('admission_form.genders.female', 'Female') },
                  { value: 'other', label: t('admission_form.genders.other', 'Other') }
                ]}
                required
              />
            </div>
            
            <MobileOptimizedTextarea
              label={t('common.address', 'Address')}
              name="address"
              value={formData.address}
              onChange={handleInputEvent}
              error={errors.address}
              placeholder={t('admission_form.placeholders.home_address', 'Enter full address')}
              autoComplete="street-address"
              rows={3}
            />
          </div>
        );
        
      case 1: // Contact Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MobileOptimizedInput
                label={t('students_page.form.telephone', 'Telephone')}
                name="telephone"
                type="tel"
                value={formData.telephone}
                onChange={handleInputEvent}
                error={errors.telephone}
                placeholder={t('students_page.form.telephone_placeholder', 'Enter telephone number')}
                leftIcon={<Phone className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('students_page.form.whatsapp', 'WhatsApp')}
                name="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={handleInputEvent}
                error={errors.whatsapp}
                placeholder={t('students_page.form.whatsapp_placeholder', 'Enter WhatsApp number')}
                leftIcon={<Phone className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('common.place_of_birth', 'Place of Birth')}
                name="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleInputEvent}
                placeholder={t('common.place_of_birth', 'Enter place of birth')}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.religion', 'Religious Denomination')}
                name="religiousDenomination"
                value={formData.religiousDenomination}
                onChange={handleInputEvent}
                placeholder={t('admission_form.placeholders.religion', 'Enter religious denomination')}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.city', 'City')}
                name="city"
                value={formData.city}
                onChange={handleInputEvent}
                placeholder={t('admission_form.placeholders.city', 'Enter city')}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.state', 'Country')}
                name="country"
                value={formData.country}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.state', 'Enter country')}
                leftIcon={<MapPin className="h-4 w-4" />}
              />

              <MobileOptimizedInput
                label={t('admission_form.fields.nationality', 'Nationality')}
                name="nationality"
                value={formData.nationality}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.nationality', 'Enter nationality')}
                leftIcon={<MapPin className="h-4 w-4" />}
              />

              <MobileOptimizedSelect
                label={t('common.blood_group', 'Blood Group')}
                value={formData.bloodGroup}
                onChange={(value: string) => handleInputChange('bloodGroup', value)}
                placeholder={t('admission_form.placeholders.select_blood_group', 'Select blood group')}
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
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <MobileOptimizedTextarea
                label={t('admission_form.fields.postal_address', 'Postal Address')}
                name="postalAddress"
                value={formData.postalAddress}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.postal_address', 'Enter postal address')}
                rows={2}
              />
              
              <MobileOptimizedTextarea
                label={t('admission_form.fields.home_address', 'Residential Address')}
                name="residentialAddress"
                value={formData.residentialAddress}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.home_address', 'Enter residential address')}
                rows={2}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.digital_address', 'Digital Address')}
                name="digitalAddress"
                value={formData.digitalAddress}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.digital_address', 'Enter digital address (GPS)')}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.local_landmark', 'Local Landmark')}
                name="localLandmark"
                value={formData.localLandmark}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.local_landmark', 'Enter local landmark')}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </div>
        );
        
      case 2: // Medical Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MobileOptimizedInput
                label={t('admission_form.placeholders.physician_name', 'Physician Name')}
                name="physicianName"
                value={formData.physicianName}
                onChange={handleInputEvent}
                placeholder={t('admission_form.placeholders.physician_name', 'Enter physician name')}
                leftIcon={<User className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.placeholders.physician_phone', 'Physician Phone')}
                name="physicianPhone"
                type="tel"
                value={formData.physicianPhone}
                onChange={handleInputEvent}
                error={errors.physicianPhone}
                placeholder={t('admission_form.placeholders.physician_phone', 'Enter physician phone')}
                leftIcon={<Phone className="h-4 w-4" />}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <MobileOptimizedTextarea
                label={t('common.medical_conditions', 'Medical Conditions')}
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleInputEvent}
                placeholder={t('common.medical_conditions', 'Enter any existing medical conditions')}
                rows={3}
              />

              <MobileOptimizedTextarea
                label={t('admission_form.fields.special_circumstances', 'Special Circumstances')}
                name="specialCircumstance"
                value={formData.specialCircumstance}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.special_circumstances', 'Enter any special circumstances')}
                rows={3}
              />
              
              <MobileOptimizedTextarea
                label={t('common.allergies', 'Allergies')}
                name="allergies"
                value={formData.allergies}
                onChange={handleInputEvent}
                placeholder={t('common.allergies', 'Enter any known allergies')}
                rows={3}
              />
              
              <MobileOptimizedTextarea
                label={t('admission_form.fields.medications', 'Current Medication')}
                name="medication"
                value={formData.medication}
                onChange={handleInputEvent}
                placeholder={t('admission_form.fields.medications', 'Enter current medications')}
                rows={3}
              />
            </div>
          </div>
        );
        
      case 3: // Academic Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MobileOptimizedSelect
                label={t('common.class', 'Class')}
                value={formData.class_id}
                onChange={(value: string) => handleInputChange('class_id', value)}
                error={errors.class_id}
                placeholder={t('teachers_page.assign.select_class_placeholder', 'Select class')}
                options={classOptions.length > 0 ? classOptions : [
                  { value: '1', label: 'Class 1' },
                  { value: '2', label: 'Class 2' },
                  { value: '3', label: 'Class 3' },
                  { value: '4', label: 'Class 4' },
                  { value: '5', label: 'Class 5' },
                  { value: '6', label: 'Class 6' }
                ]}
                required
              />
              
              <MobileOptimizedSelect
                label={t('common.parent_guardian', 'Parent/Guardian')}
                value={formData.parent_id}
                onChange={(value: string) => handleInputChange('parent_id', value)}
                error={errors.parent_id}
                placeholder={t('students_page.form.select_parent_placeholder', 'Select parent/guardian')}
                options={parentOptions.length > 0 ? parentOptions : []}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.prev_school_name', 'Previous School')}
                name="previousSchool"
                value={formData.previousSchool}
                onChange={handleInputEvent}
                placeholder={t('admission_form.placeholders.prev_school_name', 'Enter previous school')}
                leftIcon={<GraduationCap className="h-4 w-4" />}
              />
              
              <MobileOptimizedInput
                label={t('admission_form.fields.prev_school_class', 'Previous Class')}
                name="previousClass"
                value={formData.previousClass}
                onChange={handleInputEvent}
                placeholder={t('admission_form.placeholders.prev_school_class', 'Enter previous class')}
              />
              
              <MobileOptimizedInput
                label={t('students_page.form.previous_team', 'Previous Team/House')}
                name="previousTeam"
                value={formData.previousTeam}
                onChange={handleInputEvent}
                placeholder={t('students_page.form.previous_team_placeholder', 'Enter previous team or house')}
              />
              
              <MobileOptimizedInput
                label={t('students_page.form.previous_year', 'Previous Academic Year')}
                name="previousYear"
                value={formData.previousYear}
                onChange={handleInputEvent}
                placeholder={t('students_page.form.previous_year_placeholder', 'Enter previous academic year')}
              />
            </div>
          </div>
        );
        
      case 4: // Parent/Guardian Information
        return (
          <div className="space-y-8">
            {/* Father's Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('students_page.form.father_info', "Father's Information")}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MobileOptimizedInput
                  label={t('students_page.form.father_name', "Father's Name")}
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.father_name_placeholder', "Enter father's name")}
                  leftIcon={<User className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.father_contact', "Father's Contact")}
                  name="fatherContact"
                  type="tel"
                  value={formData.fatherContact}
                  onChange={handleInputEvent}
                  error={errors.fatherContact}
                  placeholder={t('students_page.form.father_contact_placeholder', "Enter father's contact")}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.father_email', "Father's Email")}
                  name="fatherEmail"
                  type="email"
                  value={formData.fatherEmail}
                  onChange={handleInputEvent}
                  error={errors.fatherEmail}
                  placeholder={t('students_page.form.father_email_placeholder', "Enter father's email")}
                  leftIcon={<Mail className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.father_profession', "Father's Profession")}
                  name="fatherProfession"
                  value={formData.fatherProfession}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.father_profession_placeholder', "Enter father's profession")}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.father_workplace', "Father's Workplace")}
                  name="fatherWorkplace"
                  value={formData.fatherWorkplace}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.father_workplace_placeholder', "Enter father's workplace")}
                />
              </div>
              
              <MobileOptimizedTextarea
                label={t('students_page.form.father_address', "Father's Address")}
                name="fatherAddress"
                value={formData.fatherAddress}
                onChange={handleInputEvent}
                placeholder={t('students_page.form.father_address_placeholder', "Enter father's address")}
                rows={2}
              />
            </div>
            
            {/* Mother's Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('students_page.form.mother_info', "Mother's Information")}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MobileOptimizedInput
                  label={t('students_page.form.mother_name', "Mother's Name")}
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.mother_name_placeholder', "Enter mother's name")}
                  leftIcon={<User className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.mother_contact', "Mother's Contact")}
                  name="motherContact"
                  type="tel"
                  value={formData.motherContact}
                  onChange={handleInputEvent}
                  error={errors.motherContact}
                  placeholder={t('students_page.form.mother_contact_placeholder', "Enter mother's contact")}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.mother_email', "Mother's Email")}
                  name="motherEmail"
                  type="email"
                  value={formData.motherEmail}
                  onChange={handleInputEvent}
                  error={errors.motherEmail}
                  placeholder={t('students_page.form.mother_email_placeholder', "Enter mother's email")}
                  leftIcon={<Mail className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.mother_profession', "Mother's Profession")}
                  name="motherProfession"
                  value={formData.motherProfession}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.mother_profession_placeholder', "Enter mother's profession")}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.mother_workplace', "Mother's Workplace")}
                  name="motherWorkplace"
                  value={formData.motherWorkplace}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.mother_workplace_placeholder', "Enter mother's workplace")}
                />
              </div>
              
              <MobileOptimizedTextarea
                label={t('students_page.form.mother_address', "Mother's Address")}
                name="motherAddress"
                value={formData.motherAddress}
                onChange={handleInputEvent}
                placeholder={t('students_page.form.mother_address_placeholder', "Enter mother's address")}
                rows={2}
              />
            </div>

            {/* Guardian's Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('students_page.form.guardian_info', "Guardian's Information (If different from parents)")}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MobileOptimizedInput
                  label={t('students_page.form.guardian_name', "Guardian's Name")}
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleInputEvent}
                  placeholder={t('students_page.form.guardian_name_placeholder', "Enter guardian's name")}
                  leftIcon={<User className="h-4 w-4" />}
                />
                
                <MobileOptimizedInput
                  label={t('students_page.form.guardian_contact', "Guardian's Contact")}
                  name="guardianContact"
                  type="tel"
                  value={formData.guardianContact}
                  onChange={handleInputEvent}
                  error={errors.guardianContact}
                  placeholder={t('students_page.form.guardian_contact_placeholder', "Enter guardian's contact")}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        );
        
        case 5: // Review
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">{t('students_page.form.review_info', 'Review Information')}</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('students_page.form.review_help', 'Please review all the information below before submitting. You can go back to any section to make changes.')}
              </p>
            </div>
            
            {/* Basic Information Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('students_page.form.basic_info', 'Basic Information')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">{t('students_page.form.first_name', 'First Name')}:</span> {formData.first_name}</div>
                <div><span className="font-medium">{t('students_page.form.middle_name', 'Middle Name')}:</span> {formData.middle_name || 'N/A'}</div>
                <div><span className="font-medium">{t('students_page.form.last_name', 'Last Name')}:</span> {formData.last_name}</div>
                <div><span className="font-medium">{t('common.admission_number', 'Admission Number')}:</span> {formData.admission_number}</div>
                <div><span className="font-medium">{t('teachers_page.profile.email', 'Email')}:</span> {formData.email}</div>
                <div><span className="font-medium">{t('teachers_page.profile.phone', 'Phone')}:</span> {formData.phone}</div>
                <div><span className="font-medium">{t('common.date_of_birth', 'Date of Birth')}:</span> {formData.date_of_birth}</div>
                <div><span className="font-medium">{t('common.gender', 'Gender')}:</span> {formData.gender}</div>
              </div>
              {formData.address && (
                <div className="text-sm">
                  <span className="font-medium">{t('common.address', 'Address')}:</span> {formData.address}
                </div>
              )}
            </div>
            
            {/* Contact Information Summary */}
            {(formData.telephone || formData.whatsapp || formData.placeOfBirth || formData.nationality || formData.bloodGroup) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('admission_form.step_titles.address', 'Contact Information')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {formData.telephone && <div><span className="font-medium">{t('students_page.form.telephone', 'Telephone')}:</span> {formData.telephone}</div>}
                  {formData.whatsapp && <div><span className="font-medium">{t('students_page.form.whatsapp', 'WhatsApp')}:</span> {formData.whatsapp}</div>}
                  {formData.placeOfBirth && <div><span className="font-medium">{t('common.place_of_birth', 'Place of Birth')}:</span> {formData.placeOfBirth}</div>}
                  {formData.nationality && <div><span className="font-medium">{t('admission_form.fields.nationality', 'Nationality')}:</span> {formData.nationality}</div>}
                  {formData.bloodGroup && <div><span className="font-medium">{t('common.blood_group', 'Blood Group')}:</span> {formData.bloodGroup}</div>}
                  {formData.city && <div><span className="font-medium">{t('admission_form.fields.city', 'City')}:</span> {formData.city}</div>}
                  {formData.country && <div><span className="font-medium">{t('admission_form.fields.state', 'Country')}:</span> {formData.country}</div>}
                </div>
              </div>
            )}
            
            {/* Medical Information Summary */}
            {(formData.physicianName || formData.allergies || formData.specialCircumstance || formData.medicalConditions) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {t('students_page.form.steps.medical', 'Medical Information')}
                </h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {formData.physicianName && <div><span className="font-medium">{t('admission_form.placeholders.physician_name', 'Physician')}:</span> {formData.physicianName}</div>}
                  {formData.medicalConditions && <div><span className="font-medium">{t('common.medical_conditions', 'Medical Conditions')}:</span> {formData.medicalConditions}</div>}
                  {formData.allergies && <div><span className="font-medium">{t('common.allergies', 'Allergies')}:</span> {formData.allergies}</div>}
                  {formData.specialCircumstance && <div><span className="font-medium">{t('admission_form.fields.special_circumstances', 'Special Circumstances')}:</span> {formData.specialCircumstance}</div>}
                </div>
              </div>
            )}
            
            {/* Academic Information Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {t('students_page.form.steps.enrollment', 'Academic Information')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">{t('common.class', 'Class')}:</span> {formData.class_id ? `${t('common.class', 'Class')} ${formData.class_id}` : t('students_page.form.not_selected', 'Not selected')}</div>
                <div><span className="font-medium">{t('common.parent_guardian', 'Parent/Guardian')}:</span> {formData.parent_id || t('students_page.form.not_selected', 'Not selected')}</div>
                {formData.previousSchool && <div><span className="font-medium">{t('admission_form.fields.prev_school_name', 'Previous School')}:</span> {formData.previousSchool}</div>}
                {formData.previousClass && <div><span className="font-medium">{t('admission_form.fields.prev_school_class', 'Previous Class')}:</span> {formData.previousClass}</div>}
              </div>
            </div>
            
            {/* Parent Information Summary */}
            {(formData.fatherName || formData.motherName || formData.guardianName) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('admission_form.step_titles.guardian', 'Parent/Guardian Information')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {formData.fatherName && <div><span className="font-medium">{t('students_page.form.father_name', "Father's Name")}:</span> {formData.fatherName}</div>}
                  {formData.fatherContact && <div><span className="font-medium">{t('students_page.form.father_contact', "Father's Contact")}:</span> {formData.fatherContact}</div>}
                  {formData.motherName && <div><span className="font-medium">{t('students_page.form.mother_name', "Mother's Name")}:</span> {formData.motherName}</div>}
                  {formData.motherContact && <div><span className="font-medium">{t('students_page.form.mother_contact', "Mother's Contact")}:</span> {formData.motherContact}</div>}
                  {formData.guardianName && <div><span className="font-medium">{t('students_page.form.guardian_name', "Guardian's Name")}:</span> {formData.guardianName}</div>}
                  {formData.guardianContact && <div><span className="font-medium">{t('students_page.form.guardian_contact', "Guardian's Contact")}:</span> {formData.guardianContact}</div>}
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col",
          isMobile && "max-w-[95vw] h-[95vh]"
        )}
        style={{
          paddingBottom: isMobile && isKeyboardVisible ? `${keyboardHeight}px` : undefined
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {student ? t('students_page.form.edit_student', 'Edit Student') : t('students_page.form.add_student', 'Add New Student')}
          </DialogTitle>
          <DialogDescription>
            {student 
              ? `${t('students_page.form.update_details_for', 'Update details for')} ${student.first_name} ${student.last_name}` 
              : t('students_page.form.new_student_desc', 'Enter information for the new student record using the same intake flow as admissions, with admin-only enrollment fields.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Progress Indicator */}
          <div className="flex-shrink-0 mb-6">
            <FormProgressIndicator
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={goToStep}
            />
          </div>
          
          {/* Quick Navigation */}
          {isMobile && (
            <div className="flex-shrink-0 mb-4">
              <FormQuickNav
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={goToStep}
                errors={errors}
              />
            </div>
          )}
          
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto">
            <FormValidationProvider>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {Object.keys(errors).length > 0 && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {t('students_page.form.fix_errors_alert', 'Please fix the errors below before continuing.')}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Step Content */}
                <div className="min-h-[400px]">
                  {renderStepContent()}
                </div>
              </form>
            </FormValidationProvider>
          </div>
        </div>
        
        {/* Footer with Navigation */}
        <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <div className="flex flex-1 justify-between items-center">
            <TouchFriendlyButton
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('admission_form.previous', 'Previous')}
            </TouchFriendlyButton>
            
            <div className="flex gap-2">
              <TouchFriendlyButton
                type="button"
                variant="ghost"
                onClick={saveProgress}
                className={`text-sm ${ADMIN_SECONDARY_BUTTON_CLASS}`}
              >
                {t('students_page.form.save_progress', 'Save Progress')}
              </TouchFriendlyButton>
              
              <TouchFriendlyButton
                type="button"
                variant="ghost"
                onClick={onClose}
                className={ADMIN_SECONDARY_BUTTON_CLASS}
              >
                {t('common.cancel', 'Cancel')}
              </TouchFriendlyButton>
            </div>
            
            {currentStep < steps.length - 1 ? (
              <TouchFriendlyButton
                type="button"
                onClick={nextStep}
                className={`flex items-center gap-2 ${ADMIN_PRIMARY_BUTTON_CLASS}`}
              >
                {t('admission_form.next_step', 'Next')}
                <ChevronRight className="h-4 w-4" />
              </TouchFriendlyButton>
            ) : (
              <TouchFriendlyButton
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 min-w-[120px] ${ADMIN_PRIMARY_BUTTON_CLASS}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {student ? t('common.updating', 'Updating...') : t('common.creating', 'Creating...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {student ? t('students_page.form.update_student', 'Update Student') : t('students_page.form.create_student', 'Create Student')}
                  </>
                )}
              </TouchFriendlyButton>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const StudentFormModal: React.FC<StudentFormModalProps> = (props) => {
  return <StudentFormModalContent {...props} />;
};

export default StudentFormModal;
