import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { studentService } from '../../services/studentService';

const StudentCalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getCalendarEvents(currentDate.getMonth(), currentDate.getFullYear());
      setEvents(data);
    } catch (error) {
      console.error('Error fetching calendar events', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = new Intl.DateTimeFormat(i18n.language === 'ee' ? 'en' : i18n.language, { month: 'long', year: 'numeric' }).format(currentDate);

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'exam':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'holiday':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'extracurricular':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('calendar.student_title', 'Academic Calendar')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('calendar.student_subtitle', 'Read-only institutional tracking')}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" /> {monthName}</CardTitle>
            <CardDescription>{t('calendar.student_subtitle', 'Read-only institutional tracking')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2 border rounded hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNextMonth} className="p-2 border rounded hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500 py-4">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">No events for this month.</div>
          ) : (
            <div className="space-y-3">
              {events.map((e) => {
                const eventDate = new Date(e.date);
                const dayName = new Intl.DateTimeFormat(i18n.language === 'ee' ? 'en' : i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }).format(eventDate);
                
                return (
                  <div key={e.id} className={`rounded-lg border p-3 ${getTypeColor(e.type)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{e.title}</div>
                        <div className="text-xs mt-1 opacity-80">{dayName}{e.location ? ` • ${e.location}` : ''}</div>
                      </div>
                      {e.type && (
                        <div className="text-xs uppercase font-bold tracking-wider opacity-70">
                          {String(t(`calendar.categories.${e.type}`, e.type))}
                        </div>
                      )}
                    </div>
                    {e.description && <div className="text-sm mt-2 opacity-90">{e.description}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentCalendarPage;

