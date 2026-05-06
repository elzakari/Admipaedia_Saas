import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useTouchGesture } from '../../contexts/TouchGestureContext';

interface TouchFriendlyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  className?: string;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  hapticFeedback?: boolean;
}

const TouchFriendlyButton = React.forwardRef<HTMLButtonElement, TouchFriendlyButtonProps>((
  {
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    className,
    onLongPress,
    onDoubleTap,
    hapticFeedback = true,
    onClick,
    ...props
  },
  ref
) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { triggerHapticFeedback } = useTouchGesture();
  const internalRef = useRef<HTMLButtonElement>(null);
  
  // Combine external ref with internal ref using useImperativeHandle
  React.useImperativeHandle(ref, () => internalRef.current as HTMLButtonElement);
  
  // Touch gesture handlers
  const touchGestures = useTouchGestures({
    onLongPress,
    onDoubleTap
  });

  // Enhanced click handler with haptic feedback
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback) {
      triggerHapticFeedback('light');
    }
    onClick?.(e);
  }, [onClick, hapticFeedback, triggerHapticFeedback]);

  // Attach touch gestures to button
  useEffect(() => {
    const element = internalRef.current;
    if (element && (onLongPress || onDoubleTap)) {
      // Apply touch handlers directly to the element
      const { onTouchStart, onTouchMove, onTouchEnd } = touchGestures.touchHandlers;
      
      element.addEventListener('touchstart', onTouchStart as any);
      element.addEventListener('touchmove', onTouchMove as any);
      element.addEventListener('touchend', onTouchEnd as any);
      
      return () => {
        element.removeEventListener('touchstart', onTouchStart as any);
        element.removeEventListener('touchmove', onTouchMove as any);
        element.removeEventListener('touchend', onTouchEnd as any);
      };
    }
  }, [touchGestures.touchHandlers, onLongPress, onDoubleTap]);
  
  // Adjust size for touch devices
  const touchSize = isMobile ? (size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'lg') : size;
  
  // Base styles
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-95";
  
  // Size styles
  const sizeStyles = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 py-2 px-4",
    lg: "h-11 px-8"
  };
  
  // Variant styles
  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary"
  };
  
  // Touch-friendly adjustments
  const touchStyles = isMobile ? "min-h-[44px] min-w-[44px]" : "";
  
  // Width styles
  const widthStyles = fullWidth ? "w-full" : "";
  
  return (
    <button
      ref={internalRef}
      className={cn(
        baseStyles,
        sizeStyles[touchSize],
        variantStyles[variant],
        touchStyles,
        widthStyles,
        loading && "relative text-transparent transition-none hover:text-transparent",
        className
      )}
      disabled={loading || props.disabled}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
      
      {iconPosition === 'left' && icon && (
        <span className={cn("mr-2", loading && "opacity-0")}>{icon}</span>
      )}
      <span className={loading ? "opacity-0" : ""}>{children}</span>
      {iconPosition === 'right' && icon && (
        <span className={cn("ml-2", loading && "opacity-0")}>{icon}</span>
      )}
    </button>
  );
});

TouchFriendlyButton.displayName = 'TouchFriendlyButton';

export { TouchFriendlyButton };