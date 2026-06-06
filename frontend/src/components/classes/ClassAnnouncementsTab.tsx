import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { announcementService, classService } from "../../services";
import { useAnnouncementWebSocket } from '../../services/announcementWebSocketService';

interface ClassAnnouncementsTabProps {
  classId: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  class_id?: number;
  teacher_id?: number | null; // Changed to accept null to match WebSocket type
  recipients?: string; // Make sure this is optional with ?
  created_at: string;
  updated_at: string;
  date?: string; // For display purposes
}

export function ClassAnnouncementsTab({ classId }: ClassAnnouncementsTabProps) {
  const queryClient = useQueryClient();
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    recipients: 'all',
    sendEmail: false
  });
  
  // Use the announcement WebSocket service
  const { isConnected: wsConnected, announcements: wsAnnouncements } = useAnnouncementWebSocket(classId);
  
  // Fetch announcements for selected class
  const { data: announcementsData, isLoading, isError, error } = useQuery<any, any>({
    queryKey: ['class-announcements', classId],
    queryFn: async () => {
      try {
        const res = await classService.getClassAnnouncements(classId);
        return res?.data || [];
      } catch (err) {
        console.error('Failed to fetch class announcements:', err);
        throw err;
      }
    },
    enabled: !!classId
  });
  
  // Combine data from API and WebSocket
  const combinedAnnouncements = useMemo(() => {
    if (!announcementsData) return wsAnnouncements;
    
    // Create a map of existing announcements from API
    const existingMap = new Map(announcementsData.map(a => [a.id, {
      ...a,
      date: new Date(a.created_at).toLocaleString()
    }]));
    
    // Add WebSocket announcements that aren't already in the API data
    wsAnnouncements.forEach(wsAnnouncement => {
      if (!existingMap.has(wsAnnouncement.id)) {
        existingMap.set(wsAnnouncement.id, {
          id: wsAnnouncement.id,
          title: wsAnnouncement.title,
          content: wsAnnouncement.content,
          class_id: wsAnnouncement.class_id,
          teacher_id: wsAnnouncement.teacher_id, // This is now compatible with number | null
          recipients: wsAnnouncement.recipients,
          created_at: wsAnnouncement.created_at,
          updated_at: wsAnnouncement.updated_at,
          date: new Date(wsAnnouncement.created_at).toLocaleString()
        });
      }
    });
    
    // Convert map back to array and sort by date (newest first)
    return Array.from(existingMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [announcementsData, wsAnnouncements]);
  
  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: (data: any) => announcementService.createClassAnnouncement(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-announcements', classId] });
      setIsAddingAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        recipients: 'all',
        sendEmail: false
      });
    }
  });
  
  // Handle announcement form input changes
  const handleAnnouncementInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle announcement select changes
  const handleAnnouncementSelectChange = (name: string, value: string) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: checked }));
  };
  
  // Submit announcement form
  const handleSubmitAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    createAnnouncementMutation.mutate(announcementForm);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddingAnnouncement(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading announcements...</div>
      ) : isError ? (
        <div className="text-center py-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 font-medium">
          {error?.status === 403 || error?.response?.status === 403
            ? "You do not have permission to view class announcements."
            : "Failed to load class announcements."}
        </div>
      ) : (
        <div className="space-y-4">
          {combinedAnnouncements.map((announcement: Announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <CardTitle className="text-lg">{announcement.title}</CardTitle>
                <CardDescription>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{announcement.date || new Date(announcement.created_at).toLocaleString()}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{announcement.content}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Sent to: {announcement.recipients === 'all' ? 'All students' : 
                           announcement.recipients === 'selected' ? 'Selected students' : 'Parents'}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Delete</Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isAddingAnnouncement} onOpenChange={setIsAddingAnnouncement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement for your class.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAnnouncement}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  name="title"
                  value={announcementForm.title}
                  onChange={handleAnnouncementInputChange}
                  placeholder="Enter announcement title" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  name="content"
                  value={announcementForm.content}
                  onChange={handleAnnouncementInputChange}
                  placeholder="Enter announcement content" 
                  rows={5} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select 
                  value={announcementForm.recipients}
                  onValueChange={(value) => handleAnnouncementSelectChange('recipients', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="selected">Selected Students</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sendEmail" 
                  checked={announcementForm.sendEmail}
                  onCheckedChange={(checked) => handleCheckboxChange('sendEmail', checked as boolean)}
                />
                <Label htmlFor="sendEmail">Also send as email</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddingAnnouncement(false)}>Cancel</Button>
              <Button type="submit">Post Announcement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}