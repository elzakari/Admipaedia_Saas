/**
 * Permission Management Component for RBAC Administration
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
import { usePermissions } from '../../hooks/useRBAC';
import { 
  RBACPermission, 
  CreatePermissionRequest, 
  UpdatePermissionRequest,
  ResourceType,
  PermissionType 
} from '../../types/rbac';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface PermissionManagementProps {
  className?: string;
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({ 
  className 
}) => {
  const {
    permissions,
    loading,
    error,
    createPermission,
    updatePermission,
    deletePermission,
    refreshPermissions
  } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceType | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PermissionType | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<RBACPermission | null>(null);
  const [formData, setFormData] = useState<CreatePermissionRequest>({
    name: '',
    display_name: '',
    description: '',
    resource_type: ResourceType.USER,
    permission_type: PermissionType.READ,
    scope: 'global',
    conditions: {},
    metadata: {}
  });

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResource = resourceFilter === 'all' || permission.resource_type === resourceFilter;
    const matchesType = typeFilter === 'all' || permission.permission_type === typeFilter;
    
    return matchesSearch && matchesResource && matchesType;
  });

  const handleCreatePermission = async () => {
    try {
      await createPermission(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };

  const handleUpdatePermission = async () => {
    if (!selectedPermission) return;
    
    try {
      await updatePermission(selectedPermission.id, formData as UpdatePermissionRequest);
      setIsEditDialogOpen(false);
      setSelectedPermission(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const handleDeletePermission = async (permissionId: number) => {
    if (window.confirm('Are you sure you want to delete this permission?')) {
      try {
        await deletePermission(permissionId);
      } catch (error) {
        console.error('Failed to delete permission:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      resource_type: ResourceType.USER,
      permission_type: PermissionType.READ,
      scope: 'global',
      conditions: {},
      metadata: {}
    });
  };

  const openEditDialog = (permission: RBACPermission) => {
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      display_name: permission.display_name,
      description: permission.description || '',
      resource_type: permission.resource_type,
      permission_type: permission.permission_type,
      scope: permission.scope,
      conditions: permission.conditions || {},
      metadata: permission.metadata || {}
    });
    setIsEditDialogOpen(true);
  };

  const getPermissionTypeColor = (type: PermissionType) => {
    const colors = {
      [PermissionType.READ]: 'bg-blue-100 text-blue-800',
      [PermissionType.WRITE]: 'bg-green-100 text-green-800',
      [PermissionType.DELETE]: 'bg-red-100 text-red-800',
      [PermissionType.EXECUTE]: 'bg-purple-100 text-purple-800',
      [PermissionType.ADMIN]: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getResourceTypeColor = (type: ResourceType) => {
    const colors = {
      [ResourceType.USER]: 'bg-indigo-100 text-indigo-800',
      [ResourceType.STUDENT]: 'bg-cyan-100 text-cyan-800',
      [ResourceType.TEACHER]: 'bg-teal-100 text-teal-800',
      [ResourceType.CLASS]: 'bg-yellow-100 text-yellow-800',
      [ResourceType.SUBJECT]: 'bg-pink-100 text-pink-800',
      [ResourceType.GRADE]: 'bg-emerald-100 text-emerald-800',
      [ResourceType.ATTENDANCE]: 'bg-violet-100 text-violet-800',
      [ResourceType.EXAM]: 'bg-rose-100 text-rose-800',
      [ResourceType.ASSIGNMENT]: 'bg-amber-100 text-amber-800',
      [ResourceType.REPORT]: 'bg-lime-100 text-lime-800',
      [ResourceType.SYSTEM]: 'bg-slate-100 text-slate-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Management
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Permission
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Permission</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., user.read"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Display Name</label>
                      <Input
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="e.g., Read Users"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Permission description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Resource Type</label>
                      <Select
                        value={formData.resource_type}
                        onValueChange={(value) => setFormData({ ...formData, resource_type: value as ResourceType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ResourceType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Permission Type</label>
                      <Select
                        value={formData.permission_type}
                        onValueChange={(value) => setFormData({ ...formData, permission_type: value as PermissionType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(PermissionType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Scope</label>
                    <Input
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      placeholder="e.g., global, department, class"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePermission}>
                      Create Permission
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={resourceFilter} onValueChange={(value) => setResourceFilter(value as ResourceType | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {Object.values(ResourceType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as PermissionType | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(PermissionType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-mono text-sm">
                    {permission.name}
                  </TableCell>
                  <TableCell>{permission.display_name}</TableCell>
                  <TableCell>
                    <Badge className={getResourceTypeColor(permission.resource_type)}>
                      {permission.resource_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPermissionTypeColor(permission.permission_type)}>
                      {permission.permission_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{permission.scope}</TableCell>
                  <TableCell>
                    <Badge variant={permission.is_active ? "default" : "secondary"}>
                      {permission.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(permission)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePermission(permission.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPermissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No permissions found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Permission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., user.read"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., Read Users"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Permission description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Resource Type</label>
                <Select
                  value={formData.resource_type}
                  onValueChange={(value) => setFormData({ ...formData, resource_type: value as ResourceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ResourceType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Permission Type</label>
                <Select
                  value={formData.permission_type}
                  onValueChange={(value) => setFormData({ ...formData, permission_type: value as PermissionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PermissionType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Scope</label>
              <Input
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="e.g., global, department, class"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePermission}>
                Update Permission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionManagement;