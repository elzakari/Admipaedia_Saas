import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

export interface CalendarEvent {
  type: string;
  date: string;
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  day: number;
  description?: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
}

interface CalendarProps {
  events?: CalendarEvent[];
  className?: string;
  onEventClick?: (event: CalendarEvent) => void;
  initialView?: "day" | "week" | "month";
  initialDate?: Date;
}

export function Calendar({
  events = [],
  className = "",
  onEventClick,
  initialView = "week",
  initialDate = new Date()
}: CalendarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Week days and dates
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const [weekDates, setWeekDates] = useState<number[]>([]);
  
  // Time slots (8 AM to 4 PM)
  const timeSlots = Array.from({ length: 9 }, (_, i) => i + 8);
  
  // Mini calendar data
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [firstDayOffset, setFirstDayOffset] = useState(0);
  const [miniCalendarDays, setMiniCalendarDays] = useState<(number | null)[]>([]);

  useEffect(() => {
    setIsLoaded(true);
    updateCalendarData(currentDate);
  }, [currentDate]);

  const updateCalendarData = (date: Date) => {
    // Format current month and date
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    setCurrentMonth(`${month} ${year}`);
    setCurrentDateStr(`${month} ${date.getDate()}`);
    
    // Calculate week dates
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d.getDate();
    });
    setWeekDates(dates);
    
    // Calculate mini calendar data
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    setDaysInMonth(lastDay);
    
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    setFirstDayOffset(firstDay.getDay());
    
    const calendarDays = Array.from(
      { length: lastDay + firstDay.getDay() },
      (_, i) => (i < firstDay.getDay() ? null : i - firstDay.getDay() + 1)
    );
    setMiniCalendarDays(calendarDays);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === "day") {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (currentView === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === "day") {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (currentView === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper function to calculate event position and height
  const calculateEventStyle = (startTime: string, endTime: string) => {
    const start = Number.parseInt(startTime.split(":")[0]) + Number.parseInt(startTime.split(":")[1]) / 60;
    const end = Number.parseInt(endTime.split(":")[0]) + Number.parseInt(endTime.split(":")[1]) / 60;
    const top = (start - 8) * 80; // 80px per hour
    const height = (end - start) * 80;
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Calendar Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
            onClick={handleToday}
          >
            Today
          </button>
          <div className="flex">
            <button 
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{currentDateStr}</h2>
        </div>

        <div className="flex items-center gap-2 rounded-md p-1 bg-gray-100 dark:bg-gray-800">
          <button
            onClick={() => setCurrentView("day")}
            className={`px-3 py-1 rounded ${
              currentView === "day" ? "bg-white dark:bg-gray-700 shadow" : ""
            } text-gray-700 dark:text-gray-300 text-sm`}
          >
            Day
          </button>
          <button
            onClick={() => setCurrentView("week")}
            className={`px-3 py-1 rounded ${
              currentView === "week" ? "bg-white dark:bg-gray-700 shadow" : ""
            } text-gray-700 dark:text-gray-300 text-sm`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView("month")}
            className={`px-3 py-1 rounded ${
              currentView === "month" ? "bg-white dark:bg-gray-700 shadow" : ""
            } text-gray-700 dark:text-gray-300 text-sm`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md h-full">
          {currentView === "week" && (
            <>
              {/* Week Header */}
              <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-xs"></div>
                {weekDays.map((day, i) => (
                  <div key={i} className="p-2 text-center border-l border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{day}</div>
                    <div
                      className={`text-lg font-medium mt-1 text-gray-900 dark:text-gray-100 ${
                        weekDates[i] === new Date().getDate() &&
                        currentDate.getMonth() === new Date().getMonth() &&
                        currentDate.getFullYear() === new Date().getFullYear()
                          ? "bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                          : ""
                      }`}
                    >
                      {weekDates[i]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-8">
                {/* Time Labels */}
                <div className="text-gray-500 dark:text-gray-400">
                  {timeSlots.map((time, i) => (
                    <div key={i} className="h-20 border-b border-gray-200 dark:border-gray-700 pr-2 text-right text-xs">
                      {time > 12 ? `${time - 12} PM` : `${time} AM`}
                    </div>
                  ))}
                </div>

                {/* Days Columns */}
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div key={dayIndex} className="border-l border-gray-200 dark:border-gray-700 relative">
                    {timeSlots.map((_, timeIndex) => (
                      <div key={timeIndex} className="h-20 border-b border-gray-200 dark:border-gray-700"></div>
                    ))}

                    {/* Events */}
                    {events
                      .filter((event) => event.day === dayIndex + 1)
                      .map((event, i) => {
                        const eventStyle = calculateEventStyle(event.startTime, event.endTime);
                        return (
                          <div
                            key={i}
                            className={`absolute ${event.color} rounded-md p-2 text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg`}
                            style={{
                              ...eventStyle,
                              left: "4px",
                              right: "4px",
                            }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="opacity-80 text-[10px] mt-1">{`${event.startTime} - ${event.endTime}`}</div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </>
          )}

          {currentView === "day" && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Day view implementation would go here
            </div>
          )}

          {currentView === "month" && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Month view implementation would go here
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${selectedEvent.color} p-6 rounded-lg shadow-xl max-w-md w-full mx-4 relative`}>
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-2xl font-bold mb-4 text-white">{selectedEvent.title}</h3>
            <div className="space-y-3 text-white">
              <p className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {`${selectedEvent.startTime} - ${selectedEvent.endTime}`}
              </p>
              {selectedEvent.location && (
                <p className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {selectedEvent.location}
                </p>
              )}
              <p className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                {`${weekDays[selectedEvent.day - 1]}, ${weekDates[selectedEvent.day - 1]} ${currentMonth}`}
              </p>
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <p className="flex items-start">
                  <Users className="mr-2 h-5 w-5 mt-1" />
                  <span>
                    <strong>Attendees:</strong>
                    <br />
                    {selectedEvent.attendees.join(", ") || "No attendees"}
                  </span>
                </p>
              )}
              {selectedEvent.organizer && (
                <p>
                  <strong>Organizer:</strong> {selectedEvent.organizer}
                </p>
              )}
              {selectedEvent.description && (
                <p>
                  <strong>Description:</strong> {selectedEvent.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini calendar component that can be used separately
export function MiniCalendar({
  currentDate = new Date(),
  onDateChange,
  className = ""
}: {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
}) {
  const [month, setMonth] = useState("");
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [firstDayOffset, setFirstDayOffset] = useState(0);
  const [calendarDays, setCalendarDays] = useState<(number | null)[]>([]);
  
  useEffect(() => {
    updateCalendarData(currentDate);
  }, [currentDate]);
  
  const updateCalendarData = (date: Date) => {
    // Format current month
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    setMonth(`${monthNames[date.getMonth()]} ${date.getFullYear()}`);
    
    // Calculate mini calendar data
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    setDaysInMonth(lastDay);
    
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    setFirstDayOffset(firstDay.getDay());
    
    const days = Array.from(
      { length: lastDay + firstDay.getDay() },
      (_, i) => (i < firstDay.getDay() ? null : i - firstDay.getDay() + 1)
    );
    setCalendarDays(days);
  };
  
  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  
  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  
  const handleDateClick = (day: number) => {
    if (!day) return;
    
    const newDate = new Date(currentDate);
    newDate.setDate(day);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 dark:text-gray-100 font-medium">{month}</h3>
        <div className="flex gap-1">
          <button 
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-xs text-gray-500 dark:text-gray-400 font-medium py-1">
            {day}
          </div>
        ))}

        {calendarDays.map((day, i) => (
          <div
            key={i}
            className={`text-xs rounded-full w-7 h-7 flex items-center justify-center ${
              day === currentDate.getDate() 
                ? "bg-blue-500 text-white" 
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            } ${!day ? "invisible" : ""}`}
            onClick={() => day && handleDateClick(day)}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}