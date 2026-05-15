import React, { useState, useEffect } from 'react';
import { Calendar, MiniCalendar, CalendarEvent as UICalendarEvent } from '../../components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/ui/use-toast';
import { 
  PlusCircle, 
  Download, 
  Filter, 
  Calendar as CalendarIcon,
  Users,
  BookOpen,
  Bell,
  Bookmark,
  Loader2
} from 'lucide-react';
import calendarService, { CalendarEvent as ApiCalendarEvent, CreateEventParams } from '../../services/calendarService';
import { log } from '../../utils/logger';


// Event categories for filtering
const eventCategories = [
  { id: 'all', name: 'All Events', color: 'bg-gray-500' },
  { id: 'class', name: 'Classes', color: 'bg-blue-500' },
  { id: 'meeting', name: 'Meetings', color: 'bg-green-500' },
  { id: 'holiday', name: 'Holidays', color: 'bg-purple-500' },
  { id: 'exam', name: 'Exams', color: 'bg-red-500' }
];

// Extended calendar event interface for UI display
interface ExtendedCalendarEvent {
  id: string | number;
  title: string;
  startTime?: string;
  endTime?: string;
  color: string;
  day: number;
  description?: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
  date?: string;
  type?: 'class' | 'exam' | 'meeting' | 'holiday';
}

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");
  
  // State for API data
  const [events, setEvents] = useState<ApiCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for shared events and dialogs
  const [showSharedEvents, setShowSharedEvents] = useState(true);
  const [sharedEvents, setSharedEvents] = useState<ApiCalendarEvent[]>([]);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<ExtendedCalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState<CreateEventParams>({
    title: "",
    date: new Date().toISOString().split('T')[0],
    type: "meeting",
    description: "",
    target_roles: ["teacher"],
    send_notification: true
  });
  const { toast } = useToast();

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const data = await calendarService.getEvents();
        setEvents(data);
        setError(null);
        // Cache events for offline use
        calendarService.cacheCalendarEvents(data);
      } catch (err) {
        setError('Failed to load calendar events');
        // Use cached events as fallback
        const cachedEvents = calendarService.getCachedCalendarEvents();
        if (cachedEvents.length > 0) {
          setEvents(cachedEvents);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);
  
  // Fetch shared events
  useEffect(() => {
    const fetchSharedEvents = async () => {
      if (!showSharedEvents) return;
      
      setIsLoadingShared(true);
      try {
        const data = await calendarService.getSharedEvents();
        setSharedEvents(data);
        // Cache events for offline use
        calendarService.cacheSharedCalendarEvents(data);
      } catch (err) {
        // Use cached events as fallback
        const cachedEvents = calendarService.getCachedSharedCalendarEvents();
        if (cachedEvents.length > 0) {
          setSharedEvents(cachedEvents);
        }
      } finally {
        setIsLoadingShared(false);
      }
    };

    fetchSharedEvents();
  }, [showSharedEvents]);

  // Convert API events to UI events
  const convertToUIEvents = (apiEvents: ApiCalendarEvent[]): UICalendarEvent[] => {
    if (!apiEvents || apiEvents.length === 0) return [];
    
    return apiEvents.map(event => {
      const eventDate = new Date(event.date);
      const day = eventDate.getDay(); // 0-6 (Sunday-Saturday)
      
      // Determine color based on event type
      let color = "bg-gray-500";
      switch (event.type) {
        case "class":
          color = "bg-blue-500";
          break;
        case "exam":
          color = "bg-red-500";
          break;
        case "meeting":
          color = "bg-green-500";
          break;
        case "holiday":
          color = "bg-purple-500";
          break;
      }
      
      return {
        id: Number(event.id), // Convert string id to number for UI component
        title: event.title,
        startTime: event.start_time || "09:00", // Use provided time or default
        endTime: event.end_time || "10:00", // Use provided time or default
        color,
        day,
        description: event.description,
        date: event.date,
        type: event.type,
        location: event.location
      };
    });
  };

  // Handle event click
  // Replace console.log with proper logging
  const handleEventClick = (event: any) => {
    log.debug('Event clicked', { eventId: event.id, title: event.title }, 'CalendarPage');
    // In a real app, you might show a modal with event details or navigate to an event details page
  };

  // Filter events based on selected category
  const filteredEvents = () => {
    let allEvents = convertToUIEvents(events);
    
    // Add shared events if enabled
    if (showSharedEvents) {
      const convertedSharedEvents = convertToUIEvents(sharedEvents);
      allEvents = [...allEvents, ...convertedSharedEvents];
    }
    
    if (selectedCategory === 'all') {
      return allEvents;
    }
    
    return allEvents.filter(event => event.type === selectedCategory);
  };

  // Handle adding a new event
  const handleAddEvent = () => {
    setShowEventDialog(true);
  };
  
  // Handle creating an event
  const handleCreateEvent = async () => {
    try {
      await calendarService.createEvent(newEvent);
      toast({
        title: "Event Created",
        description: "Calendar event has been created successfully.",
        variant: "default"
      });
      setShowEventDialog(false);
      // Refresh events
      const data = await calendarService.getEvents();
      setEvents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle updating an event
  const handleUpdateEvent = async () => {
    if (!currentEvent) return;
    
    try {
      await calendarService.updateEvent(String(currentEvent.id), {
        title: currentEvent.title,
        description: currentEvent.description,
        date: currentEvent.date || new Date().toISOString().split('T')[0],
        type: currentEvent.type || "meeting"
      });
      toast({
        title: "Event Updated",
        description: "Calendar event has been updated successfully.",
        variant: "default"
      });
      setCurrentEvent(null);
      // Refresh events
      const data = await calendarService.getEvents();
      setEvents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle deleting an event
  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    
    try {
      await calendarService.deleteEvent(String(currentEvent.id));
      toast({
        title: "Event Deleted",
        description: "Calendar event has been deleted successfully.",
        variant: "default"
      });
      setCurrentEvent(null);
      // Refresh events
      const data = await calendarService.getEvents();
      setEvents(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and view all school events and schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="flex items-center" onClick={handleAddEvent}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="events">Event List</TabsTrigger>
          <TabsTrigger value="schedule">Academic Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mini Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniCalendar 
                    currentDate={currentDate} 
                    onDateChange={setCurrentDate} 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Event Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {eventCategories.map(category => (
                    <div 
                      key={category.id}
                      className={`flex items-center p-2 rounded-md cursor-pointer ${
                        selectedCategory === category.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div className={`w-3 h-3 rounded-full ${category.color} mr-2`}></div>
                      <span>{category.name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                  ) : filteredEvents().slice(0, 3).map(event => (
                    <div key={event.id} className="flex items-start">
                      <div className={`${event.color} p-2 rounded-md mr-3 flex-shrink-0`}>
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][event.day]}, {event.startTime} - {event.endTime}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Calendar */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Calendar</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={calendarView} onValueChange={(value: "day" | "week" | "month") => setCalendarView(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="View" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="h-[700px] flex justify-center items-center">
                      <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
                    </div>
                  ) : (
                    <div className="h-[700px]">
                      <Calendar 
                        events={filteredEvents()} 
                        onEventClick={handleEventClick}
                        initialView={calendarView}
                        initialDate={currentDate}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>All Events</CardTitle>
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Search events..." 
                  className="w-[250px]" 
                />
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents().map(event => (
                    <Card key={event.id} className="overflow-hidden">
                      <div className={`${event.color} h-1 w-full`}></div>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-medium">{event.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][event.day]}, {event.startTime} - {event.endTime}
                            </p>
                          </div>
                          <div className="flex items-center mt-2 md:mt-0">
                            <Badge variant="outline" className="mr-2">
                              {event.location || event.type}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Schedule</CardTitle>
              <CardDescription>View and manage academic schedules and timetables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Academic schedule view would be implemented here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarPage;
