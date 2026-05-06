import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Activity, ChevronRight } from 'lucide-react';

export const SystemStatusWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [stats, setStats] = useState({ cpu: 13, ram: 35, ramGb: 1.92 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 5)),
        ram: Math.max(10, Math.min(90, prev.ram + (Math.random() - 0.5) * 2)),
        ramGb: 1.92
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const Gauge = ({ value, label, sublabel }: { value: number; label: string; sublabel: string }) => {
    const strokeDasharray = 2 * Math.PI * 35;
    const strokeDashoffset = strokeDasharray * (1 - value / 100);

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="transparent"
              stroke="#10B981"
              strokeWidth="6"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-in-out drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-xl font-bold">{Math.round(value)}%</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-medium">{sublabel}</div>
      </div>
    );
  };

  return (
    <Card className={`glass-card border-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
          État du système
        </CardTitle>
        <ChevronRight className="h-4 w-4 text-white/60" />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-4">
        <Gauge value={stats.cpu} label="CPU" sublabel="0.0W / 0°C" />
        <Gauge value={stats.ram} label="RAM" sublabel={`${stats.ramGb} GB`} />
      </CardContent>
    </Card>
  );
};
