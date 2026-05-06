/**
 * Role Management Component for RBAC Administration
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
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { useRoles, usePermissions } from '../../hooks/useRBAC';
import { 
  RBACRole, 
  RBACPermission, 
  CreateRoleRequest, 
  UpdateRoleRequest 
} from '../../types/rbac';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Shield, 
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  level: number;
  max_users?: number;
  permission_names: string[];
}

const defaultFormData: RoleFormData = {
  name: '',
  display_name: '',
  description: '',
  color: '#3B82F6',
  icon: 'shield',
  level: 1,
  permission_names: []
};

const roleIcons = [
  { value: 'shield', label: 'Shield' },
  { value: 'user-shield', label: 'User Shield' },
  { value: 'academic-cap', label: 'Academic Cap' },
  { value: 'user-graduate', label: 'Graduate' },
  { value: 'users', label: 'Users' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'crown', label: 'Crown' },
  { value: 'star', label: 'Star' }
];

const roleColors = [
  '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#65A30D', '#16A34A', '#059669', '#0D9488',
  '#0891B2', '#0284C7', '#2563EB', '#4F46E5',
  '#7C3AED', '#9333EA', '#C026D3', '#DB2777'
];

/**
 * Role Management Component for RBAC
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
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { useRoles, usePermissions } from '../../hooks/useRBAC';
import { RBACRole, CreateRoleRequest, UpdateRoleRequest } from '../../types/rbac';
import { Plus, Edit, Trash2, Users, Shield, Settings } from 'lucide-react';

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  level: number;
  max_users?: number;
  permission_names: string[];
}

const defaultFormData: RoleFormData = {
  name: '',
  display_name: '',
  description: '',
  color: '#3B82F6',
  icon: 'user',
  level: 1,
  permission_names: []
};

const roleColors = [
  { value: '#DC2626', label: 'Red' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#D97706', label: 'Amber' },
  { value: '#65A30D', label: 'Lime' },
  { value: '#059669', label: 'Emerald' },
  { value: '#0891B2', label: 'Cyan' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Violet' },
  { value: '#C026D3', label: 'Fuchsia' },
  { value: '#E11D48', label: 'Rose' }
];

const roleIcons = [
  'user', 'users', 'shield', 'shield-check', 'user-shield', 'crown',
  'academic-cap', 'briefcase', 'cog', 'star', 'key', 'lock'
];

export const RoleManagement: React.FC = () => {
  const { toast } = useToast();
  const { roles, loading, error, createRole, updateRole, deleteRole, refresh } = useRoles();
  const { permissions } = usePermissions();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RBACRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    if (selectedRole) {
      setFormData({
        name: selectedRole.name,
        display_name: selectedRole.display_name,
        description: selectedRole.description || '',
        color: selectedRole.color || '#3B82F6',
        icon: selectedRole.icon || 'user',
        level: selectedRole.level,
        max_users: selectedRole.max_users || undefined,
        permission_names: selectedRole.permissions?.map(p => p.name) || []
      });
    }
  }, [selectedRole]);

  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      permission_names: prev.permission_names.includes(permissionName)
        ? prev.permission_names.filter(p => p !== permissionName)
        : [...prev.permission_names, permissionName]
    }));
  };

  const handleCreateRole = async () => {
    try {
      const response = await createRole(formData as CreateRoleRequest);
      if (response.success) {
        toast({
          title: "Success",
          description: "Role created successfully",
        });
        setIsCreateDialogOpen(false);
        setFormData(defaultFormData);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create role",
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

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await updateRole({
        id: selectedRole.id,
        ...formData
      } as UpdateRoleRequest);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Role updated successfully",
        });
        setIsEditDialogOpen(false);
        setSelectedRole(null);
        setFormData(defaultFormData);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update role",
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

  const handleDeleteRole = async (role: RBACRole) => {
    if (role.is_system) {
      toast({
        title: "Error",
        description: "Cannot delete system roles",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      try {
        const response = await deleteRole(role.id);
        if (response.success) {
          toast({
            title: "Success",
            description: "Role deleted successfully",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to delete role",
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

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || role.level.toString() === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading roles: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600">Manage system roles and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role with specific permissions and settings.
              </DialogDescription>
            </DialogHeader>
            <RoleForm
              formData={formData}
              permissions={permissions}
              permissionsByCategory={permissionsByCategory}
              onInputChange={handleInputChange}
              onPermissionToggle={handlePermissionToggle}
              isEdit={false}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="0">Level 0 (Super Admin)</SelectItem>
                <SelectItem value="1">Level 1 (Admin)</SelectItem>
                <SelectItem value="2">Level 2 (Manager)</SelectItem>
                <SelectItem value="3">Level 3 (User)</SelectItem>
                <SelectItem value="4">Level 4 (Guest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles ({filteredRoles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: role.color }}
                      >
                        {role.icon === 'shield' && <Shield className="h-4 w-4" />}
                        {role.icon === 'users' && <Users className="h-4 w-4" />}
                        {role.icon === 'settings' && <Settings className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{role.display_name}</div>
                        <div className="text-sm text-gray-500">{role.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Level {role.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.permissions?.length || 0} permissions
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.user_count || 0} users
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? "default" : "secondary"}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {role.is_system && (
                      <Badge variant="outline" className="ml-2">System</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
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
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role settings and permissions.
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            formData={formData}
            permissions={permissions}
            permissionsByCategory={permissionsByCategory}
            onInputChange={handleInputChange}
            onPermissionToggle={handlePermissionToggle}
            isEdit={true}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Role Form Component
interface RoleFormProps {
  formData: RoleFormData;
  permissions: any[];
  permissionsByCategory: Record<string, any[]>;
  onInputChange: (field: keyof RoleFormData, value: any) => void;
  onPermissionToggle: (permissionName: string) => void;
  isEdit: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  formData,
  permissions,
  permissionsByCategory,
  onInputChange,
  onPermissionToggle,
  isEdit
}) => {
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">Basic Information</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onInputChange('name', e.target.value)}
              placeholder="e.g., teacher, admin"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => onInputChange('display_name', e.target.value)}
              placeholder="e.g., Teacher, Administrator"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="Describe the role's purpose and responsibilities"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={formData.level.toString()}
              onValueChange={(value) => onInputChange('level', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - Super Admin</SelectItem>
                <SelectItem value="1">1 - Admin</SelectItem>
                <SelectItem value="2">2 - Manager</SelectItem>
                <SelectItem value="3">3 - User</SelectItem>
                <SelectItem value="4">4 - Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select
              value={formData.color}
              onValueChange={(value) => onInputChange('color', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleColors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select
              value={formData.icon}
              onValueChange={(value) => onInputChange('icon', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleIcons.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    {icon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_users">Max Users (optional)</Label>
          <Input
            id="max_users"
            type="number"
            value={formData.max_users || ''}
            onChange={(e) => onInputChange('max_users', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Leave empty for unlimited"
          />
        </div>
      </TabsContent>

      <TabsContent value="permissions" className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Select the permissions this role should have. Users with this role will inherit all selected permissions.
        </div>
        
        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize">{category.replace('_', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {categoryPermissions.map((permission) => (
                  <div key={permission.name} className="flex items-center space-x-2">
                    <Switch
                      id={permission.name}
                      checked={formData.permission_names.includes(permission.name)}
                      onCheckedChange={() => onPermissionToggle(permission.name)}
                    />
                    <Label htmlFor={permission.name} className="text-sm">
                      {permission.display_name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
};