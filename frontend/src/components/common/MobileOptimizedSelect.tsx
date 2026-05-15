import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getFormClasses } from '../../styles/design-system';
import { ChevronDown, Check, AlertCircle, Search, X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface MobileOptimizedSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  leftIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClear?: () => void;
  id?: string;
  name?: string;
}

const MobileOptimizedSelect: React.FC<MobileOptimizedSelectProps> = ({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  leftIcon,
  error,
  helperText,
  disabled = false,
  required = false,
  loading = false,
  searchable = false,
  clearable = false,
  variant = 'default',
  size = 'md',
  className,
  onClear,
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const selectedOption = options.find(option => option.value === value);
  const inputId = id || name || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  
  // Get design system classes
  const formClasses = getFormClasses();
  
  const filteredOptions = searchable && searchQuery
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const groupedOptions = filteredOptions.reduce((groups, option) => {
    const group = option.group || 'default';
    if (!groups[group]) groups[group] = [];
    groups[group].push(option);
    return groups;
  }, {} as Record<string, SelectOption[]>);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
      setIsFocused(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    setIsFocused(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
    onClear?.();
  };

  // Mobile-optimized size classes
  const sizeClasses = {
    sm: isMobile ? 'h-10 text-sm px-3' : 'h-8 text-sm px-2',
    md: isMobile ? 'h-12 text-base px-4' : 'h-10 text-sm px-3',
    lg: isMobile ? 'h-14 text-lg px-4' : 'h-12 text-base px-4'
  };

  // Enhanced variant classes using design system
  const variantClasses = {
    default: 'ds-select-base',
    filled: 'ds-select-filled border-0 bg-neutral-100 focus:bg-background focus:ring-2 focus:ring-primary-200',
    outlined: 'ds-select-outlined border-2 bg-transparent'
  };

  return (
    <div className={cn('ds-form-field', formClasses.field)} ref={selectRef}>
      {label && (
        <label 
          htmlFor={inputId}
          className={cn(
            'ds-form-label',
            formClasses.label,
            'mb-2 transition-colors',
            error ? 'text-error-600' : 'text-foreground-secondary',
            isFocused && !error && 'text-primary-600',
            required && 'ds-form-label-required'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          id={inputId}
          type="button"
          onClick={handleToggle}
          disabled={disabled || loading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            'ds-select',
            error ? 'ds-select-error' : formClasses.select,
            'w-full flex items-center justify-between text-left transition-all duration-200',
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100', // Ensure high contrast text
            'border-slate-200 dark:border-slate-700',
            sizeClasses[size],
            variantClasses[variant],
            disabled && 'ds-select-disabled cursor-not-allowed opacity-60',
            isOpen && 'shadow-lg ring-2 ring-primary-500/20 border-primary-500',
            isMobile && 'touch-manipulation',
            className
          )}
        >
          <div className="flex items-center min-w-0 flex-1">
            {leftIcon && (
              <span className="mr-2 flex-shrink-0 text-foreground-secondary">
                {leftIcon}
              </span>
            )}
            <span className={cn(
              'truncate font-medium',
              !selectedOption && 'text-slate-400 dark:text-slate-500'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
            )}
            
            {clearable && selectedOption && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-neutral-100 rounded transition-colors ds-button-ghost"
                tabIndex={-1}
              >
                <X className="h-3 w-3 text-foreground-secondary" />
              </button>
            )}
            
            <ChevronDown className={cn(
              'h-4 w-4 text-foreground-secondary transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          </div>
        </button>
        
        {/* Dropdown */}
        {isOpen && (
          <div className={cn(
            'absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto',
            'ds-dropdown animate-in fade-in zoom-in-95 duration-100',
            isMobile && 'max-h-48'
          )}>
            {searchable && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'ds-input',
                      formClasses.input,
                      'w-full pl-10 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-800 transition-all',
                      isMobile && 'text-base py-3'
                    )}
                  />
                </div>
              </div>
            )}
            
            <div className="py-1" role="listbox">
              {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <div key={groupName}>
                  {groupName !== 'default' && (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                      {groupName}
                    </div>
                  )}
                  
                  {groupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selectedOption?.value === option.value}
                      onClick={() => handleSelect(option.value)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full px-3 py-2.5 text-left flex items-center justify-between transition-all duration-150',
                        'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                        'text-slate-700 dark:text-slate-200 font-medium',
                        'ds-select-option',
                        isMobile && 'py-3.5 text-base',
                        option.disabled && 'opacity-40 cursor-not-allowed',
                        selectedOption?.value === option.value && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 ds-select-option-selected'
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {selectedOption?.value === option.value && (
                        <Check className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
              
              {filteredOptions.length === 0 && (
                <div className="px-3 py-8 text-sm text-slate-400 dark:text-slate-500 text-center flex flex-col items-center">
                  <Search className="h-8 w-8 mb-2 opacity-20" />
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-1 min-h-[1.25rem]">
          {error ? (
            <p className={cn('ds-form-error', formClasses.error, 'flex items-center')}>
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              {error}
            </p>
          ) : helperText ? (
            <p className="text-sm text-foreground-secondary">{helperText}</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedSelect;
