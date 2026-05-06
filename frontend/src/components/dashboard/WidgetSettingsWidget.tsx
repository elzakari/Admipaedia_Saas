import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Settings, CheckCircle2 } from 'lucide-react';

export const WidgetSettingsWidget: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={`glass-card border-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
          Paramètres du widget
        </CardTitle>
        <Settings className="h-4 w-4 text-white/60" />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-col gap-3">
          {[
            { label: 'Visibilité', active: true },
            { label: 'Rafraîchissement auto', active: true },
            { label: 'Mode compact', active: false }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs text-slate-300">{item.label}</span>
              <div className={`w-8 h-4 rounded-full transition-colors ${item.active ? 'bg-blue-600' : 'bg-slate-700'} relative`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.active ? 'left-4.5' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
