import React, { ReactNode } from 'react';
import SwipeableCard from './SwipeableCard';
import { cn } from '../../lib/utils';

interface SwipeableListItem {
  id: string;
  content: ReactNode;
  leftActions?: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    action: () => void;
  }>;
  rightActions?: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    action: () => void;
  }>;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
}

interface SwipeableListProps {
  items: SwipeableListItem[];
  className?: string;
  itemClassName?: string;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  hapticFeedback?: boolean;
  swipeThreshold?: number;
}

const SwipeableList: React.FC<SwipeableListProps> = ({
  items,
  className,
  itemClassName,
  spacing = 'sm',
  hapticFeedback = true,
  swipeThreshold = 80
}) => {
  const spacingClasses = {
    none: 'space-y-0',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  };

  return (
    <div className={cn('w-full', spacingClasses[spacing], className)}>
      {items.map((item) => (
        <SwipeableCard
          key={item.id}
          className={itemClassName}
          leftActions={item.leftActions}
          rightActions={item.rightActions}
          onSwipeLeft={item.onSwipeLeft}
          onSwipeRight={item.onSwipeRight}
          onLongPress={item.onLongPress}
          hapticFeedback={hapticFeedback}
          swipeThreshold={swipeThreshold}
        >
          {item.content}
        </SwipeableCard>
      ))}
    </div>
  );
};

export default SwipeableList;