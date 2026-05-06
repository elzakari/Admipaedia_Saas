import { ReactNode } from 'react';

// Types for student data - consolidated interface
export interface Student {
    id: number;
    admission_number: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    display_name: string;
    full_name: string;
    email?: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    class_id: number;
    class_name?: string;
    section?: string;
    enrollment_date: string;
    status: 'active' | 'inactive' | 'graduated' | 'transferred';
    profile_image?: string;

    // Contact Information
    phone?: string;
    telephone?: string;
    address: string;
    city: string;
    country: string;
    whatsapp?: string;
    postal_address?: string;
    digital_address?: string;
    residential_address?: string;
    local_landmark?: string;

    // Additional Information
    place_of_birth?: string;
    religious_denomination?: string;
    special_circumstance?: string;
    allergies?: string;
    medication?: string;
    physician_name?: string;
    physician_phone?: string;

    // Previous School Information
    previous_school?: string;
    previous_class?: string;
    previous_team?: string;
    previous_year?: string;

    // Parent Information
    parent_id?: number;
    parent_name?: ReactNode;
    parent_phone?: ReactNode;
    parent_email?: ReactNode;
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

    // Computed fields
    attendance_percentage?: number;
    performance_average?: number;

    // Legacy fields for backward compatibility
    name?: string;
    surname?: string;
    profileImage?: string;
    studentId?: ReactNode;
    created_at?: string;
}

export interface StudentCreate {
    password: string;
    // Required fields
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    email: string;

    // Optional fields
    middle_name?: string;
    name?: string; // Legacy field
    surname?: string; // Legacy field
    admission_number?: string;  // Optional for auto-generation
    address?: string;
    phone?: string;
    telephone?: string;
    class_id?: number;
    parent_id?: number;
    status?: string;

    // Additional fields from backend schema
    place_of_birth?: string;
    religious_denomination?: string;
    whatsapp?: string;
    postal_address?: string;
    digital_address?: string;
    city?: string;
    country?: string;
    residential_address?: string;
    local_landmark?: string;
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
    mother_profession?: string;
    mother_workplace?: string;
    mother_email?: string;
    profile_picture?: string;
}

export interface StudentUpdate extends Partial<StudentCreate> { }

export interface StudentFilters {
    page?: number;
    per_page?: number;
    class_id?: number;
    status?: string;
    search?: string;
}

export interface StudentProfile extends Student {
    assignments: Array<{
        id: number;
        title: string;
        subject_name: string;
        due_date: string;
        status: 'pending' | 'submitted' | 'graded' | 'overdue';
        score?: number;
        max_score?: number;
    }>;
    [key: string]: unknown; // Allow for additional properties
}
