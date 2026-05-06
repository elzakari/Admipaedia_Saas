/**
 * User Role Management Component
 * Allows administrators to assign and manage user roles
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useRoles } from '../../hooks/useRBAC';
import { 
  RBACRole, 
  UserWithRBAC,
  AssignRoleRequest 
} from '../../types/rbac';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface UserRoleManagementProps {
  className?: string;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({ 
  className 
}) => {
  const {
    roles,
    loading: rolesLoading,
    error: rolesError,
    assignRole,
    revokeRole,
    refreshRoles
  } = useRoles();

  const [users, setUsers] = useState<UserWithRBAC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRBAC | null>(null);
  const [assignmentData, setAssignmentData] = useState<AssignRoleRequest>({
    user_id: 0,
    role_id: 0,
    expires_at: undefined,
    context: {}
  });

  useEffect(() => {
    fetchUsers();
    refreshRoles();
  }, [refreshRoles]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API call
      const response = await fetch('/api/v1/users/with-roles');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       user.roles?.some(role => role.name === roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const handleAssignRole = async () => {
    if (!selectedUser) return;
    
    try {
      await assignRole(assignmentData);
      setIsAssignDialogOpen(false);
      setSelectedUser(null);
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRevokeRole = async (userId: number, roleId: number) => {
    if (window.confirm('Are you sure you want to revoke this role?')) {
      try {
        await revokeRole({ user_id: userId, role_id: roleId });
        fetchUsers(); // Refresh users list
      } catch (error) {
        console.error('Failed to revoke role:', error);
      }
    }
  };

  const openAssignDialog = (user: UserWithRBAC) => {
    setSelectedUser(user);
    setAssignmentData({
      user_id: user.id,
      role_id: 0,
      expires_at: undefined,
      context: {}
    });
    setIsAssignDialogOpen(true);
  };

  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-orange-100 text-orange-800',
      'teacher': 'bg-blue-100 text-blue-800',
      'student': 'bg-green-100 text-green-800',
      'parent': 'bg-purple-100 text-purple-800',
      'staff': 'bg-gray-100 text-gray-800'
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800';
  };

  const isRoleExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isRoleExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 7 && daysDiff > 0;
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {(error || rolesError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || rolesError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Role Management
            </CardTitle>
            <Button onClick={fetchUsers}>
              Refresh Users
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((assignment) => (
                        <div key={assignment.id} className="relative">
                          <Badge 
                            className={`${getRoleColor(assignment.role.name)} ${
                              isRoleExpired(assignment.expires_at) ? 'opacity-50' : ''
                            }`}
                          >
                            {assignment.role.display_name}
                            {assignment.expires_at && (
                              <span className="ml-1">
                                {isRoleExpired(assignment.expires_at) ? (
                                  <AlertCircle className="h-3 w-3 inline" />
                                ) : isRoleExpiringSoon(assignment.expires_at) ? (
                                  <Clock className="h-3 w-3 inline" />
                                ) : null}
                              </span>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full bg-red-500 text-white hover:bg-red-600"
                            onClick={() => handleRevokeRole(user.id, assignment.role.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <span className="text-gray-500 text-sm">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignDialog(user)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <div className="p-2 bg-gray-50 rounded">
                {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email})
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select
                value={assignmentData.role_id.toString()}
                onValueChange={(value) => setAssignmentData({ 
                  ...assignmentData, 
                  role_id: parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {role.display_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Expiration Date (Optional)</label>
              <Input
                type="datetime-local"
                value={assignmentData.expires_at || ''}
                onChange={(e) => setAssignmentData({ 
                  ...assignmentData, 
                  expires_at: e.target.value || undefined 
                })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignRole}
                disabled={!assignmentData.role_id}
              >
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;