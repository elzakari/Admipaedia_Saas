import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Lock, 
  Unlock,
  Settings,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { rbacApi } from '../../services/rbacApi';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PERMISSION_CATEGORIES = {
  'user_management': 'User Management',
  'academic': 'Academic Management',
  'financial': 'Financial Management',
  'administration': 'Administration',
  'reports': 'Reports & Analytics',
  'system': 'System Settings'
};

const DEFAULT_PERMISSIONS: Permission[] = [
  // User Management
  { id: 'users.view', name: 'View Users', description: 'View user profiles and information', category: 'user_management' },
  { id: 'users.create', name: 'Create Users', description: 'Create new user accounts', category: 'user_management' },
  { id: 'users.edit', name: 'Edit Users', description: 'Modify user profiles and information', category: 'user_management' },
  { id: 'users.delete', name: 'Delete Users', description: 'Remove user accounts', category: 'user_management' },
  { id: 'roles.manage', name: 'Manage Roles', description: 'Create and modify user roles', category: 'user_management' },
  
  // Academic Management
  { id: 'students.view', name: 'View Students', description: 'Access student information', category: 'academic' },
  { id: 'students.manage', name: 'Manage Students', description: 'Add, edit, and remove students', category: 'academic' },
  { id: 'classes.manage', name: 'Manage Classes', description: 'Create and modify class structures', category: 'academic' },
  { id: 'subjects.manage', name: 'Manage Subjects', description: 'Add and modify subjects', category: 'academic' },
  { id: 'exams.manage', name: 'Manage Exams', description: 'Create and manage examinations', category: 'academic' },
  { id: 'grades.manage', name: 'Manage Grades', description: 'Input and modify student grades', category: 'academic' },
  
  // Financial Management
  { id: 'fees.view', name: 'View Fees', description: 'Access fee information', category: 'financial' },
  { id: 'fees.manage', name: 'Manage Fees', description: 'Set and modify fee structures', category: 'financial' },
  { id: 'payments.view', name: 'View Payments', description: 'Access payment records', category: 'financial' },
  { id: 'payments.process', name: 'Process Payments', description: 'Handle payment transactions', category: 'financial' },
  { id: 'financial.reports', name: 'Financial Reports', description: 'Generate financial reports', category: 'financial' },
  
  // Administration
  { id: 'announcements.create', name: 'Create Announcements', description: 'Create school announcements', category: 'administration' },
  { id: 'facilities.manage', name: 'Manage Facilities', description: 'Manage school facilities', category: 'administration' },
  { id: 'staff.manage', name: 'Manage Staff', description: 'Manage teaching and non-teaching staff', category: 'administration' },
  
  // Reports & Analytics
  { id: 'reports.academic', name: 'Academic Reports', description: 'Generate academic performance reports', category: 'reports' },
  { id: 'reports.attendance', name: 'Attendance Reports', description: 'Generate attendance reports', category: 'reports' },
  { id: 'analytics.view', name: 'View Analytics', description: 'Access system analytics', category: 'reports' },
  
  // System Settings
  { id: 'system.settings', name: 'System Settings', description: 'Modify system configuration', category: 'system' },
  { id: 'system.backup', name: 'System Backup', description: 'Perform system backups', category: 'system' },
  { id: 'audit.view', name: 'View Audit Logs', description: 'Access system audit logs', category: 'system' }
];

const UserRoleManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rbacApi.getAllRoles();
      const list = res.data || [];
      return list.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        permissions: (r.permissions || []).map((p) => p.name),
        userCount: r.user_count || 0,
        isSystem: r.is_system,
        createdAt: r.created_at
      })) as Role[];
    },
    staleTime: 5 * 60 * 1000
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const res = await rbacApi.createRole({
        name: roleData.name,
        display_name: roleData.name,
        description: roleData.description,
        permission_names: roleData.permissions
      });
      if (!res.success) throw new Error(res.message || 'Failed to create role');
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Role Created",
        description: "New role has been created successfully.",
        variant: "default"
      });
      setIsCreateDialogOpen(false);
      setNewRoleData({ name: '', description: '', permissions: [] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive"
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await rbacApi.updateRole(id, {
        name: data.name,
        display_name: data.name,
        description: data.description,
        permission_names: data.permissions
      });
      if (!res.success) throw new Error(res.message || 'Failed to update role');
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Role has been updated successfully.",
        variant: "default"
      });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await rbacApi.deleteRole(roleId);
      if (!res.success) throw new Error(res.message || 'Failed to delete role');
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Role Deleted",
        description: "Role has been deleted successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive"
      });
    }
  });

  const handleCreateRole = () => {
    if (!newRoleData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive"
      });
      return;
    }
    createRoleMutation.mutate(newRoleData);
  };

  const handleUpdateRole = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: selectedRole.permissions
      }
    });
  };

  const handleDeleteRole = (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handlePermissionToggle = (permissionId: string, isForNewRole = false) => {
    if (isForNewRole) {
      setNewRoleData(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionId)
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId]
      }));
    } else if (selectedRole) {
      setSelectedRole(prev => prev ? {
        ...prev,
        permissions: prev.permissions.includes(permissionId)
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId]
      } : null);
    }
  };

  const renderPermissionsByCategory = (permissions: string[], isForNewRole = false) => {
    const groupedPermissions = DEFAULT_PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
      <div key={category} className="space-y-3">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoryPermissions.map((permission) => (
            <div key={permission.id} className="flex items-start space-x-3">
              <Checkbox
                id={permission.id}
                checked={permissions.includes(permission.id)}
                onCheckedChange={() => handlePermissionToggle(permission.id, isForNewRole)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={permission.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {permission.name}
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User & Role Management</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage user roles and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions for your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Input
                    id="role-description"
                    value={newRoleData.description}
                    onChange={(e) => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter role description"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Permissions</h3>
                <div className="space-y-6">
                  {renderPermissionsByCategory(newRoleData.permissions, true)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Roles
              </CardTitle>
              <CardDescription>
                Manage roles and their associated permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role: Role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            {role.name}
                          </div>
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {role.userCount} users
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {role.permissions.length} permissions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isSystem ? "default" : "secondary"}>
                            {role.isSystem ? "System" : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRole(role);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                System Permissions
              </CardTitle>
              <CardDescription>
                Overview of all available permissions in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryName]) => {
                  const categoryPermissions = DEFAULT_PERMISSIONS.filter(p => p.category === category);
                  return (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {categoryName}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryPermissions.map((permission) => (
                          <Card key={permission.id} className="p-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">{permission.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {permission.description}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {permission.id}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Modify role permissions and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name">Role Name</Label>
                  <Input
                    id="edit-role-name"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                    disabled={selectedRole.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role-description">Description</Label>
                  <Input
                    id="edit-role-description"
                    value={selectedRole.description}
                    onChange={(e) => setSelectedRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Permissions</h3>
                <div className="space-y-6">
                  {renderPermissionsByCategory(selectedRole.permissions, false)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;
