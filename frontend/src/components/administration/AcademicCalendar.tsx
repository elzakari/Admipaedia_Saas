import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "../../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Download,
  Clock,
  Award,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import calendarService, { AcademicTerm, CalendarEvent, CreateEventParams } from '../../services/calendarService';

const examAPI = {
  getExams: async (params?: { page?: number; per_page?: number; date_from?: string; date_to?: string; status?: string }) => {
    const { data } = await api.get('/exams', { params });
    return data?.exams || data?.data?.exams || [];
  },

  getUpcomingExams: async (params?: { class_id?: number; days?: number }) => {
    const { data } = await api.get('/exams/upcoming', { params });
    return data?.exams || data?.data?.exams || [];
  },

  createExam: async (examData: any) => {
    const { data } = await api.post('/exams', examData);
    return data;
  }
};

const AcademicCalendar = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('terms');
  const queryClient = useQueryClient();

  type CalendarEventDraft = {
    id?: string;
    title?: string;
    date?: string;
    type?: CreateEventParams['type'];
    description?: string;
    location?: string;
    start_time?: string;
    end_time?: string;
  };

  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<{ id: number; name: string; startDate: string; endDate: string; status: string } | null>(null);

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDraft | null>(null);
  
  // Get current year date range for filtering
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  
  // Fetch calendar events
  const { data: eventsResponse, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['calendar-events', startDate, endDate],
    queryFn: () => calendarService.getEvents({ start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const events: CalendarEvent[] = Array.isArray(eventsResponse) ? eventsResponse : [];
  
  // Fetch exams
  const { data: exams = [], isLoading: examsLoading, error: examsError } = useQuery({
    queryKey: ['exams', startDate, endDate],
    queryFn: () => examAPI.getExams({ date_from: startDate, date_to: endDate, per_page: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch upcoming exams
  const { data: upcomingExams = [] } = useQuery({
    queryKey: ['upcoming-exams'],
    queryFn: () => examAPI.getUpcomingExams({ days: 30 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: termsResponse, isLoading: termsLoading, error: termsError } = useQuery({
    queryKey: ['calendar-terms'],
    queryFn: () => calendarService.getTerms(),
    staleTime: 5 * 60 * 1000,
  });

  const terms: AcademicTerm[] = Array.isArray(termsResponse) ? termsResponse : [];
  
  const termStatus = useMemo(() => {
    return (startDate: string, endDate: string) => {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Upcoming';
      if (now < start) return 'Upcoming';
      if (now > end) return 'Completed';
      return 'Current';
    };
  }, []);

  const termsWithStatus = useMemo(() => {
    return terms.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.start_date,
      endDate: t.end_date,
      status: t.status || termStatus(t.start_date, t.end_date)
    }));
  }, [termStatus, terms]);

  const exportCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      const needs = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needs ? `"${escaped}"` : escaped;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Mutations for CRUD operations
  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventParams) => calendarService.createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event created successfully');
    },
    onError: () => {
      toast.error('Failed to create event');
    }
  });
  
  const updateEventMutation = useMutation<any, Error, { eventId: string; updates: Partial<CreateEventParams> }>({
    mutationFn: async ({ eventId, updates }) => {
      return calendarService.updateEvent(eventId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event updated successfully');
    },
    onError: () => {
      toast.error('Failed to update event');
    }
  });
  
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => calendarService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete event');
    }
  });
  
  const createExamMutation = useMutation({
    mutationFn: examAPI.createExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-exams'] });
      toast.success('Exam created successfully');
    },
    onError: () => {
      toast.error('Failed to create exam');
    }
  });

  const createTermMutation = useMutation({
    mutationFn: (payload: { name: string; start_date: string; end_date: string }) => calendarService.createTerm(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-terms'] });
      toast.success('Term saved successfully');
    },
    onError: () => {
      toast.error('Failed to save term');
    }
  });

  const updateTermMutation = useMutation({
    mutationFn: ({ termId, updates }: { termId: number; updates: Partial<{ name: string; start_date: string; end_date: string }> }) =>
      calendarService.updateTerm(termId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-terms'] });
      toast.success('Term updated successfully');
    },
    onError: () => {
      toast.error('Failed to update term');
    }
  });

  const deleteTermMutation = useMutation({
    mutationFn: (termId: number) => calendarService.deleteTerm(termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-terms'] });
      toast.success('Term deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete term');
    }
  });
  
  // Helper functions
  const getCategoryBadgeVariant = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'class': return 'default';
      case 'holiday': return 'success';
      case 'exam': return 'destructive';
      case 'meeting': return 'warning';
      default: return 'secondary';
    }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'current': return 'success';
      case 'completed': return 'default';
      case 'upcoming': return 'secondary';
      default: return 'secondary';
    }
  };
  
  const calculateDaysRemaining = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      const diffTime = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Starts in ${diffDays} days`;
    } else if (now >= start && now <= end) {
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days remaining`;
    } else {
      return 'Completed';
    }
  };

  const calendarAgenda = useMemo(() => {
    const monthStart = new Date(currentYear, new Date().getMonth(), 1);
    const monthEnd = new Date(currentYear, new Date().getMonth() + 1, 0, 23, 59, 59);

    const eventItems = events
      .filter((event: any) => {
        const date = new Date(event.date);
        return date >= monthStart && date <= monthEnd;
      })
      .map((event: any) => ({
        id: `event-${event.id}`,
        kind: 'event' as const,
        title: event.title,
        date: event.date,
        type: event.type,
        description: event.description,
        location: event.location,
        time: [event.start_time, event.end_time].filter(Boolean).join(' - ')
      }));

    const examItems = exams
      .filter((exam: any) => {
        const rawDate = exam.start_date || exam.date;
        if (!rawDate) return false;
        const date = new Date(rawDate);
        return date >= monthStart && date <= monthEnd;
      })
      .map((exam: any) => ({
        id: `exam-${exam.id}`,
        kind: 'exam' as const,
        title: exam.name || exam.subject?.name || 'Exam',
        date: exam.start_date || exam.date,
        type: 'exam',
        description: exam.subject?.name || exam.description || '',
        location: exam.class_name || exam.class?.name || '',
        time: exam.start_time || ''
      }));

    return [...eventItems, ...examItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currentYear, events, exams]);
  
  // Loading and error states
  if (eventsLoading || examsLoading || termsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading academic calendar...</span>
      </div>
    );
  }
  
  if (eventsError || examsError || termsError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading calendar data. Please try again.</p>
        <Button 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['exams'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-terms'] });
          }}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="terms">Academic Terms</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="exams">Exam Schedule ({exams.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="terms" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Academic Terms</h3>
            <Button
              onClick={() => {
                setEditingTerm(null);
                setTermDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Term
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {termsWithStatus.map((term) => (
              <Card key={term.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{term.name}</CardTitle>
                      <CardDescription>
                        {term.startDate} to {term.endDate}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(term.status)}>
                      {term.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500">
                        {calculateDaysRemaining(term.startDate, term.endDate)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTerm(term);
                          setTermDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!confirm('Delete this term?')) return;
                          deleteTermMutation.mutate(term.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTerm ? 'Edit term' : 'Add term'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    className="bg-white"
                    value={editingTerm?.name ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingTerm((prev) => (prev ? { ...prev, name: v } : { id: -1, name: v, startDate: '', endDate: '', status: 'Upcoming' }));
                    }}
                    placeholder="Term 1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      className="bg-white"
                      value={editingTerm?.startDate ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditingTerm((prev) => (prev ? { ...prev, startDate: v } : { id: -1, name: '', startDate: v, endDate: '', status: 'Upcoming' }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input
                      type="date"
                      className="bg-white"
                      value={editingTerm?.endDate ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditingTerm((prev) => (prev ? { ...prev, endDate: v } : { id: -1, name: '', startDate: '', endDate: v, status: 'Upcoming' }));
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setTermDialogOpen(false)}>Cancel</Button>
                <Button
                  className="glass-button"
                  onClick={() => {
                    const draft = editingTerm || { id: -1, name: '', startDate: '', endDate: '', status: 'Upcoming' };
                    const name = (draft.name || '').trim();
                    if (!name || !draft.startDate || !draft.endDate) return;
                    if (draft.id === -1) {
                      createTermMutation.mutate({ name, start_date: draft.startDate, end_date: draft.endDate });
                    } else {
                      updateTermMutation.mutate({ termId: draft.id, updates: { name, start_date: draft.startDate, end_date: draft.endDate } });
                    }
                    setTermDialogOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Academic Events</h3>
              <p className="text-sm text-gray-500">
                {events.length} events scheduled for {currentYear}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv(`events_${currentYear}.csv`, events.map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    date: e.date,
                    type: e.type,
                    description: e.description || ''
                  })));
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Events
              </Button>
              <Button 
                onClick={() => {
                  setEditingEvent(null);
                  setEventDialogOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No events scheduled. Create your first event to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={getCategoryBadgeVariant(event.type)}>
                            {event.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.description || 'No description'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingEvent(event);
                                setEventDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this event?')) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                              disabled={deleteEventMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit event' : 'Add event'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    className="bg-white"
                    value={editingEvent?.title ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingEvent((prev) => ({ ...(prev || {}), title: v }));
                    }}
                    placeholder="PTA meeting"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      className="bg-white"
                      value={(editingEvent?.date || '').slice(0, 10)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditingEvent((prev) => ({ ...(prev || {}), date: v }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editingEvent?.type ?? 'class'}
                      onValueChange={(v) => setEditingEvent((prev) => ({ ...(prev || {}), type: v as CreateEventParams['type'] }))}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class">class</SelectItem>
                        <SelectItem value="holiday">holiday</SelectItem>
                        <SelectItem value="exam">exam</SelectItem>
                        <SelectItem value="meeting">meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingEvent?.description ?? ''}
                    onChange={(e) => setEditingEvent((prev) => ({ ...(prev || {}), description: e.target.value }))}
                    rows={3}
                    placeholder="Optional details"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      className="bg-white"
                      value={editingEvent?.location ?? ''}
                      onChange={(e) => setEditingEvent((prev) => ({ ...(prev || {}), location: e.target.value }))}
                      placeholder="Assembly hall"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <Input
                        type="time"
                        className="bg-white"
                        value={editingEvent?.start_time ?? ''}
                        onChange={(e) => setEditingEvent((prev) => ({ ...(prev || {}), start_time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End time</Label>
                      <Input
                        type="time"
                        className="bg-white"
                        value={editingEvent?.end_time ?? ''}
                        onChange={(e) => setEditingEvent((prev) => ({ ...(prev || {}), end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  onClick={() => {
                    const title = String(editingEvent?.title || '').trim();
                    const date = String(editingEvent?.date || '').trim();
                    const type = (editingEvent?.type || 'class') as CreateEventParams['type'];
                    if (!title || !date || !type) return;

                    if (editingEvent?.id) {
                      updateEventMutation.mutate({
                        eventId: editingEvent.id,
                        updates: {
                          title,
                          date,
                          type,
                          description: editingEvent?.description || '',
                          location: editingEvent?.location || '',
                          start_time: editingEvent?.start_time || '',
                          end_time: editingEvent?.end_time || ''
                        }
                      });
                    } else {
                      createEventMutation.mutate({
                        title,
                        date,
                        type,
                        description: editingEvent?.description || '',
                        location: editingEvent?.location || '',
                        start_time: editingEvent?.start_time || '',
                        end_time: editingEvent?.end_time || ''
                      });
                    }
                    setEventDialogOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="exams" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Examination Schedule</h3>
              <p className="text-sm text-gray-500">
                {exams.length} exams scheduled • {upcomingExams.length} upcoming
              </p>
            </div>
            <Button 
              onClick={() => {
                navigate('/exams');
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Exam Period
            </Button>
          </div>
          
          {upcomingExams.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Upcoming Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingExams.slice(0, 3).map((exam: any) => (
                    <div key={exam.id} className="flex justify-between items-center">
                      <span className="font-medium">{exam.name}</span>
                      <span className="text-sm text-amber-700">
                        {new Date(exam.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No exams scheduled. Create your first exam to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exams.map((exam: any) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell>{new Date(exam.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(exam.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>{exam.subject?.name || 'All Subjects'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            exam.status === 'completed' ? 'default' :
                            exam.status === 'ongoing' ? 'success' :
                            'secondary'
                          }>
                            {exam.status || 'Scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Calendar View</h3>
              <p className="text-sm text-gray-500">
                Visual calendar with all events and exams
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv(`calendar_${currentYear}.csv`, [
                    ...events.map((e: any) => ({ kind: 'event', id: e.id, title: e.title, date: e.date, type: e.type })),
                    ...exams.map((x: any) => ({ kind: 'exam', id: x.id, title: x.name || x.subject || 'Exam', date: x.start_date || x.date, type: 'exam' }))
                  ]);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Calendar
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-blue-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-blue-700">This Month Events</div>
                    <div className="mt-2 text-2xl font-bold text-blue-900">
                      {calendarAgenda.filter((item) => item.kind === 'event').length}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-red-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-red-700">This Month Exams</div>
                    <div className="mt-2 text-2xl font-bold text-red-900">
                      {calendarAgenda.filter((item) => item.kind === 'exam').length}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-emerald-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Upcoming Items</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-900">{calendarAgenda.length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {calendarAgenda.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
                      No calendar items scheduled for the current month yet.
                    </div>
                  ) : (
                    calendarAgenda.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{item.title}</span>
                              <Badge variant={getCategoryBadgeVariant(item.type)}>{item.type}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {new Date(item.date).toLocaleDateString()}
                              {item.time ? ` • ${item.time}` : ''}
                              {item.location ? ` • ${item.location}` : ''}
                            </div>
                            {item.description && (
                              <div className="mt-2 text-sm text-slate-600">{item.description}</div>
                            )}
                          </div>
                          <CalendarIcon className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span className="text-sm">Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span className="text-sm">Holiday</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span className="text-sm">Exam</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
              <span className="text-sm">Meeting</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicCalendar;
