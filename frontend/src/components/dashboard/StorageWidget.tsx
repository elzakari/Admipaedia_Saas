import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Settings, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';

export const StorageWidget: React.FC<{ className?: string }> = ({ className }) => {
  const storage = { used: 14.54, total: 29.42 };
  const percentage = (storage.used / storage.total) * 100;

  return (
    <Card className={`glass-card border-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
          Stockage
        </CardTitle>
        <Settings className="h-4 w-4 text-white/60" />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <div className="w-6 h-6 bg-white/40 rounded shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Sain</span>
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              </div>
              <div className="text-[10px] text-white/40">
                Utilisé: {storage.used} GB / Total: {storage.total} GB
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
