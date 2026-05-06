import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

const events = [
  { id: 1, title: 'Math Test - Grade 10', date: '2025-03-15', time: '09:00 AM', type: 'exam' },
  { id: 2, title: 'Parent-Teacher Meeting', date: '2025-03-16', time: '02:00 PM', type: 'meeting' },
  { id: 3, title: 'Science Fair', date: '2025-03-18', time: '10:00 AM', type: 'event' },
];

export function CalendarPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
      
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-900">March 2025</h2>
            {/* Calendar grid placeholder */}
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i + 1}
                  className={`p-2 text-sm ${
                    i + 1 === 15 ? 'bg-indigo-100 text-indigo-700 rounded-full' : ''
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Events</h3>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-500">{event.date} at {event.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}