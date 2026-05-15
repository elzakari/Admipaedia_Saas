import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { AlertCircle, MessageSquare } from 'lucide-react';

interface MobileOptimizedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  variant?: 'default' | 'filled' | 'outlined';
  loading?: boolean;
  validateOnBlur?: boolean;
  validator?: (value: string) => string | null;
}

const MobileOptimizedTextarea: React.FC<MobileOptimizedTextareaProps> = ({
  label,
  error,
  helperText,
  maxLength,
  showCharCount = false,
  autoResize = true,
  minRows = 3,
  maxRows = 8,
  variant = 'default',
  loading = false,
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  validateOnBlur = true,
  validator,
  disabled,
  required,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const currentError = error || internalError;
  const charCount = value ? value.toString().length : 0;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  const validateInput = (inputValue: string) => {
    if (!validator) return;
    
    const validationError = validator(inputValue);
    setInternalError(validationError);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
    
    // Auto-scroll to textarea on mobile
    if (isMobile && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
    
    if (validateOnBlur && e.target.value) {
      validateInput(e.target.value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Enforce max length
    if (maxLength && e.target.value.length > maxLength) {
      return;
    }
    
    onChange?.(e);
    
    // Clear error when user starts typing
    if (currentError && e.target.value) {
      setInternalError(null);
    }
  };

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, minRows, maxRows]);

  const variantClasses = {
    default: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
    filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-200',
    outlined: 'border-2 border-gray-300 bg-transparent focus:border-blue-500'
  };

  const textareaId = props.id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={textareaId}
          className={cn(
            'block text-sm font-medium mb-2 transition-colors',
            currentError ? 'text-red-600' : 'text-gray-700',
            isFocused && !currentError && 'text-blue-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          required={required}
          rows={autoResize ? minRows : props.rows || minRows}
          className={cn(
            'w-full rounded-lg transition-all duration-200 outline-none resize-none',
            isMobile ? 'p-4 text-base min-h-[3rem]' : 'p-3 text-sm',
            variantClasses[variant],
            currentError && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
            isFocused && 'shadow-lg',
            isMobile && 'touch-manipulation',
            className
          )}
          {...props}
        />
        
        {loading && (
          <div className="absolute top-3 right-3">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>
      
      {/* Character count and helper text */}
      <div className="mt-1 flex justify-between items-start min-h-[1.25rem]">
        <div className="flex-1">
          {currentError ? (
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              {currentError}
            </p>
          ) : helperText ? (
            <p className="text-sm text-gray-500">{helperText}</p>
          ) : null}
        </div>
        
        {(showCharCount || maxLength) && (
          <div className="ml-2 flex-shrink-0">
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-red-500' : 'text-gray-400'
            )}>
              {charCount}{maxLength && `/${maxLength}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOptimizedTextarea;