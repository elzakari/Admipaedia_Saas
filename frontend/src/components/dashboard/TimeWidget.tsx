import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TimeWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`p-6 rounded-2xl glass-card inline-block min-w-[200px] ${className}`}>
      <div className="text-5xl font-bold text-white mb-1">
        {format(time, 'HH:mm')}
      </div>
      <div className="text-lg text-white/80 capitalize">
        {format(time, 'EEEE d MMMM yyyy', { locale: fr })}
      </div>
    </div>
  );
};
