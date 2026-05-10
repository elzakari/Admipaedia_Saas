import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import parentService from '../../services/parentService';
import {
  FilePlus2,
  Users,
  CreditCard,
  Calendar,
  Bell,
  MessageSquare,
  CalendarDays
} from 'lucide-react';

const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => parentService.getMyDashboard(),
    staleTime: 30_000
  })

  const navigateTo = (to: string) => {
    navigate(to);
  };

  const cardKeyDown = (to: string) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateTo(to);
    }
  };

  const shortcuts = [
    { label: 'My Children', to: '/parent-portal', icon: <Users className="h-4 w-4" /> },
    { label: 'Admissions', to: '/admissions', icon: <FilePlus2 className="h-4 w-4" /> },
    { label: 'Messages', to: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
    { label: 'Notifications', to: '/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'Schedule', to: '/schedule', icon: <Calendar className="h-4 w-4" /> }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Parent Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admissions')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Buy Admission Form
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {shortcuts.map((s) => (
          <Button
            key={s.to}
            variant="outline"
            className="rounded-xl"
            onClick={() => navigateTo(s.to)}
          >
            <span className="mr-2">{s.icon}</span>
            {s.label}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          role="button"
          tabIndex={0}
          onClick={() => navigateTo('/parent-portal')}
          onKeyDown={cardKeyDown('/parent-portal')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '—' : (data?.children_count ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          role="button"
          tabIndex={0}
          onClick={() => navigateTo('/admissions')}
          onKeyDown={cardKeyDown('/admissions')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <FilePlus2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '—' : (data?.active_applications ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Admission in progress</p>
          </CardContent>
        </Card>
        
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          role="button"
          tabIndex={0}
          onClick={() => navigateTo('/parent-portal?tab=fees')}
          onKeyDown={cardKeyDown('/parent-portal?tab=fees')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '—' : `GHS ${(data?.pending_fees_total ?? 0).toLocaleString()}`}</div>
            <p className="text-xs text-muted-foreground">Term 2 balance</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          role="button"
          tabIndex={0}
          onClick={() => navigateTo('/calendar')}
          onKeyDown={cardKeyDown('/calendar')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Event</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{isLoading ? '—' : (data?.next_event?.title || 'No upcoming event')}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? ''
                : (data?.next_event?.date ? new Date(data.next_event.date).toLocaleDateString() : '')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (data?.recent_notifications?.length ? (
                data.recent_notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 cursor-pointer"
                    onClick={() => navigateTo('/notifications')}
                  >
                    <div>
                      <p className="font-semibold text-sm">{notif.title}</p>
                      <p className="text-xs text-gray-500">{notif.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {notif.time ? new Date(notif.time).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No notifications</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Children's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Overall Attendance (30d)</span>
                <span className="font-semibold">{isLoading ? '—' : `${data?.overall_attendance_rate ?? 0}%`}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Overall Grade Average</span>
                <span className="font-semibold">{isLoading ? '—' : `${data?.overall_grade_average ?? 0}%`}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
