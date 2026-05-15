import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Lock,
  Download,
  Loader2,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger';
import { userService } from '@/services';
import type { UserCreate } from '@/services/userService';

// Local interface extending service type for UI display
interface DisplayUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive'; // UI specific status string
  created_at?: string;
  last_login?: string;
}

interface DisplayAuditLog {
  id: number;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

// API functions replaced by userService

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('users');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUserAuditLogs, setSelectedUserAuditLogs] = useState<DisplayAuditLog[]>([]);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [newUserData, setNewUserData] = useState<UserCreate>({
    username: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<DisplayUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userService.getUsers({ per_page: 100 });
      // Map API user to DisplayUser
      return (response.data || []).map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.is_active ? ('Active' as const) : ('Inactive' as const),
        created_at: u.created_at,
        last_login: u.last_login
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<DisplayAuditLog[]>({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const response = await userService.getAuditLogs({ per_page: 50 });
      return (response.data || []).map(log => ({
        id: log.id,
        user: log.user_name || `User ${log.user_id}`,
        action: log.event_type.replace(/_/g, ' '),
        details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
        timestamp: log.created_at,
        ipAddress: log.ip_address
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserCreate) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateDialogOpen(false);
      setNewUserData({ username: '', email: '', password: '', role: 'user' });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || user.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Handle create user
  const handleCreateUser = () => {
    if (!newUserData.username || !newUserData.email || !newUserData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(newUserData);
  };

  // Handle update user status
  const handleUpdateUserStatus = async (userId: number, status: 'Active' | 'Inactive') => {
    try {
      logger.info('Updating user status', { userId, status }, 'UserManagement');

      // Call the actual API endpoint
      await userService.updateUser(userId, { is_active: status === 'Active' });

      // Refresh the user list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast({
        title: "Success",
        description: `User status updated to ${status}`,
      });
    } catch (error) {
      logger.error('Failed to update user status', error as Error, { userId, status }, 'UserManagement');
      toast({
        title: "Error",
        description: 'Failed to update user status',
        variant: "destructive",
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    try {
      logger.info('Deleting user', { userId }, 'UserManagement');

      // Call the actual API endpoint
      await userService.deleteUser(userId);

      // Refresh the user list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast({
        title: "Success",
        description: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId }, 'UserManagement');
      toast({
        title: "Error",
        description: 'Failed to delete user',
        variant: "destructive",
      });
    }
  };

  // Handle get audit logs
  const handleGetAuditLogs = async (userId: number) => {
    try {
      logger.info('Fetching audit logs', { userId }, 'UserManagement');

      // Call the actual API endpoint
      const response = await userService.getAuditLogs({ user_id: userId });
      const logs = (response.data || []).map(log => ({
        id: log.id,
        user: log.user_name || `User ${log.user_id}`,
        action: log.event_type.replace(/_/g, ' '),
        details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
        timestamp: log.created_at,
        ipAddress: log.ip_address
      }));

      // Update state or show in modal
      setSelectedUserAuditLogs(logs);
      setShowAuditLogsModal(true);
    } catch (error) {
      logger.error('Failed to fetch audit logs', error as Error, { userId }, 'UserManagement');
      toast({
        title: "Error",
        description: 'Failed to fetch audit logs',
        variant: "destructive",
      });
    }
  };

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading users</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={showAuditLogsModal} onOpenChange={setShowAuditLogsModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>User Audit Logs</DialogTitle>
            <DialogDescription>Recent activity for the selected user.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedUserAuditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.details}</TableCell>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                ))}
                {selectedUserAuditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No audit logs found for this user.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditLogsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* User management controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Role</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Status</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="glass-button">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and assign roles.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="username" className="text-right text-sm font-medium">
                      Username
                    </label>
                    <Input
                      id="username"
                      className="col-span-3"
                      placeholder="Username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="email" className="text-right text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      className="col-span-3"
                      placeholder="Email address"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="password" className="text-right text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      className="col-span-3"
                      placeholder="Password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="role" className="text-right text-sm font-medium">
                      Role
                    </label>
                    <Select value={newUserData.role} onValueChange={(value) => setNewUserData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users table */}
          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === 'Active' ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() =>
                              handleUpdateUserStatus(user.id, user.status === 'Active' ? 'Inactive' : 'Active')
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.last_login)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View audit logs"
                              onClick={() => handleGetAuditLogs(user.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit user">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Reset password">
                              <Lock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete user"
                              onClick={() => {
                                if (window.confirm('Delete this user? This action cannot be undone.')) {
                                  handleDeleteUser(user.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Manage user roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Admin</TableCell>
                    <TableCell>Full system access and control</TableCell>
                    <TableCell>{users.filter(u => u.role === 'admin').length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Teacher</TableCell>
                    <TableCell>Access to classes, grades, and student information</TableCell>
                    <TableCell>{users.filter(u => u.role === 'teacher').length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Parent</TableCell>
                    <TableCell>View child's academic progress and information</TableCell>
                    <TableCell>{users.filter(u => u.role === 'parent').length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Student</TableCell>
                    <TableCell>Access to personal academic information</TableCell>
                    <TableCell>{users.filter(u => u.role === 'student').length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track user activities and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input placeholder="Search logs..." className="pl-8" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Logs
                </Button>
              </div>

              {auditLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            log.action.includes('Created') ? 'bg-green-50 text-green-700' :
                              log.action.includes('Updated') ? 'bg-blue-50 text-blue-700' :
                                log.action.includes('Deleted') ? 'bg-red-50 text-red-700' :
                                  'bg-gray-50 text-gray-700'
                          }>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.details}</TableCell>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
