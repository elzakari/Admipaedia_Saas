import React from 'react';
import { Card, CardContent } from '../ui/card';

export const AppTile: React.FC<{ icon: React.ReactNode; label: string; className?: string }> = ({ icon, label, className }) => {
  return (
    <Card className={`glass-card border-0 hover:scale-105 transition-all duration-300 group cursor-pointer ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg group-hover:bg-white/20 transition-colors">
          {icon}
        </div>
        <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
          {label}
        </span>
      </CardContent>
    </Card>
  );
};
