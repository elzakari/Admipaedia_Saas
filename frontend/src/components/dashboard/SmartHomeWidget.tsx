import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Home } from 'lucide-react';

export const SmartHomeWidget: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={`glass-card border-0 overflow-hidden group ${className}`}>
      <CardContent className="p-6 flex items-center justify-between h-full">
        <div className="space-y-3 max-w-[70%]">
          <h3 className="text-xl font-bold text-white leading-tight">
            Rendez votre maison intelligente
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
            Expérience de maison intelligente offrant confidentialité et haut niveau de contrôle...
          </p>
          <Button className="glass-button bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6 h-10 transition-all">
            Restez informés
          </Button>
        </div>
        <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <Home className="w-10 h-10 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
};
