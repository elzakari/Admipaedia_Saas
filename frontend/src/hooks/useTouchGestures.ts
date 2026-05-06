import { useRef, useCallback, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface TouchGestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onLongPress?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
}

interface TouchGestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  hapticFeedback?: boolean;
  preventScroll?: boolean;
}

const defaultOptions: Required<TouchGestureOptions> = {
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.1,
  hapticFeedback: true,
  preventScroll: false
};

export const useTouchGestures = (
  handlers: TouchGestureHandlers,
  options: TouchGestureOptions = {}
) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const opts = { ...defaultOptions, ...options };
  
  const [isPressed, setIsPressed] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  const startPoint = useRef<TouchPoint | null>(null);
  const lastTap = useRef<TouchPoint | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistance = useRef<number>(0);
  const lastPinchScale = useRef<number>(1);

  const triggerHaptic = useCallback((intensity: number = 10) => {
    if (opts.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(intensity);
    }
  }, [opts.hapticFeedback]);

  const getDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
    
    setIsPressed(true);
    startPoint.current = point;
    
    if (e.touches.length === 2) {
      // Pinch gesture start
      setIsPinching(true);
      initialPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
      lastPinchScale.current = 1;
    } else if (e.touches.length === 1) {
      // Single touch - check for long press
      if (handlers.onLongPress) {
        longPressTimer.current = setTimeout(() => {
          triggerHaptic(20);
          handlers.onLongPress!(point);
        }, opts.longPressDelay);
      }
    }
    
    if (opts.preventScroll) {
      e.preventDefault();
    }
  }, [isMobile, handlers.onLongPress, opts.longPressDelay, opts.preventScroll, getDistance, triggerHaptic]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !startPoint.current) return;
    
    // Clear long press timer on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (e.touches.length === 2 && isPinching && handlers.onPinch) {
      // Handle pinch gesture
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance.current;
      
      if (Math.abs(scale - lastPinchScale.current) > opts.pinchThreshold) {
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        handlers.onPinch({
          scale,
          center: { x: centerX, y: centerY }
        });
        
        lastPinchScale.current = scale;
      }
    }
    
    if (opts.preventScroll) {
      e.preventDefault();
    }
  }, [isMobile, isPinching, handlers.onPinch, opts.pinchThreshold, opts.preventScroll, getDistance]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !startPoint.current) return;
    
    setIsPressed(false);
    setIsPinching(false);
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const touch = e.changedTouches[0];
    const endPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
    
    const dx = endPoint.x - startPoint.current.x;
    const dy = endPoint.y - startPoint.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = endPoint.timestamp - startPoint.current.timestamp;
    const velocity = distance / duration;
    
    // Check for swipe gesture
    if (distance > opts.swipeThreshold && handlers.onSwipe) {
      const direction = getSwipeDirection(startPoint.current, endPoint);
      triggerHaptic(15);
      handlers.onSwipe({
        direction,
        distance,
        velocity,
        duration
      });
    }
    // Check for tap gestures
    else if (distance < 10 && duration < 200) {
      // Check for double tap
      if (lastTap.current && 
          endPoint.timestamp - lastTap.current.timestamp < opts.doubleTapDelay &&
          Math.abs(endPoint.x - lastTap.current.x) < 30 &&
          Math.abs(endPoint.y - lastTap.current.y) < 30) {
        
        if (handlers.onDoubleTap) {
          triggerHaptic(10);
          handlers.onDoubleTap(endPoint);
        }
        lastTap.current = null;
      } else {
        // Single tap
        if (handlers.onTap) {
          handlers.onTap(endPoint);
        }
        lastTap.current = endPoint;
      }
    }
    
    startPoint.current = null;
  }, [isMobile, opts.swipeThreshold, opts.doubleTapDelay, handlers, getSwipeDirection, triggerHaptic]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    isPressed,
    isPinching
  };
};