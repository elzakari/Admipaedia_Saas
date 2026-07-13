import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Edit,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck
} from 'lucide-react';
import { rbacApi } from '../../services/rbacApi';

interface RolePermissionRef {
  id?: number;
  name: string;
  display_name?: string;
  description?: string;
  category?: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  isDefault: boolean;
  createdAt?: string;
}

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isSystem: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  user_management: 'User Management',
  academic: 'Academic Management',
  administration: 'Administration',
  finance: 'Financial Management',
  financial: 'Financial Management',
  reports: 'Reports & Analytics',
  dashboard: 'Dashboards',
  system: 'System Settings'
};

const emptyRoleDraft = {
  name: '',
  description: '',
  permissions: [] as string[]
};

const UserRoleManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState(emptyRoleDraft);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');

  const getCategoryName = (category: string) =>
    t(`admin_settings.rbac.category_${category}`, CATEGORY_LABELS[category] || category.replace(/_/g, ' '));

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['settings-rbac-roles'],
    queryFn: async () => {
      const res = await rbacApi.getAllRoles();
      const list = res.data || [];

      return list.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.display_name || role.name,
        description: role.description || '',
        permissions: (role.permissions || []).map((permission: RolePermissionRef) => permission.name),
        userCount: role.user_count || 0,
        isSystem: !!role.is_system,
        isDefault: !!role.is_default,
        createdAt: role.created_at
      })) as Role[];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['settings-rbac-permissions'],
    queryFn: async () => {
      const res = await rbacApi.getAllPermissions();
      const list = res.data || [];

      return list.map((permission) => ({
        id: permission.id,
        name: permission.name,
        displayName: permission.display_name || permission.name,
        description: permission.description || '',
        category: permission.category || 'system',
        isSystem: !!permission.is_system
      })) as Permission[];
    },
    staleTime: 5 * 60 * 1000
  });

  const filteredRoles = useMemo(() => {
    const query = roleSearchTerm.trim().toLowerCase();
    if (!query) return roles;

    return roles.filter((role) => {
      const haystack = [
        role.name,
        role.displayName,
        role.description,
        role.permissions.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [roleSearchTerm, roles]);

  const filteredPermissions = useMemo(() => {
    const query = permissionSearchTerm.trim().toLowerCase();
    if (!query) return permissions;

    return permissions.filter((permission) => {
      const haystack = [
        permission.name,
        permission.displayName,
        permission.description,
        permission.category
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [permissionSearchTerm, permissions]);

  const permissionsByCategory = useMemo(() => {
    return filteredPermissions.reduce<Record<string, Permission[]>>((accumulator, permission) => {
      const category = permission.category || 'system';
      if (!accumulator[category]) {
        accumulator[category] = [];
      }
      accumulator[category].push(permission);
      return accumulator;
    }, {});
  }, [filteredPermissions]);

  const roleStats = useMemo(() => {
    const totalUsersAssigned = roles.reduce((sum, role) => sum + role.userCount, 0);
    return {
      totalRoles: roles.length,
      systemRoles: roles.filter((role) => role.isSystem).length,
      customRoles: roles.filter((role) => !role.isSystem).length,
      totalPermissions: permissions.length,
      totalUsersAssigned
    };
  }, [permissions.length, roles]);

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewRoleData(emptyRoleDraft);
  };

  const openEditRole = (role: Role) => {
    setSelectedRole({
      ...role,
      permissions: [...role.permissions]
    });
    setIsEditDialogOpen(true);
  };

  const createRoleMutation = useMutation({
    mutationFn: async (roleData: typeof emptyRoleDraft) => {
      const res = await rbacApi.createRole({
        name: roleData.name.trim(),
        display_name: roleData.name.trim(),
        description: roleData.description.trim(),
        permission_names: roleData.permissions
      });
      if (!res.success) {
        throw new Error(res.message || 'Failed to create role');
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.role_created', 'Role Created'),
        description: t('admin_settings.role_created_desc', 'New role has been created successfully.')
      });
      resetCreateDialog();
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.create_role_failed', 'Failed to create role'),
        variant: 'destructive'
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      const res = await rbacApi.updateRole(role.id, {
        name: role.name.trim(),
        display_name: role.displayName.trim() || role.name.trim(),
        description: role.description.trim(),
        permission_names: role.permissions
      });
      if (!res.success) {
        throw new Error(res.message || 'Failed to update role');
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.role_updated', 'Role Updated'),
        description: t('admin_settings.role_updated_desc', 'Role has been updated successfully.')
      });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.update_role_failed', 'Failed to update role'),
        variant: 'destructive'
      });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const res = await rbacApi.deleteRole(roleId);
      if (!res.success) {
        throw new Error(res.message || 'Failed to delete role');
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.role_deleted', 'Role Deleted'),
        description: t('admin_settings.role_deleted_desc', 'Role has been deleted successfully.')
      });
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.delete_role_failed', 'Failed to delete role'),
        variant: 'destructive'
      });
    }
  });

  const handleCreateRole = () => {
    if (!newRoleData.name.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.role_name_required', 'Role name is required'),
        variant: 'destructive'
      });
      return;
    }

    createRoleMutation.mutate(newRoleData);
  };

  const handleUpdateRole = () => {
    if (!selectedRole) return;

    if (!selectedRole.name.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.role_name_required', 'Role name is required'),
        variant: 'destructive'
      });
      return;
    }

    updateRoleMutation.mutate(selectedRole);
  };

  const handleDeleteRole = (role: Role) => {
    if (
      window.confirm(
        t(
          'admin_settings.confirm_delete_role',
          `Are you sure you want to delete ${role.displayName}? This action cannot be undone.`
        )
      )
    ) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const togglePermission = (permissionName: string, isCreateFlow: boolean) => {
    if (isCreateFlow) {
      setNewRoleData((previous) => ({
        ...previous,
        permissions: previous.permissions.includes(permissionName)
          ? previous.permissions.filter((item) => item !== permissionName)
          : [...previous.permissions, permissionName]
      }));
      return;
    }

    setSelectedRole((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        permissions: previous.permissions.includes(permissionName)
          ? previous.permissions.filter((item) => item !== permissionName)
          : [...previous.permissions, permissionName]
      };
    });
  };

  const renderPermissionChecklist = (selectedPermissions: string[], isCreateFlow: boolean) => {
    const isReadOnly = !isCreateFlow && !!selectedRole?.isSystem;

    if (permissionsLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common.loading', 'Loading...')}
        </div>
      );
    }

    const categoryEntries = Object.entries(permissionsByCategory);
    if (categoryEntries.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {permissionSearchTerm.trim()
            ? t('admin_settings.no_matching_permissions', 'No permissions matched your search.')
            : t('admin_settings.no_permissions_available', 'No permissions are available right now.')}
        </div>
      );
    }

    return categoryEntries.map(([category, categoryPermissions]) => (
      <div key={category} className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {getCategoryName(category)}
          </h4>
          <Badge variant="outline">{categoryPermissions.length}</Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {categoryPermissions.map((permission) => (
            <label
              key={permission.name}
              htmlFor={`${isCreateFlow ? 'create' : 'edit'}-${permission.name}`}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                isReadOnly ? 'cursor-default bg-slate-50/60' : 'cursor-pointer hover:bg-slate-50'
              }`}
            >
              <Checkbox
                id={`${isCreateFlow ? 'create' : 'edit'}-${permission.name}`}
                checked={selectedPermissions.includes(permission.name)}
                disabled={isReadOnly}
                onCheckedChange={() => togglePermission(permission.name, isCreateFlow)}
              />
              <div className="grid gap-1.5 leading-none">
                <div className="text-sm font-medium">
                  {permission.displayName}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {permission.description || permission.name}
                </p>
                <div className="text-[11px] text-muted-foreground">{permission.name}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.roles', 'Roles')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.system_roles', 'System Roles')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.systemRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.custom_roles', 'Custom Roles')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.customRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.permissions', 'Permissions')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.totalPermissions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('admin_settings.user_role_mgmt', 'User & Role Management')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('admin_settings.user_role_mgmt_desc', 'Manage user roles and permissions')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={roleSearchTerm}
              onChange={(event) => setRoleSearchTerm(event.target.value)}
              className="pl-9"
              placeholder={t('admin_settings.search_roles', 'Search roles, descriptions, or permissions')}
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (open ? setIsCreateDialogOpen(true) : resetCreateDialog())}>
            <DialogTrigger asChild>
              <Button data-testid="create-role-trigger" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('admin_settings.create_role', 'Create Role')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('admin_settings.create_new_role', 'Create New Role')}</DialogTitle>
                <DialogDescription>
                  {t('admin_settings.create_role_desc', 'Define a new role with specific permissions for your organization.')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">{t('admin_settings.role_name', 'Role Name')}</Label>
                    <Input
                      id="role-name"
                      value={newRoleData.name}
                      onChange={(event) => setNewRoleData((previous) => ({ ...previous, name: event.target.value }))}
                      placeholder={t('admin_settings.enter_role_name', 'Enter role name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">{t('common.description', 'Description')}</Label>
                    <Input
                      id="role-description"
                      value={newRoleData.description}
                      onChange={(event) => setNewRoleData((previous) => ({ ...previous, description: event.target.value }))}
                      placeholder={t('admin_settings.enter_role_description', 'Enter role description')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{t('admin_settings.permissions', 'Permissions')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {newRoleData.permissions.length} {t('admin_settings.permissions_selected', 'permissions selected')}
                      </p>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={permissionSearchTerm}
                        onChange={(event) => setPermissionSearchTerm(event.target.value)}
                        className="pl-9"
                        placeholder={t('admin_settings.search_permissions', 'Search permissions')}
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    {renderPermissionChecklist(newRoleData.permissions, true)}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetCreateDialog}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending} data-testid="save-role-btn">
                  {createRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createRoleMutation.isPending
                    ? t('admin_settings.creating_role', 'Creating...')
                    : t('admin_settings.create_role', 'Create Role')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin_settings.role', 'Role')}</TableHead>
                      <TableHead>{t('common.description', 'Description')}</TableHead>
                      <TableHead>{t('admin_settings.users', 'Users')}</TableHead>
                      <TableHead>{t('admin_settings.permissions', 'Permissions')}</TableHead>
                      <TableHead>{t('admin_settings.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            {role.displayName}
                          </div>
                        </TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
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
                          <Badge variant={role.isSystem ? 'default' : 'secondary'}>
                            {role.isSystem
                              ? t('admin_settings.system', 'System')
                              : role.isDefault
                                ? t('admin_settings.default', 'Default')
                                : t('admin_settings.custom', 'Custom')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditRole(role)}
                              title={t('common.edit', 'Edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRole(role)}
                                title={t('common.delete', 'Delete')}
                                data-testid={`delete-role-${role.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRoles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {t('admin_settings.no_roles_found', 'No roles matched your search.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {t('admin_settings.system_permissions', 'System Permissions')}
                  </CardTitle>
                  <CardDescription>
                    {t('admin_settings.system_permissions_desc', 'Overview of all available permissions in the system')}
                  </CardDescription>
                </div>
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={permissionSearchTerm}
                    onChange={(event) => setPermissionSearchTerm(event.target.value)}
                    className="pl-9"
                    placeholder={t('admin_settings.search_permissions', 'Search permissions')}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {getCategoryName(category)}
                        </h3>
                        <Badge variant="outline">{categoryPermissions.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {categoryPermissions.map((permission) => (
                          <Card key={permission.name} className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-medium text-sm">{permission.displayName}</h4>
                                {permission.isSystem && <Badge variant="secondary">System</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {permission.description || permission.name}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {permission.name}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                {!permissionsLoading && filteredPermissions.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t('admin_settings.no_matching_permissions', 'No permissions matched your search.')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedRole(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('admin_settings.edit_role', 'Edit Role')}
              {selectedRole ? `: ${selectedRole.displayName}` : ''}
            </DialogTitle>
            <DialogDescription>
              {t('admin_settings.edit_role_desc', 'Modify role permissions and settings.')}
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name">{t('admin_settings.role_name', 'Role Name')}</Label>
                  <Input
                    id="edit-role-name"
                    value={selectedRole.name}
                    onChange={(event) =>
                      setSelectedRole((previous) => (previous ? { ...previous, name: event.target.value, displayName: event.target.value } : previous))
                    }
                    disabled={selectedRole.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role-description">{t('common.description', 'Description')}</Label>
                  <Input
                    id="edit-role-description"
                    value={selectedRole.description}
                    disabled={selectedRole.isSystem}
                    onChange={(event) =>
                      setSelectedRole((previous) => (previous ? { ...previous, description: event.target.value } : previous))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                {selectedRole.isSystem && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t(
                      'admin_settings.system_role_locked',
                      'System roles are view-only here. Create a custom role if you need a tailored permission set.'
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{t('admin_settings.permissions', 'Permissions')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRole.permissions.length} {t('admin_settings.permissions_selected', 'permissions selected')}
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={permissionSearchTerm}
                      onChange={(event) => setPermissionSearchTerm(event.target.value)}
                      className="pl-9"
                      placeholder={t('admin_settings.search_permissions', 'Search permissions')}
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  {renderPermissionChecklist(selectedRole.permissions, false)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedRole(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending || !selectedRole || selectedRole.isSystem}>
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {updateRoleMutation.isPending
                ? t('common.updating', 'Updating...')
                : t('admin_settings.update_role', 'Update Role')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;
