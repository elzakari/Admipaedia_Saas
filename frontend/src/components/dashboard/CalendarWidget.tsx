import React, { useState, useEffect } from 'react';
import { useEnhancedCalendarEvents } from '../../hooks/useEnhancedDashboardData';
import { DashboardFiltersState } from '../../hooks/useDashboardFilters';
import dashboardService, { CalendarEvent } from '../../services/dashboardService';

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarWidgetProps {
  filters?: DashboardFiltersState;
  onRefresh?: () => void;
  className?: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ filters, className }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    events,
    isLoading,
    isError
  } = useEnhancedCalendarEvents({
    month: currentMonth.getMonth(),
    year: currentMonth.getFullYear(),
    startDate: filters?.startDate || null,
    endDate: filters?.endDate || null
  });

  // Cache events for offline use
  useEffect(() => {
    if (events && events.length > 0) {
      dashboardService.cacheCalendarEvents(events);
    }
  }, [events]);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getEventForDay = (day: number) => {
    return events.find((event: CalendarEvent) => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const getEventTypeStyles = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'holiday':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const event = getEventForDay(day);
      const isToday =
        day === today.getDate() &&
        currentMonth.getMonth() === today.getMonth() &&
        currentMonth.getFullYear() === today.getFullYear();

      days.push(
        <motion.div
          key={day}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "h-10 flex flex-col justify-center items-center relative gap-0.5 transition-all cursor-pointer rounded-xl group",
            isToday 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/20" 
              : "hover:bg-indigo-50 dark:hover:bg-slate-800"
          )}
          tabIndex={0}
          role="gridcell"
        >
          <span className={cn(
            "text-xs font-bold",
            isToday ? "text-white" : "text-slate-700 dark:text-slate-300"
          )}>
            {day}
          </span>
          {event && (
            <div className={cn(
              "absolute bottom-1.5 w-1 h-1 rounded-full",
              isToday ? "bg-white" : "bg-indigo-500"
            )} />
          )}
        </motion.div>
      );
    }

    return days;
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 overflow-hidden", className)}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <CalendarIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Calendar</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all text-slate-600 dark:text-slate-400"
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all text-slate-600 dark:text-slate-400"
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 text-center">
        <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="h-8 bg-slate-50 dark:bg-slate-800 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(35).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Failed to load events</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-indigo-600 font-bold hover:underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {renderCalendarDays()}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Upcoming Events</h3>
              <Badge variant="outline" className="text-[9px] bg-indigo-50/50 border-indigo-100 text-indigo-600 font-bold px-1.5 py-0">
                {events.length} Total
              </Badge>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {events
                  .filter((event: CalendarEvent) => new Date(event.date) >= new Date())
                  .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 3)
                  .map((event: CalendarEvent, idx: number) => (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-md hover:shadow-indigo-500/5 group"
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        getEventTypeStyles(event.type)
                      )}>
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">
                          {new Date(event.date).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-xs font-black leading-none">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                            <Clock className="h-2.5 w-2.5" />
                            {(event as any).time || (event as any).start_time || 'All day'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                }
              </AnimatePresence>
              {events.filter((event: CalendarEvent) => new Date(event.date) >= new Date()).length === 0 && (
                <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 font-medium italic">No upcoming events scheduled</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarWidget;
