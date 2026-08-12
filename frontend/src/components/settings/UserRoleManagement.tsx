import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '../ui/use-toast';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Edit,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldPlus,
  Trash2,
  UserCheck,
  XCircle
} from 'lucide-react';
import { rbacApi } from '../../services/rbacApi';

interface RolePermissionRef {
  id?: number;
  name: string;
  display_name?: string;
  description?: string;
  category?: string;
  resource_type?: string;
  permission_type?: string;
  is_system?: boolean;
  is_active?: boolean;
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
  resourceType: string;
  permissionType: string;
  isSystem: boolean;
  isActive: boolean;
}

type PermissionCategoryFilter = 'all' | string;
type PermissionTypeFilter = 'all' | 'create' | 'read' | 'update' | 'delete' | 'manage' | 'approve' | 'execute' | 'admin';

const CATEGORY_LABELS: Record<string, string> = {
  user_management: 'User Management',
  academic: 'Academic Management',
  admissions: 'Admissions',
  administration: 'Administration',
  finance: 'Financial Management',
  financial: 'Financial Management',
  reports: 'Reports & Analytics',
  dashboard: 'Dashboards',
  system: 'System Settings',
  library: 'Library',
  operations: 'Operations',
  communications: 'Communications'
};

const PERMISSION_TYPE_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  manage: 'Manage',
  approve: 'Approve',
  execute: 'Execute',
  admin: 'Admin'
};

const emptyRoleDraft = {
  name: '',
  description: '',
  permissions: [] as string[]
};

const emptyPermissionDraft = {
  name: '',
  display_name: '',
  description: '',
  category: 'user_management',
  resource_type: 'USER' as 'USER' | 'STUDENT' | 'TEACHER' | 'PARENT' | 'CLASS' | 'SUBJECT' | 'GRADE' | 'ATTENDANCE' | 'EXAM' | 'ASSIGNMENT' | 'REPORT' | 'FINANCE' | 'SYSTEM' | 'DASHBOARD' | 'TEACHER_ANALYTICS' | 'ANNOUNCEMENT',
  permission_type: 'READ' as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'APPROVE' | 'MANAGE' | 'ADMIN'
};

const RESOURCE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'USER', label: 'User' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'PARENT', label: 'Parent / Guardian' },
  { value: 'CLASS', label: 'Class' },
  { value: 'SUBJECT', label: 'Subject' },
  { value: 'GRADE', label: 'Grade' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'REPORT', label: 'Report' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'DASHBOARD', label: 'Dashboard' },
  { value: 'TEACHER_ANALYTICS', label: 'Teacher Analytics' },
  { value: 'ANNOUNCEMENT', label: 'Announcement / Communications' }
];

const PERMISSION_TYPE_OPTIONS: Array<{ value: string; label: string }> = Object.entries(PERMISSION_TYPE_LABELS).map(
  ([value, label]) => ({ value: value.toUpperCase(), label })
);

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
  const [permissionCategoryFilter, setPermissionCategoryFilter] = useState<PermissionCategoryFilter>('all');
  const [permissionTypeFilter, setPermissionTypeFilter] = useState<PermissionTypeFilter>('all');
  const [showSystemPermissions, setShowSystemPermissions] = useState(true);
  const [showInactivePermissions, setShowInactivePermissions] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isCreatePermissionDialogOpen, setIsCreatePermissionDialogOpen] = useState(false);
  const [isEditPermissionDialogOpen, setIsEditPermissionDialogOpen] = useState(false);
  const [newPermissionData, setNewPermissionData] = useState(emptyPermissionDraft);
  const [editPermissionId, setEditPermissionId] = useState<number | null>(null);
  const [editPermissionData, setEditPermissionData] = useState<Partial<typeof emptyPermissionDraft> & { is_active?: boolean }>({});
  const [bulkSelectByCategory, setBulkSelectByCategory] = useState<Record<string, boolean>>({});

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
        displayName: (permission as any).display_name || permission.name,
        description: (permission as any).description || '',
        category: (permission as any).category || 'system',
        resourceType: ((permission as any).resource_type || 'SYSTEM') as string,
        permissionType: ((permission as any).permission_type || 'READ') as string,
        isSystem: !!(permission as any).is_system,
        isActive: !('is_active' in (permission as any)) ? true : !!(permission as any).is_active
      })) as Permission[];
    },
    staleTime: 5 * 60 * 1000
  });

  const permissionCategories = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((permission) => set.add(permission.category));
    return ['all', ...Array.from(set)] as string[];
  }, [permissions]);

  const availablePermissionTypes = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((permission) => set.add(permission.permissionType.toLowerCase()));
    return ['all', ...Array.from(set)].map((value) => ({
      value,
      label: value === 'all' ? 'All types' : PERMISSION_TYPE_LABELS[value] || value.toUpperCase()
    }));
  }, [permissions]);

  const roleStats = useMemo(() => {
    const totalRoles = Array.isArray(roles) ? roles.length : 0;
    let systemRoles = 0;
    let customRoles = 0;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (role.isSystem) systemRoles += 1;
        else customRoles += 1;
      }
    }
    const totalPermissions = Array.isArray(permissions) ? permissions.length : 0;
    return {
      totalRoles,
      systemRoles,
      customRoles,
      totalPermissions
    };
  }, [roles, permissions]);

  const filteredPermissions = useMemo(() => {
    const query = permissionSearchTerm.trim().toLowerCase();
    return permissions.filter((permission) => {
      if (!showSystemPermissions && permission.isSystem) return false;
      if (!showInactivePermissions && !permission.isActive) return false;
      if (permissionCategoryFilter !== 'all' && permission.category !== permissionCategoryFilter) return false;
      if (permissionTypeFilter !== 'all') {
        if (permission.permissionType.toLowerCase() !== permissionTypeFilter.toLowerCase()) return false;
      }
      if (!query) return true;

      const haystack = [permission.name, permission.displayName, permission.description, permission.category]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [
    permissions,
    permissionSearchTerm,
    permissionCategoryFilter,
    permissionTypeFilter,
    showSystemPermissions,
    showInactivePermissions
  ]);

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

  const toggleCategoryCollapse = (category: string) =>
    setCollapsedCategories((previous) => ({ ...previous, [category]: !previous[category] }));

  const copyPermissionName = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast({
        title: t('common.copied', 'Copied'),
        description: t('admin_settings.permission_copied', `Permission code copied: {{name}}`, { name }),
        duration: 1800
      });
    } catch {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.copy_failed', 'Unable to copy permission code to clipboard.'),
        variant: 'destructive',
        duration: 2200
      });
    }
  }, [t, toast]);

  const exportPermissions = useCallback(() => {
    try {
      const rows = filteredPermissions.map((permission) => [
        permission.name,
        permission.displayName,
        permission.description,
        permission.category,
        permission.resourceType,
        permission.permissionType,
        permission.isSystem ? 'System' : 'Custom',
        permission.isActive ? 'Active' : 'Inactive'
      ]);
      const header = [
        'Code',
        'Name',
        'Description',
        'Category',
        'Resource',
        'Action',
        'Origin',
        'Status'
      ];
      const csv = [header, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const value = String(cell ?? '').replace(/"/g, '""');
              return /[",\n]/.test(value) ? `"${value}"` : value;
            })
            .join(',')
        )
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `admipaedia-permissions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({
        title: t('admin_settings.permissions_exported', 'Permissions exported'),
        description: t('admin_settings.permissions_exported_desc', '{{count}} permissions exported as CSV.', {
          count: rows.length
        })
      });
    } catch {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.export_failed', 'Unable to export permissions CSV.'),
        variant: 'destructive'
      });
    }
  }, [filteredPermissions, t, toast]);

  const filteredRoles = useMemo(() => {
    const query = roleSearchTerm.trim().toLowerCase();
    if (!query) return roles;

    return roles.filter((role) => {
      const haystack = [role.name, role.displayName, role.description, role.permissions.join(' ')]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [roleSearchTerm, roles]);

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewRoleData(emptyRoleDraft);
  };

  const resetCreatePermissionDialog = () => {
    setIsCreatePermissionDialogOpen(false);
    setNewPermissionData(emptyPermissionDraft);
  };

  const openEditPermission = (permission: Permission) => {
    setEditPermissionId(permission.id);
    setEditPermissionData({
      category: permission.category,
      description: permission.description,
      display_name: permission.displayName,
      is_active: permission.isActive
    });
    setIsEditPermissionDialogOpen(true);
  };

  const closeEditPermission = () => {
    setIsEditPermissionDialogOpen(false);
    setEditPermissionId(null);
    setEditPermissionData({});
  };

  const createPermissionMutation = useMutation({
    mutationFn: async (payload: Partial<typeof emptyPermissionDraft>) => {
      const res = await rbacApi.createPermission({
        name: (payload.name || '').trim(),
        display_name: (payload.display_name || payload.name || '').trim(),
        description: (payload.description || '').trim(),
        category: (payload.category || 'user_management').trim(),
        resource_type: (payload.resource_type || emptyPermissionDraft.resource_type) as any,
        permission_type: (payload.permission_type || emptyPermissionDraft.permission_type) as any
      });
      if (!res.success) throw new Error(res.message || 'Failed to create custom permission');
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.custom_permission_created', 'Custom permission created'),
        description: t(
          'admin_settings.custom_permission_created_desc',
          'The new permission has been added to the system and is ready to attach to roles.'
        )
      });
      resetCreatePermissionDialog();
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-permissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.create_custom_permission_failed', 'Failed to create custom permission'),
        variant: 'destructive',
        duration: 9000
      });
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (payload: { permissionId: number; patch: Partial<typeof emptyPermissionDraft> & { is_active?: boolean } }) => {
      const res = await rbacApi.updatePermission(payload.permissionId, {
        display_name: payload.patch.display_name,
        description: payload.patch.description,
        category: payload.patch.category,
        is_active: payload.patch.is_active
      } as any);
      if (!res.success) throw new Error(res.message || 'Failed to update permission');
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.permission_updated', 'Permission updated'),
        description: t('admin_settings.permission_updated_desc', 'Permission metadata saved.')
      });
      closeEditPermission();
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-permissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.update_permission_failed', 'Failed to update permission'),
        variant: 'destructive',
        duration: 9000
      });
    }
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      const res = await rbacApi.deletePermission(permissionId);
      if (!res.success) throw new Error(res.message || 'Failed to delete permission');
      return res;
    },
    onSuccess: () => {
      toast({
        title: t('admin_settings.permission_deleted', 'Permission deleted'),
        description: t('admin_settings.permission_deleted_desc', 'Custom permission has been removed from the system.')
      });
      queryClient.invalidateQueries({ queryKey: ['settings-rbac-permissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description:
          error.message ||
          t(
            'admin_settings.delete_permission_failed',
            'Failed to delete permission. It may still be attached to existing roles.'
          ),
        variant: 'destructive',
        duration: 10000
      });
    }
  });

  const handleCreatePermission = () => {
    if (!newPermissionData.name.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.permission_name_required', 'Permission code (e.g. "library.manage_circulation") is required.'),
        variant: 'destructive'
      });
      return;
    }
    if (!newPermissionData.display_name.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.permission_display_name_required', 'Permission display name is required.'),
        variant: 'destructive'
      });
      return;
    }
    createPermissionMutation.mutate(newPermissionData);
  };

  const handleUpdatePermission = () => {
    if (!editPermissionId) return;
    if (!editPermissionData.display_name?.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('admin_settings.permission_display_name_required', 'Permission display name is required.'),
        variant: 'destructive'
      });
      return;
    }
    updatePermissionMutation.mutate({
      permissionId: editPermissionId,
      patch: editPermissionData
    });
  };

  const handleDeletePermission = (permission: Permission) => {
    if (permission.isSystem) {
      toast({
        title: t('admin_settings.system_permission_delete_blocked', 'System permissions cannot be deleted'),
        description: t(
          'admin_settings.system_permission_delete_blocked_desc',
          'Deactivate the permission or create a custom replacement instead.'
        ),
        variant: 'destructive',
        duration: 8000
      });
      return;
    }
    const confirmText = t(
      'admin_settings.confirm_delete_permission',
      `Delete custom permission "{{name}}"? This action cannot be undone and any role depending on it will lose the capability.`,
      { name: permission.displayName || permission.name }
    );
    if (!window.confirm(confirmText)) return;
    deletePermissionMutation.mutate(permission.id);
  };

  const toggleCategoryAll = (category: string, selectedPermissions: string[], isCreateFlow: boolean) => {
    const rows = permissionsByCategory[category] || [];
    const names = rows.filter((row) => !row.isSystem || showSystemPermissions).map((row) => row.name);
    const allSelected = names.every((name) => selectedPermissions.includes(name));

    const applyTo = (previous: typeof emptyRoleDraft.permissions) => {
      if (allSelected) return previous.filter((name) => !names.includes(name));
      const merged = new Set(previous);
      names.forEach((name) => merged.add(name));
      return Array.from(merged);
    };

    if (isCreateFlow) {
      setNewRoleData((previous) => ({ ...previous, permissions: applyTo(previous.permissions) }));
    } else {
      setSelectedRole((previous) => (previous ? { ...previous, permissions: applyTo(previous.permissions) } : previous));
    }
    setBulkSelectByCategory((previous) => ({ ...previous, [category]: !allSelected }));
  };

  const resetCreateDialogRole = () => {
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
      const name = (roleData.name || '').trim();
      const description = (roleData.description ?? '').toString().trim();
      const color = (roleData.color || '#6B7280').toString().trim() || '#6B7280';
      const icon = (roleData.icon || 'shield').toString().trim() || 'shield';
      const level =
        roleData.level === null || roleData.level === undefined || roleData.level === ''
          ? 5
          : Number(roleData.level);
      const department_id =
        roleData.department_id == null || roleData.department_id === ''
          ? null
          : Number(roleData.department_id) || null;
      const max_users =
        roleData.max_users == null || roleData.max_users === ''
          ? null
          : Number(roleData.max_users) || null;
      const permission_names = Array.isArray(roleData.permissions)
        ? roleData.permissions.map((v) => String(v)).filter((v) => !!v)
        : [];
      const auto_assignment_conditions =
        !!roleData.auto_assignment_conditions &&
        typeof roleData.auto_assignment_conditions === 'object'
          ? roleData.auto_assignment_conditions
          : {};
      const default_properties =
        !!roleData.default_properties && typeof roleData.default_properties === 'object'
          ? roleData.default_properties
          : {};
      const is_active =
        typeof roleData.is_active === 'boolean' ? roleData.is_active : true;
      const res = await rbacApi.createRole({
        name,
        display_name: name,
        description,
        color,
        icon,
        level: Number.isFinite(level) ? level : 5,
        department_id,
        max_users,
        permission_names,
        auto_assignment_conditions,
        default_properties,
        is_active,
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
          {permissionSearchTerm.trim() ||
          permissionCategoryFilter !== 'all' ||
          permissionTypeFilter !== 'all' ||
          !showSystemPermissions ||
          showInactivePermissions
            ? t(
                'admin_settings.no_matching_permissions',
                'No permissions matched your search. Adjust the filters or clear the search box.'
              )
            : t('admin_settings.no_permissions_available', 'No permissions are available right now.')}
        </div>
      );
    }

    return (
      <TooltipProvider delayDuration={120}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-slate-50/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              {selectedPermissions.length}{' '}
              {t('admin_settings.permissions_selected_lower', 'permissions selected')}
            </div>
            <div>·</div>
            <div>
              {filteredPermissions.length}{' '}
              {t('admin_settings.permissions_visible', 'visible across')} {categoryEntries.length}{' '}
              {t('admin_settings.categories_lower', 'categories')}
            </div>
          </div>
          {categoryEntries.map(([category, categoryPermissions]) => {
            const isCollapsed = !!collapsedCategories[category];
            const names = categoryPermissions.map((row) => row.name);
            const allSelected = names.every((name) => selectedPermissions.includes(name));
            return (
              <div key={category} className="space-y-3 rounded-md border">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b">
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(category)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {getCategoryName(category)}
                    </h4>
                    <Badge variant="outline">{categoryPermissions.length}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {names.filter((name) => selectedPermissions.includes(name)).length}/
                      {categoryPermissions.length}{' '}
                      {t('admin_settings.selected_lower', 'selected')}
                    </span>
                  </button>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => toggleCategoryAll(category, selectedPermissions, isCreateFlow)}
                    >
                      {allSelected
                        ? t('admin_settings.clear_category', 'Clear category')
                        : t('admin_settings.select_all_category', 'Select all in category')}
                    </Button>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                    {categoryPermissions.map((permission) => {
                      const permissionTypeLabel =
                        PERMISSION_TYPE_LABELS[permission.permissionType.toLowerCase()] ||
                        permission.permissionType;
                      return (
                        <label
                          key={permission.name}
                          htmlFor={`${isCreateFlow ? 'create' : 'edit'}-${permission.name}`}
                          className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                            isReadOnly
                              ? 'cursor-default bg-slate-50/60'
                              : 'cursor-pointer hover:bg-slate-50'
                          } ${!permission.isActive ? 'opacity-60' : ''}`}
                        >
                          <Checkbox
                            id={`${isCreateFlow ? 'create' : 'edit'}-${permission.name}`}
                            checked={selectedPermissions.includes(permission.name)}
                            disabled={isReadOnly}
                            onCheckedChange={() => togglePermission(permission.name, isCreateFlow)}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium">{permission.displayName}</div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="outline" className="text-[10px]">
                                  {permissionTypeLabel}
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void copyPermissionName(permission.name);
                                      }}
                                      tabIndex={-1}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t('admin_settings.copy_permission_code', 'Copy permission code')}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                              {permission.description || permission.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-mono">{permission.name}</span>
                              <span>· {permission.resourceType}</span>
                              {permission.isSystem ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t('admin_settings.system', 'System')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                                  {t('admin_settings.custom', 'Custom')}
                                </Badge>
                              )}
                              {!permission.isActive && (
                                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                                  {t('admin_settings.inactive', 'Inactive')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.roles', 'Rôles')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.system_roles', 'Rôles système')}
            </div>
            <div className="mt-2 text-2xl font-bold">{roleStats.systemRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin_settings.custom_roles', 'Rôles personnalisés')}
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
            {t('admin_settings.user_role_mgmt', 'Gestion des utilisateurs et des rôles')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('admin_settings.user_role_mgmt_desc', 'Gérer les rôles des utilisateurs et les autorisations')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={roleSearchTerm}
              onChange={(event) => setRoleSearchTerm(event.target.value)}
              className="pl-9"
              placeholder={t('admin_settings.search_roles', 'Rechercher des rôles, descriptions ou permissions')}
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => (open ? setIsCreateDialogOpen(true) : resetCreateDialog())}>
            <DialogTrigger asChild>
              <Button data-testid="create-role-trigger" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('admin_settings.create_role', 'Créer un rôle')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('admin_settings.create_new_role', 'Créer un nouveau rôle')}</DialogTitle>
                <DialogDescription>
                  {t('admin_settings.create_role_desc', 'Définissez un nouveau rôle avec des autorisations spécifiques pour votre établissement.')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">{t('admin_settings.role_name', 'Nom du rôle')}</Label>
                    <Input
                      id="role-name"
                      value={newRoleData.name}
                      onChange={(event) => setNewRoleData((previous) => ({ ...previous, name: event.target.value }))}
                      placeholder={t('admin_settings.enter_role_name', 'Saisir le nom du rôle')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">{t('common.description', 'Description')}</Label>
                    <Input
                      id="role-description"
                      value={newRoleData.description}
                      onChange={(event) => setNewRoleData((previous) => ({ ...previous, description: event.target.value }))}
                      placeholder={t('admin_settings.enter_role_description', 'Saisir la description du rôle')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{t('admin_settings.permissions', 'Permissions')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {newRoleData.permissions.length} {t('admin_settings.permissions_selected', 'autorisations sélectionnées')}
                      </p>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={permissionSearchTerm}
                        onChange={(event) => setPermissionSearchTerm(event.target.value)}
                        className="pl-9"
                        placeholder={t('admin_settings.search_permissions', 'Rechercher des autorisations')}
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
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending} data-testid="save-role-btn">
                  {createRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createRoleMutation.isPending
                    ? t('admin_settings.creating_role', 'Création…')
                    : t('admin_settings.create_role', 'Créer un rôle')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">{t('admin_settings.roles', 'Rôles')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('admin_settings.permissions', 'Permissions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('admin_settings.system_roles', 'Rôles système')}
              </CardTitle>
              <CardDescription>
                {t('admin_settings.manage_roles_desc', 'Gérer les rôles et leurs autorisations associées')}
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
                      <TableHead>{t('admin_settings.role', 'Rôle')}</TableHead>
                      <TableHead>{t('common.description', 'Description')}</TableHead>
                      <TableHead>{t('admin_settings.users', 'Utilisateurs')}</TableHead>
                      <TableHead>{t('admin_settings.permissions', 'Permissions')}</TableHead>
                      <TableHead>{t('admin_settings.status', 'Statut')}</TableHead>
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
                          {t('admin_settings.no_roles_found', 'Aucun rôle ne correspond à votre recherche.')}
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
                    {t('admin_settings.system_permissions', 'Permissions système')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'admin_settings.system_permissions_desc_full',
                      'All system capabilities plus any custom permissions your organisation has added. Create new custom permissions to gate features you extend or plug in.'
                    )}
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={permissionSearchTerm}
                      onChange={(event) => setPermissionSearchTerm(event.target.value)}
                      className="pl-9"
                      placeholder={t(
                        'admin_settings.search_permissions_full',
                        'Search by code, name, description or category…'
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider delayDuration={120}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-2"
                            onClick={() => exportPermissions()}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('admin_settings.export_permissions_csv', 'Export filtered list to CSV')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Dialog
                      open={isCreatePermissionDialogOpen}
                      onOpenChange={(open) =>
                        open ? setIsCreatePermissionDialogOpen(true) : resetCreatePermissionDialog()
                      }
                    >
                      <DialogTrigger asChild>
                        <Button type="button" className="h-9 items-center gap-2">
                          <ShieldPlus className="h-4 w-4" />
                          {t('admin_settings.new_custom_permission', 'New custom permission')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader>
                          <DialogTitle>
                            {t('admin_settings.create_custom_permission', 'Create a custom permission')}
                          </DialogTitle>
                          <DialogDescription>
                            {t(
                              'admin_settings.create_custom_permission_desc',
                              'Add a new permission that you can attach to roles. Use this for custom modules or granular gating that is not part of the shipped ADMIPAEDIA system.'
                            )}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="perm-name">
                              {t('admin_settings.permission_code', 'Permission code')}{' '}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="perm-name"
                              value={newPermissionData.name}
                              onChange={(event) =>
                                setNewPermissionData((previous) => ({
                                  ...previous,
                                  name: event.target.value
                                }))
                              }
                              placeholder="custom_module.action — e.g. hr_contracts.approve"
                              className="font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t(
                                'admin_settings.permission_code_help',
                                'Use lowercase with a dot separator. Prefer <resource>.<verb> or <module>.<capability>. This value cannot be changed later.'
                              )}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="perm-display-name">
                              {t('admin_settings.display_name', 'Display name')}{' '}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="perm-display-name"
                              value={newPermissionData.display_name}
                              onChange={(event) =>
                                setNewPermissionData((previous) => ({
                                  ...previous,
                                  display_name: event.target.value
                                }))
                              }
                              placeholder="e.g. Approve HR contracts"
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="perm-resource">
                                {t('admin_settings.resource_type', 'Resource type')}
                              </Label>
                              <Select
                                value={newPermissionData.resource_type}
                                onValueChange={(value) =>
                                  setNewPermissionData((previous) => ({
                                    ...previous,
                                    resource_type: value
                                  }))
                                }
                              >
                                <SelectTrigger id="perm-resource">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="perm-action">
                                {t('admin_settings.permission_action_type', 'Action type')}
                              </Label>
                              <Select
                                value={newPermissionData.permission_type}
                                onValueChange={(value) =>
                                  setNewPermissionData((previous) => ({
                                    ...previous,
                                    permission_type: value
                                  }))
                                }
                              >
                                <SelectTrigger id="perm-action">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERMISSION_TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="perm-category">
                              {t('admin_settings.category', 'Category')}
                            </Label>
                            <Select
                              value={newPermissionData.category}
                              onValueChange={(value) =>
                                setNewPermissionData((previous) => ({
                                  ...previous,
                                  category: value
                                }))
                              }
                            >
                              <SelectTrigger id="perm-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {permissionCategories
                                  .filter((cat) => cat !== 'all')
                                  .map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {getCategoryName(option)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="perm-description">
                              {t('common.description', 'Description')}
                            </Label>
                            <textarea
                              id="perm-description"
                              rows={3}
                              value={newPermissionData.description}
                              onChange={(event) =>
                                setNewPermissionData((previous) => ({
                                  ...previous,
                                  description: event.target.value
                                }))
                              }
                              placeholder="Who gets this permission and what can they do?"
                              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={resetCreatePermissionDialog}>
                            {t('common.cancel', 'Cancel')}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleCreatePermission}
                            disabled={createPermissionMutation.isPending}
                          >
                            {createPermissionMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {createPermissionMutation.isPending
                              ? t('common.saving', 'Saving…')
                              : t('admin_settings.create_permission', 'Create permission')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 rounded-md border bg-slate-50/60 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-full lg:w-64">
                    <Label className="text-xs" htmlFor="perm-cat-filter">
                      {t('admin_settings.category', 'Category')}
                    </Label>
                    <Select
                      value={permissionCategoryFilter}
                      onValueChange={(value) => setPermissionCategoryFilter(value)}
                    >
                      <SelectTrigger id="perm-cat-filter" className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionCategories.map((option) => (
                          <SelectItem key={option} value={option}>
                            {getCategoryName(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full lg:w-64">
                    <Label className="text-xs" htmlFor="perm-type-filter">
                      {t('admin_settings.action_type', 'Action type')}
                    </Label>
                    <Select
                      value={permissionTypeFilter}
                      onValueChange={(value) => setPermissionTypeFilter(value as PermissionTypeFilter)}
                    >
                      <SelectTrigger id="perm-type-filter" className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePermissionTypes.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-system-perm"
                      checked={showSystemPermissions}
                      onCheckedChange={(value) => setShowSystemPermissions(Boolean(value))}
                    />
                    <Label htmlFor="show-system-perm" className="text-xs">
                      {t('admin_settings.show_system_permissions', 'Show system permissions')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-inactive-perm"
                      checked={showInactivePermissions}
                      onCheckedChange={(value) => setShowInactivePermissions(Boolean(value))}
                    />
                    <Label htmlFor="show-inactive-perm" className="text-xs">
                      {t('admin_settings.show_inactive_permissions', 'Show inactive')}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t(
                      'admin_settings.no_matching_permissions',
                      'No permissions matched your search. Adjust the filters or clear the search box.'
                    )}
                  </div>
                ) : (
                  Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
                    const isCollapsed = !!collapsedCategories[category];
                    return (
                      <div key={category} className="space-y-3 rounded-md border">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b">
                          <button
                            type="button"
                            onClick={() => toggleCategoryCollapse(category)}
                            className="flex items-center gap-2 text-left"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            )}
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {getCategoryName(category)}
                            </h3>
                            <Badge variant="outline">{categoryPermissions.length}</Badge>
                          </button>
                        </div>
                        {!isCollapsed && (
                          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                            {categoryPermissions.map((permission) => {
                              const permissionTypeLabel =
                                PERMISSION_TYPE_LABELS[permission.permissionType.toLowerCase()] ||
                                permission.permissionType;
                              return (
                                <Card
                                  key={permission.name}
                                  className={`p-4 ${
                                    !permission.isActive ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 space-y-1">
                                        <h4 className="font-medium text-sm leading-tight">
                                          {permission.displayName}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <Badge variant="outline" className="text-[10px]">
                                            {permissionTypeLabel}
                                          </Badge>
                                          {permission.isSystem ? (
                                            <Badge variant="secondary" className="text-[10px]">
                                              {t('admin_settings.system', 'System')}
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="secondary"
                                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-100"
                                            >
                                              {t('admin_settings.custom', 'Custom')}
                                            </Badge>
                                          )}
                                          {!permission.isActive && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] border-amber-200 text-amber-700 bg-amber-50"
                                            >
                                              {t('admin_settings.inactive', 'Inactive')}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 shrink-0"
                                              onClick={() =>
                                                void copyPermissionName(permission.name)
                                              }
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {t(
                                              'admin_settings.copy_permission_code',
                                              'Copy permission code'
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug min-h-[2.5rem]">
                                      {permission.description || permission.name}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 border-t pt-2">
                                      <code className="text-[11px] text-muted-foreground truncate">
                                        {permission.name}
                                      </code>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {permission.isSystem ? (
                                          <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={() => openEditPermission(permission)}
                                                  title={t(
                                                    'admin_settings.system_permission_edit_tooltip',
                                                    'Rename, recategorise or toggle active status (code is locked)'
                                                  )}
                                                >
                                                  <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {t(
                                                  'admin_settings.system_permission_edit_tooltip',
                                                  'Edit metadata (name is locked for system permissions)'
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => openEditPermission(permission)}
                                            title={t('common.edit', 'Edit')}
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        <TooltipProvider delayDuration={100}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleDeletePermission(permission)}
                                                disabled={permission.isSystem}
                                                title={
                                                  permission.isSystem
                                                    ? t(
                                                        'admin_settings.system_permission_delete_disabled',
                                                        'System permissions cannot be deleted'
                                                      )
                                                    : t('common.delete', 'Delete')
                                                }
                                              >
                                                {permission.isSystem ? (
                                                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                                                ) : (
                                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                                )}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {permission.isSystem
                                                ? t(
                                                    'admin_settings.system_permission_delete_disabled',
                                                    'System permissions cannot be deleted'
                                                  )
                                                : t('common.delete', 'Delete')}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isEditPermissionDialogOpen}
        onOpenChange={(open) => {
          setIsEditPermissionDialogOpen(open);
          if (!open) closeEditPermission();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t('admin_settings.edit_permission', 'Edit permission')}
              {editPermissionId ? ` #${editPermissionId}` : ''}
            </DialogTitle>
            <DialogDescription>
              {editPermissionId &&
              permissions.find((p) => p.id === editPermissionId)?.isSystem ? (
                <span className="text-amber-700">
                  {t(
                    'admin_settings.system_permission_edit_locked_banner',
                    'System permission — code, resource type and action are frozen. You can only change the display name, description, category and active status.'
                  )}
                </span>
              ) : (
                t(
                  'admin_settings.edit_permission_desc',
                  'Update metadata and active status. Changes apply to every role that already references this permission.'
                )
              )}
            </DialogDescription>
          </DialogHeader>
          {editPermissionId &&
            (() => {
              const permission = permissions.find((p) => p.id === editPermissionId);
              if (!permission) return null;
              return (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('admin_settings.permission_code', 'Permission code')}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
                      <code className="text-sm flex-1 truncate">{permission.name}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void copyPermissionName(permission.name)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-perm-display">
                      {t('admin_settings.display_name', 'Display name')}{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-perm-display"
                      value={editPermissionData.display_name || ''}
                      onChange={(event) =>
                        setEditPermissionData((previous) => ({
                          ...previous,
                          display_name: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-perm-category">
                      {t('admin_settings.category', 'Category')}
                    </Label>
                    <Select
                      value={editPermissionData.category || permission.category}
                      onValueChange={(value) =>
                        setEditPermissionData((previous) => ({
                          ...previous,
                          category: value
                        }))
                      }
                    >
                      <SelectTrigger id="edit-perm-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionCategories
                          .filter((cat) => cat !== 'all')
                          .map((option) => (
                            <SelectItem key={option} value={option}>
                              {getCategoryName(option)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-perm-description">
                      {t('common.description', 'Description')}
                    </Label>
                    <textarea
                      id="edit-perm-description"
                      rows={3}
                      value={editPermissionData.description || ''}
                      onChange={(event) =>
                        setEditPermissionData((previous) => ({
                          ...previous,
                          description: event.target.value
                        }))
                      }
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-slate-50/60 px-3 py-2">
                    <div className="space-y-0.5">
                      <Label className="text-xs">
                        {t('admin_settings.permission_active', 'Active')}
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {t(
                          'admin_settings.permission_active_help',
                          'Inactive permissions remain attached to roles but are no longer enforced by the backend.'
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={editPermissionData.is_active ?? permission.isActive}
                      onCheckedChange={(value) =>
                        setEditPermissionData((previous) => ({
                          ...previous,
                          is_active: Boolean(value)
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditPermission}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePermission}
              disabled={
                updatePermissionMutation.isPending ||
                !editPermissionId ||
                !editPermissionData.display_name?.trim()
              }
            >
              {updatePermissionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {updatePermissionMutation.isPending
                ? t('common.saving', 'Saving…')
                : t('admin_settings.save_changes', 'Save changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
