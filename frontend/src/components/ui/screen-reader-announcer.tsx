import React, { useEffect, useState } from 'react';

interface ScreenReaderAnnouncerProps {
  message: string;
  assertive?: boolean;
  clearAfter?: number; // milliseconds
}

const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({ 
  message, 
  assertive = false,
  clearAfter = 5000 
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);
  
  useEffect(() => {
    setCurrentMessage(message);
    
    // Clear message after specified time to prevent repeated announcements
    if (clearAfter > 0 && message) {
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);
  
  if (!currentMessage) return null;
  
  return (
    <div 
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
};

export default ScreenReaderAnnouncer;