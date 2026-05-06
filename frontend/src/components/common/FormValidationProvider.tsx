import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  number?: boolean;
  min?: number;
  max?: number;
}

interface FieldValidation {
  rules: ValidationRule;
  error?: string;
  touched?: boolean;
}

interface FormValidationContextType {
  fields: Record<string, FieldValidation>;
  validateField: (name: string, value: any, rules: ValidationRule) => string | null;
  setFieldError: (name: string, error: string | null) => void;
  setFieldTouched: (name: string, touched: boolean) => void;
  isFieldValid: (name: string) => boolean;
  isFormValid: () => boolean;
  resetValidation: () => void;
  getFieldError: (name: string) => string | undefined;
}

const FormValidationContext = createContext<FormValidationContextType | undefined>(undefined);

interface FormValidationProviderProps {
  children: ReactNode;
}

export const FormValidationProvider: React.FC<FormValidationProviderProps> = ({ children }) => {
  const [fields, setFields] = useState<Record<string, FieldValidation>>({});

  const validateField = useCallback((name: string, value: any, rules: ValidationRule): string | null => {
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    const stringValue = String(value);

    // Length validations
    if (rules.minLength && stringValue.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return 'Invalid format';
    }

    // Email validation
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (rules.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = stringValue.replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return 'Please enter a valid phone number';
      }
    }

    // URL validation
    if (rules.url) {
      try {
        new URL(stringValue);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    // Number validations
    if (rules.number) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return 'Please enter a valid number';
      }

      if (rules.min !== undefined && numValue < rules.min) {
        return `Value must be at least ${rules.min}`;
      }

      if (rules.max !== undefined && numValue > rules.max) {
        return `Value must be at most ${rules.max}`;
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, []);

  const setFieldError = useCallback((name: string, error: string | null) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error: error || undefined
      }
    }));
  }, []);

  const setFieldTouched = useCallback((name: string, touched: boolean) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched
      }
    }));
  }, []);

  const isFieldValid = useCallback((name: string): boolean => {
    const field = fields[name];
    return !field?.error;
  }, [fields]);

  const isFormValid = useCallback((): boolean => {
    return Object.values(fields).every(field => !field.error);
  }, [fields]);

  const resetValidation = useCallback(() => {
    setFields({});
  }, []);

  const getFieldError = useCallback((name: string): string | undefined => {
    return fields[name]?.error;
  }, [fields]);

  const value = {
    fields,
    validateField,
    setFieldError,
    setFieldTouched,
    isFieldValid,
    isFormValid,
    resetValidation,
    getFieldError
  };

  return (
    <FormValidationContext.Provider value={value}>
      {children}
    </FormValidationContext.Provider>
  );
};

export const useFormValidation = (): FormValidationContextType => {
  const context = useContext(FormValidationContext);
  if (!context) {
    throw new Error('useFormValidation must be used within a FormValidationProvider');
  }
  return context;
};