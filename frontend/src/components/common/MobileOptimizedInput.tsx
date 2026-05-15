import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getFormClasses } from '../../styles/design-system';
import { Eye, EyeOff, X, Check, AlertCircle } from 'lucide-react';

interface MobileOptimizedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  loading?: boolean;
  onClear?: () => void;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validator?: (value: string) => string | null;
}

const MobileOptimizedInput: React.FC<MobileOptimizedInputProps> = ({
  label,
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  clearable = false,
  showPasswordToggle = false,
  size = 'md',
  variant = 'default',
  loading = false,
  className,
  type = 'text',
  value,
  onChange,
  onFocus,
  onBlur,
  onClear,
  validateOnBlur = true,
  validateOnChange = false,
  validator,
  disabled,
  required,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const currentError = error || internalError;
  const hasValue = value && value.toString().length > 0;
  const isPassword = type === 'password' || showPasswordToggle;
  const inputType = isPassword && showPassword ? 'text' : type;
  
  // Get design system classes
  const formClasses = getFormClasses();

  // Enhanced mobile keyboard types
  const getMobileInputMode = (): string => {
    switch (type) {
      case 'email': return 'email';
      case 'tel': return 'tel';
      case 'url': return 'url';
      case 'number': return 'numeric';
      case 'search': return 'search';
      default: return 'text';
    }
  };

  const getAutoComplete = (): string => {
    if (props.autoComplete) return props.autoComplete;
    
    switch (type) {
      case 'email': return 'email';
      case 'tel': return 'tel';
      case 'password': return showPasswordToggle ? 'current-password' : 'new-password';
      default: return 'off';
    }
  };

  const validateInput = (inputValue: string) => {
    if (!validator) return;
    
    const validationError = validator(inputValue);
    setInternalError(validationError);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
    
    // Auto-scroll to input on mobile to prevent keyboard overlap
    if (isMobile && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
    
    if (validateOnBlur && e.target.value) {
      validateInput(e.target.value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    
    if (validateOnChange) {
      validateInput(e.target.value);
    }
    
    // Clear error when user starts typing
    if (currentError && e.target.value) {
      setInternalError(null);
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      const event = new Event('input', { bubbles: true });
      inputRef.current.value = '';
      inputRef.current.dispatchEvent(event);
    }
    onClear?.();
    setInternalError(null);
  };

  // Mobile-optimized size classes
  const sizeClasses = {
    sm: isMobile ? 'h-10 text-sm px-3' : 'h-8 text-sm px-2',
    md: isMobile ? 'h-12 text-base px-4' : 'h-10 text-sm px-3',
    lg: isMobile ? 'h-14 text-lg px-4' : 'h-12 text-base px-4'
  };

  // Enhanced variant classes using design system colors
  const variantClasses = {
    default: 'ds-input-base',
    filled: 'ds-input-filled border-0 bg-neutral-100 focus:bg-background focus:ring-2 focus:ring-primary-200',
    outlined: 'ds-input-outlined border-2 bg-transparent'
  };

  const inputId = props.id || props.name;

  return (
    <div className={cn('ds-form-field', formClasses.field)}>
      {label && (
        <label 
          htmlFor={inputId}
          className={cn(
            'ds-form-label',
            formClasses.label,
            'mb-2 transition-colors',
            currentError ? 'text-error-600' : 'text-foreground-secondary',
            isFocused && !currentError && 'text-primary-600',
            required && 'ds-form-label-required'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={inputRef}
          id={inputId}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          required={required}
          inputMode={getMobileInputMode() as any}
          autoComplete={getAutoComplete()}
          className={cn(
            'ds-input',
            currentError ? 'ds-input-error' : success && !currentError ? 'ds-input-success' : formClasses.input,
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100', // Ensure high contrast text
            'border-slate-200 dark:border-slate-700',
            sizeClasses[size],
            variantClasses[variant],
            leftIcon && 'pl-10',
            (rightIcon || clearable || showPasswordToggle || loading) && 'pr-10',
            disabled && 'ds-input-disabled cursor-not-allowed opacity-60',
            isFocused && 'shadow-lg ring-2 ring-primary-500/20 border-primary-500',
            // Enhanced mobile touch targets
            isMobile && 'touch-manipulation',
            className
          )}
          {...props}
        />
        
        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          )}
          
          {success && !currentError && !loading && (
            <Check className="h-4 w-4 text-success-500" />
          )}
          
          {currentError && !loading && (
            <AlertCircle className="h-4 w-4 text-error-500" />
          )}
          
          {clearable && hasValue && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-neutral-100 rounded transition-colors ds-button-ghost"
              tabIndex={-1}
            >
              <X className="h-3 w-3 text-foreground-secondary" />
            </button>
          )}
          
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-neutral-100 rounded transition-colors ds-button-ghost"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-foreground-secondary" />
              ) : (
                <Eye className="h-4 w-4 text-foreground-secondary" />
              )}
            </button>
          )}
          
          {rightIcon && !clearable && !showPasswordToggle && !loading && (
            <div className="text-foreground-secondary">{rightIcon}</div>
          )}
        </div>
      </div>
      
      {/* Helper text and error messages */}
      {(currentError || helperText) && (
        <div className="mt-1 min-h-[1.25rem]">
          {currentError ? (
            <p className={cn('ds-form-error', formClasses.error, 'flex items-center')}>
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              {currentError}
            </p>
          ) : helperText ? (
            <p className="text-sm text-foreground-secondary">{helperText}</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedInput;