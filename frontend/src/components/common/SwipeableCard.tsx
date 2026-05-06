import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface SwipeAction {
  id: string;
  label: string;
  icon: ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  action: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  className?: string;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  swipeThreshold?: number;
  hapticFeedback?: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  className,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  disabled = false,
  swipeThreshold = 80,
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showActions, setShowActions] = useState<'left' | 'right' | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    setIsPressed(true);
    
    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        triggerHaptic();
        onLongPress();
      }, 500);
    }
  }, [disabled, isMobile, onLongPress, triggerHaptic]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile || !isPressed) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    
    // Clear long press if user moves too much
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isDragging.current = true;
      e.preventDefault();
      
      const maxSwipe = 120;
      const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
      setSwipeOffset(clampedOffset);
      
      // Show actions based on swipe direction
      if (deltaX > 20 && leftActions.length > 0) {
        setShowActions('left');
      } else if (deltaX < -20 && rightActions.length > 0) {
        setShowActions('right');
      } else {
        setShowActions(null);
      }
    }
  }, [disabled, isMobile, isPressed, leftActions.length, rightActions.length]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isMobile) return;
    
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isDragging.current) {
      const absOffset = Math.abs(swipeOffset);
      
      if (absOffset > swipeThreshold) {
        triggerHaptic();
        
        if (swipeOffset > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      
      // Reset state
      setTimeout(() => {
        setSwipeOffset(0);
        setShowActions(null);
        isDragging.current = false;
      }, 200);
    }
  }, [disabled, isMobile, swipeOffset, swipeThreshold, triggerHaptic, onSwipeRight, onSwipeLeft]);

  const actionColors = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white'
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left Actions */}
      {showActions === 'left' && leftActions.length > 0 && (
        <div className="absolute left-0 top-0 h-full flex items-center z-10">
          {leftActions.map((action, index) => (
            <button
              key={action.id}
              className={cn(
                'h-full px-4 flex items-center justify-center min-w-[60px] transition-all duration-200',
                actionColors[action.color],
                'transform translate-x-0'
              )}
              onClick={(e) => {
                e.stopPropagation();
                action.action();
                setSwipeOffset(0);
                setShowActions(null);
              }}
              style={{
                transform: `translateX(${Math.max(0, swipeOffset - 60 * (index + 1))}px)`
              }}
            >
              <span className="text-sm">{action.icon}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Right Actions */}
      {showActions === 'right' && rightActions.length > 0 && (
        <div className="absolute right-0 top-0 h-full flex items-center z-10">
          {rightActions.map((action, index) => (
            <button
              key={action.id}
              className={cn(
                'h-full px-4 flex items-center justify-center min-w-[60px] transition-all duration-200',
                actionColors[action.color],
                'transform translate-x-0'
              )}
              onClick={(e) => {
                e.stopPropagation();
                action.action();
                setSwipeOffset(0);
                setShowActions(null);
              }}
              style={{
                transform: `translateX(${Math.min(0, swipeOffset + 60 * (index + 1))}px)`
              }}
            >
              <span className="text-sm">{action.icon}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Main Card Content */}
      <div
        ref={cardRef}
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
          'transition-all duration-200 ease-out',
          isPressed && isMobile && 'scale-[0.98]',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;