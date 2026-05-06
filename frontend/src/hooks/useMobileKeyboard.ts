import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from './useMediaQuery';

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

interface MobileKeyboardOptions {
  adjustViewport?: boolean;
  preventBodyScroll?: boolean;
  autoScrollToInput?: boolean;
}

export const useMobileKeyboard = (options: MobileKeyboardOptions = {}) => {
  const {
    adjustViewport = true,
    preventBodyScroll = true,
    autoScrollToInput = true
  } = options;
  
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0
  });
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);

  useEffect(() => {
    if (!isMobile) return;
    
    setInitialViewportHeight(window.visualViewport?.height || window.innerHeight);
    
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Keyboard is considered visible if viewport height decreased by more than 150px
      const isKeyboardVisible = heightDifference > 150;
      
      setKeyboardState({
        isVisible: isKeyboardVisible,
        height: isKeyboardVisible ? heightDifference : 0
      });
      
      if (adjustViewport) {
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${isKeyboardVisible ? heightDifference : 0}px`
        );
      }
      
      if (preventBodyScroll) {
        document.body.style.overflow = isKeyboardVisible ? 'hidden' : '';
      }
    };
    
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (autoScrollToInput) {
          setTimeout(() => {
            target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 300);
        }
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
    }
    
    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      
      document.removeEventListener('focusin', handleFocusIn);
      
      // Cleanup styles
      document.documentElement.style.removeProperty('--keyboard-height');
      document.body.style.overflow = '';
    };
  }, [isMobile, initialViewportHeight, adjustViewport, preventBodyScroll, autoScrollToInput]);
  
  const scrollToInput = useCallback((element: HTMLElement) => {
    if (!isMobile) return;
    
    setTimeout(() => {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300);
  }, [isMobile]);
  
  return {
    ...keyboardState,
    scrollToInput,
    isMobile
  };
};