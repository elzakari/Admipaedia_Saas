// ADMIPAEDIA Design System
// Comprehensive styling foundation for consistent UI across the application

export const designSystem = {
  // Color Palette
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5', // Main brand color
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },
    
    // Semantic Colors
    semantic: {
      success: {
        50: '#f0fdf4',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
      },
      warning: {
        50: '#fffbeb',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
      },
      error: {
        50: '#fef2f2',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
      },
      info: {
        50: '#eff6ff',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
    },
    
    // Neutral Colors (Theme-aware)
    neutral: {
      light: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a',
      },
      dark: {
        50: '#0a0a0a',
        100: '#171717',
        200: '#262626',
        300: '#404040',
        400: '#525252',
        500: '#737373',
        600: '#a3a3a3',
        700: '#d4d4d4',
        800: '#e5e5e5',
        900: '#f5f5f5',
        950: '#fafafa',
      },
    },
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Spacing Scale
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  
  // Component Variants
  components: {
    // Modal Styling
    modal: {
      overlay: {
        base: 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
        animation: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      },
      content: {
        base: 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
        animation: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
      },
      header: {
        base: 'flex flex-col space-y-1.5 text-center sm:text-left',
      },
      title: {
        base: 'text-lg font-semibold leading-none tracking-tight',
      },
      footer: {
        base: 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      },
    },
    
    // Form Elements
    form: {
      field: {
        base: 'space-y-2',
      },
      label: {
        base: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        required: 'after:content-["*"] after:ml-0.5 after:text-error-500',
      },
      input: {
        base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error: 'border-error-500 focus-visible:ring-error-500',
        success: 'border-success-500 focus-visible:ring-success-500',
      },
      select: {
        base: 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      },
      button: {
        base: 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        primary: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        sizes: {
          sm: 'h-9 px-3',
          md: 'h-10 px-4 py-2',
          lg: 'h-11 px-8',
        },
      },
      error: {
        base: 'text-sm font-medium text-error-600',
      },
    },
  },
  
  // Responsive Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Animation Durations
  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  
  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

// CSS Custom Properties Generator
export const generateCSSCustomProperties = (theme: 'light' | 'dark' = 'light') => {
  const colors = theme === 'light' ? designSystem.colors.neutral.light : designSystem.colors.neutral.dark;
  
  return {
    '--color-primary-50': designSystem.colors.primary[50],
    '--color-primary-500': designSystem.colors.primary[500],
    '--color-primary-600': designSystem.colors.primary[600],
    '--color-primary-700': designSystem.colors.primary[700],
    
    '--color-background': colors[50],
    '--color-background-secondary': colors[100],
    '--color-foreground': colors[900],
    '--color-foreground-secondary': colors[700],
    '--color-border': colors[200],
    '--color-input': colors[300],
    '--color-ring': designSystem.colors.primary[600],
    
    '--color-success': designSystem.colors.semantic.success[500],
    '--color-warning': designSystem.colors.semantic.warning[500],
    '--color-error': designSystem.colors.semantic.error[500],
    '--color-info': designSystem.colors.semantic.info[500],
    
    '--radius': designSystem.borderRadius.md,
    '--font-sans': designSystem.typography.fontFamily.sans.join(', '),
  };
};

// Component Class Generators
export const getModalClasses = () => ({
  overlay: designSystem.components.modal.overlay.base + ' ' + designSystem.components.modal.overlay.animation,
  content: designSystem.components.modal.content.base + ' ' + designSystem.components.modal.content.animation,
  header: designSystem.components.modal.header.base,
  title: designSystem.components.modal.title.base,
  footer: designSystem.components.modal.footer.base,
});

export const getFormClasses = () => ({
  field: designSystem.components.form.field.base,
  label: designSystem.components.form.label.base,
  labelRequired: designSystem.components.form.label.base + ' ' + designSystem.components.form.label.required,
  input: designSystem.components.form.input.base,
  inputError: designSystem.components.form.input.base + ' ' + designSystem.components.form.input.error,
  inputSuccess: designSystem.components.form.input.base + ' ' + designSystem.components.form.input.success,
  select: designSystem.components.form.select.base,
  button: designSystem.components.form.button.base,
  buttonPrimary: designSystem.components.form.button.base + ' ' + designSystem.components.form.button.primary + ' ' + designSystem.components.form.button.sizes.md,
  buttonSecondary: designSystem.components.form.button.base + ' ' + designSystem.components.form.button.secondary + ' ' + designSystem.components.form.button.sizes.md,
  error: designSystem.components.form.error.base,
});