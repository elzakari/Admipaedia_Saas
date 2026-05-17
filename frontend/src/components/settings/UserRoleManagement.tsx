import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck
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
  const { t } = useTranslation();
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

  const getCategoryName = (category: string, defaultName: string) => {
    return t(`admin_settings.rbac.category_${category}`, defaultName);
  };

  const getPermissionName = (id: string, defaultName: string) => {
    return t(`admin_settings.rbac.permission_name_${id.replace('.', '_')}`, defaultName);
  };

  const getPermissionDesc = (id: string, defaultDesc: string) => {
    return t(`admin_settings.rbac.permission_desc_${id.replace('.', '_')}`, defaultDesc);
  };

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
        title: t('admin_settings.role_created', 'Role Created'),
        description: t('admin_settings.role_created_desc', 'New role has been created successfully.'),
        variant: "default"
      });
      setIsCreateDialogOpen(false);
      setNewRoleData({ name: '', description: '', permissions: [] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.create_role_failed', 'Failed to create role'),
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
        title: t('admin_settings.role_updated', 'Role Updated'),
        description: t('admin_settings.role_updated_desc', 'Role has been updated successfully.'),
        variant: "default"
      });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.update_role_failed', 'Failed to update role'),
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
        title: t('admin_settings.role_deleted', 'Role Deleted'),
        description: t('admin_settings.role_deleted_desc', 'Role has been deleted successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.delete_role_failed', 'Failed to delete role'),
        variant: "destructive"
      });
    }
  });

  const handleCreateRole = () => {
    if (!newRoleData.name.trim()) {
      toast({
        title: t('common.validation_error', 'Validation Error'),
        description: t('admin_settings.role_name_required', 'Role name is required'),
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
    if (window.confirm(t('admin_settings.confirm_delete_role', 'Are you sure you want to delete this role? This action cannot be undone.'))) {
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
          {getCategoryName(category, PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES])}
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
                  {getPermissionName(permission.id, permission.name)}
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getPermissionDesc(permission.id, permission.description)}
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
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.user_role_mgmt', 'User & Role Management')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.user_role_mgmt_desc', 'Manage user roles and permissions')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-role-trigger" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('admin_settings.create_role', 'Create Role')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin_settings.create_new_role', 'Create New Role')}</DialogTitle>
              <DialogDescription>
                {t('admin_settings.create_role_desc', 'Define a new role with specific permissions for your organization.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">{t('admin_settings.role_name', 'Role Name')}</Label>
                  <Input
                    id="role-name"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('admin_settings.enter_role_name', 'Enter role name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">{t('common.description', 'Description')}</Label>
                  <Input
                    id="role-description"
                    value={newRoleData.description}
                    onChange={(e) => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('admin_settings.enter_role_description', 'Enter role description')}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('admin_settings.permissions', 'Permissions')}</h3>
                <div className="space-y-6">
                  {renderPermissionsByCategory(newRoleData.permissions, true)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button data-testid="save-role-btn" onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? t('admin_settings.creating_role', 'Creating...') : t('admin_settings.create_role', 'Create Role')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">{t('admin_settings.roles', 'Roles')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('admin_settings.permissions', 'Permissions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('admin_settings.system_roles', 'System Roles')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.manage_roles_desc', 'Manage roles and their associated permissions')}
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
                      <TableHead>{t('admin_settings.role', 'Role')}</TableHead>
                      <TableHead>{t('common.description', 'Description')}</TableHead>
                      <TableHead>{t('admin_settings.users', 'Users')}</TableHead>
                      <TableHead>{t('admin_settings.permissions', 'Permissions')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
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
                            {role.userCount} {t('admin_settings.users', 'users')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {role.permissions.length} {t('admin_settings.permissions', 'permissions')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isSystem ? "default" : "secondary"}>
                            {role.isSystem ? t('admin_settings.system', 'System') : t('admin_settings.custom', 'Custom')}
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
                                data-testid={`delete-role-${role.id}`}
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
                {t('admin_settings.system_permissions', 'System Permissions')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.system_permissions_desc', 'Overview of all available permissions in the system')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryName]) => {
                  const categoryPermissions = DEFAULT_PERMISSIONS.filter(p => p.category === category);
                  return (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {getCategoryName(category, categoryName)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryPermissions.map((permission) => (
                          <Card key={permission.id} className="p-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">{getPermissionName(permission.id, permission.name)}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {getPermissionDesc(permission.id, permission.description)}
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
            <DialogTitle>{t('admin_settings.edit_role', 'Edit Role')}: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              {t('admin_settings.edit_role_desc', 'Modify role permissions and settings.')}
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name">{t('admin_settings.role_name', 'Role Name')}</Label>
                  <Input
                    id="edit-role-name"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                    disabled={selectedRole.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role-description">{t('common.description', 'Description')}</Label>
                  <Input
                    id="edit-role-description"
                    value={selectedRole.description}
                    onChange={(e) => setSelectedRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('admin_settings.permissions', 'Permissions')}</h3>
                <div className="space-y-6">
                  {renderPermissionsByCategory(selectedRole.permissions, false)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? t('common.updating', 'Updating...') : t('admin_settings.update_role', 'Update Role')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;
