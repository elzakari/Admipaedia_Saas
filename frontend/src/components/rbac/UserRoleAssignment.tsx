/**
 * User Role Assignment Component
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { useRoles } from '../../hooks/useRBAC';
import { UserWithRBAC, AssignRoleRequest } from '../../types/rbac';
import { Plus, X, Calendar, User, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface UserRoleAssignmentProps {
  user: UserWithRBAC;
  onRefresh?: () => void;
}

export const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({
  user,
  onRefresh
}) => {
  const { toast } = useToast();
  const { roles, assignRole, revokeRole } = useRoles();
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleAssignRole = async () => {
    if (!selectedRoleName) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignmentData: AssignRoleRequest = {
        user_id: user.id,
        role_name: selectedRoleName,
        reason: reason || undefined,
        expires_at: expiresAt || undefined
      };

      const response = await assignRole(assignmentData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Role assigned successfully",
        });
        setIsAssignDialogOpen(false);
        setSelectedRoleName('');
        setReason('');
        setExpiresAt('');
        onRefresh?.();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to assign role",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRevokeRole = async (roleName: string) => {
    if (confirm(`Are you sure you want to revoke the "${roleName}" role from this user?`)) {
      try {
        const response = await revokeRole(user.id, roleName);
        
        if (response.success) {
          toast({
            title: "Success",
            description: "Role revoked successfully",
          });
          onRefresh?.();
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to revoke role",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const activeAssignments = user.role_assignments?.filter(assignment => 
    assignment.is_active && (!assignment.expires_at || new Date(assignment.expires_at) > new Date())
  ) || [];

  const expiredAssignments = user.role_assignments?.filter(assignment => 
    assignment.is_active && assignment.expires_at && new Date(assignment.expires_at) <= new Date()
  ) || [];

  const availableRoles = roles.filter(role => 
    !activeAssignments.some(assignment => assignment.role?.name === role.name)
  );

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role to {user.username}</DialogTitle>
                  <DialogDescription>
                    Select a role to assign to this user. You can optionally set an expiration date and provide a reason.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRoleName} onValueChange={setSelectedRoleName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                              />
                              {role.display_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires At (optional)</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for role assignment"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRole}>Assign Role</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Active Role Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Roles ({activeAssignments.length})
          </CardTitle>
          <CardDescription>
            Currently active role assignments for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No active role assignments
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: assignment.role?.color }}
                        />
                        <div>
                          <div className="font-medium">{assignment.role?.display_name}</div>
                          <div className="text-sm text-gray-500">{assignment.role?.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(assignment.assigned_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.expires_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {format(new Date(assignment.expires_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline">Never</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.assigned_by_user ? (
                        <div className="text-sm">
                          {assignment.assigned_by_user.username}
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {assignment.assigned_reason || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeRole(assignment.role?.name || '')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expired Role Assignments */}
      {expiredAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-600">
              Expired Roles ({expiredAssignments.length})
            </CardTitle>
            <CardDescription>
              Role assignments that have expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiredAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className="opacity-60">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: assignment.role?.color }}
                        />
                        <div>
                          <div className="font-medium">{assignment.role?.display_name}</div>
                          <div className="text-sm text-gray-500">{assignment.role?.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(assignment.assigned_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-red-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {assignment.expires_at && format(new Date(assignment.expires_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.assigned_by_user ? (
                        <div className="text-sm">
                          {assignment.assigned_by_user.username}
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {assignment.assigned_reason || '-'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Effective Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Effective Permissions</CardTitle>
          <CardDescription>
            All permissions this user has through their role assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.effective_permissions && user.effective_permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.effective_permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No effective permissions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};