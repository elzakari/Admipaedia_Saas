import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
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
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { 
  Megaphone, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Users,
  Mail,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import announcementService, { Announcement as ApiAnnouncement } from '../../services/announcementService';

type AnnouncementStatus = 'Active' | 'Scheduled' | 'Archived';

const toDateOnly = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const computeStatus = (a: ApiAnnouncement): AnnouncementStatus => {
  const now = new Date();
  const scheduled = a.scheduled_date || a.publish_date;
  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime()) && d > now && !a.is_published) return 'Scheduled';
  }
  if (a.expiry_date) {
    const d = new Date(a.expiry_date);
    if (!Number.isNaN(d.getTime()) && d < now) return 'Archived';
  }
  return 'Active';
};

const formatAudience = (a: ApiAnnouncement): string => {
  const raw = (a.target_audience || a.recipients || 'all').toString().toLowerCase();
  if (raw === 'all') return 'All';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const formatPriority = (a: ApiAnnouncement): 'High' | 'Medium' | 'Low' => {
  const raw = (a.priority || 'medium').toString().toLowerCase();
  if (raw === 'high' || raw === 'urgent') return 'High';
  if (raw === 'low') return 'Low';
  return 'Medium';
};

const Announcements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<ApiAnnouncement | null>(null);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-announcements', 'list'],
    queryFn: () => announcementService.getAnnouncements({ page: 1, per_page: 50 }),
    staleTime: 60_000
  });

  const announcements = data?.announcements || [];
  const filteredAnnouncements = announcements.filter((announcement) => {
    const status = computeStatus(announcement);
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return status === 'Active';
    if (activeTab === 'scheduled') return status === 'Scheduled';
    if (activeTab === 'archived') return status === 'Archived';
    return true;
  });

  const stats = announcements.reduce(
    (acc, a) => {
      const s = computeStatus(a);
      acc.total += 1;
      if (s === 'Active') acc.active += 1;
      if (s === 'Scheduled') acc.scheduled += 1;
      if (s === 'Archived') acc.archived += 1;
      return acc;
    },
    { total: 0, active: 0, scheduled: 0, archived: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">School Announcements</h3>
        <Button
          className="glass-button"
          onClick={() => {
            toast({ title: 'Open announcements', description: 'Use Announcements page for full management.' });
            navigate('/announcements');
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Announcement
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Announcements</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Loading announcements...
              </CardContent>
            </Card>
          )}
          {isError && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-red-600">
                Failed to load announcements.
              </CardContent>
            </Card>
          )}
          {selectedAnnouncement ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedAnnouncement.title}</CardTitle>
                    <CardDescription>
                      Posted by {selectedAnnouncement.author_name || '—'} on {toDateOnly(selectedAnnouncement.publish_date || selectedAnnouncement.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={
                      formatPriority(selectedAnnouncement) === 'High' ? 'destructive' :
                      formatPriority(selectedAnnouncement) === 'Medium' ? 'warning' :
                      'secondary'
                    }>
                      {formatPriority(selectedAnnouncement)}
                    </Badge>
                    <Badge variant={
                      computeStatus(selectedAnnouncement) === 'Active' ? 'success' :
                      computeStatus(selectedAnnouncement) === 'Scheduled' ? 'warning' :
                      'secondary'
                    }>
                      {computeStatus(selectedAnnouncement)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="whitespace-pre-line">{selectedAnnouncement.content}</p>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500">Audience: {formatAudience(selectedAnnouncement)}</span>
                  </div>
                  
                  {computeStatus(selectedAnnouncement) === 'Scheduled' && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500">Scheduled for: {toDateOnly(selectedAnnouncement.scheduled_date || selectedAnnouncement.publish_date)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setSelectedAnnouncement(null)}>
                  Back to List
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({ title: 'Open announcements', description: 'Use Announcements page for editing.' });
                      navigate('/announcements');
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      toast({ title: 'Delete not available here', description: 'Use Announcements page to delete.' });
                      navigate('/announcements');
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell>{toDateOnly(announcement.publish_date || announcement.created_at)}</TableCell>
                        <TableCell>{announcement.author_name || '—'}</TableCell>
                        <TableCell>{formatAudience(announcement)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            formatPriority(announcement) === 'High' ? 'destructive' :
                            formatPriority(announcement) === 'Medium' ? 'warning' :
                            'secondary'
                          }>
                            {formatPriority(announcement)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            computeStatus(announcement) === 'Active' ? 'success' :
                            computeStatus(announcement) === 'Scheduled' ? 'warning' :
                            'secondary'
                          }>
                            {computeStatus(announcement)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedAnnouncement(announcement)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                toast({ title: 'Open announcements', description: 'Use Announcements page for editing.' });
                                navigate('/announcements');
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                toast({ title: 'Delete not available here', description: 'Use Announcements page to delete.' });
                                navigate('/announcements');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !isError && filteredAnnouncements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No announcements found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Communication Channels</CardTitle>
            <CardDescription>Manage announcement distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-blue-500" />
                  <div>
                    <h4 className="font-medium">App Notifications</h4>
                    <p className="text-sm text-gray-500">Push notifications to app users</p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-amber-500" />
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Send emails to recipients</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                  />
                  <span className={emailNotificationsEnabled ? "text-sm text-green-600" : "text-sm text-gray-500"}>
                    {emailNotificationsEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-gray-500">Send text messages</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2" 
                    checked={smsNotificationsEnabled}
                    onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
                  />
                  <span className={smsNotificationsEnabled ? "text-sm text-green-600" : "text-sm text-gray-500"}>
                    {smsNotificationsEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Announcement Templates</CardTitle>
            <CardDescription>Pre-defined announcement formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Manage templates and reusable formats in the main Announcements module.
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({ title: 'Open announcements', description: 'Templates are managed in Announcements page.' });
                navigate('/announcements');
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Template
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Announcement Statistics</CardTitle>
            <CardDescription>Engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Announcements</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active</span>
                <span className="font-medium">{stats.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Scheduled</span>
                <span className="font-medium">{stats.scheduled}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Archived</span>
                <span className="font-medium">{stats.archived}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Announcements;
