import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
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
            <div className="text-2xl font-bold">2</div>
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
            <div className="text-2xl font-bold">1</div>
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
            <div className="text-2xl font-bold">GHS 1,200</div>
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
            <div className="text-lg font-bold">PTA Meeting</div>
            <p className="text-xs text-muted-foreground">Friday, April 15th</p>
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
              {[
                { title: 'Fee Reminder', desc: 'Term 2 fees are due by April 30th', time: '2 hours ago' },
                { title: 'Academic Report', desc: 'Karen\'s First Term report card is now available', time: '1 day ago' },
                { title: 'School Holiday', desc: 'School will be closed on Friday for Easter', time: '2 days ago' }
              ].map((notif, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 cursor-pointer"
                  onClick={() => navigateTo('/notifications')}
                >
                  <div>
                    <p className="font-semibold text-sm">{notif.title}</p>
                    <p className="text-xs text-gray-500">{notif.desc}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{notif.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Children's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg">
              <p className="text-sm text-gray-400">Performance Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
