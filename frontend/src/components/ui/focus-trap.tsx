import React, { useEffect, useRef } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  onEscape?: () => void;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  active = true, 
  initialFocus,
  onEscape 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Get all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Set initial focus
    if (initialFocus && initialFocus.current) {
      initialFocus.current.focus();
    } else {
      firstElement.focus();
    }
    
    // Handle tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape key
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }
      
      // Only handle tab key
      if (e.key !== 'Tab') return;
      
      // Shift + Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } 
      // Tab
      else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Save previous active element to restore focus later
    const previousActiveElement = document.activeElement as HTMLElement;
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus when unmounted
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, [active, initialFocus, onEscape]);
  
  return <div ref={containerRef}>{children}</div>;
};

export default FocusTrap;