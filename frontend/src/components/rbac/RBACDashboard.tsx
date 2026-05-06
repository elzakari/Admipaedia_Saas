/**
 * RBAC Dashboard for managing roles, permissions, and user assignments
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  Shield, 
  Key, 
  Settings, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Eye
} from 'lucide-react';
import { useRoles, usePermissions } from '../../hooks/useRBAC';
import { ConditionalRender } from './ProtectedRoute';
import { RBACRole, RBACPermission } from '../../types/rbac';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const RBACDashboard: React.FC = () => {
  const { roles, loading: rolesLoading, createRole, updateRole, deleteRole } = useRoles();
  const { permissions, loading: permissionsLoading, createPermission, updatePermission, deletePermission } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreatePermission, setShowCreatePermission] = useState(false);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const permissionCategories = [...new Set(permissions.map(p => p.category))];

  if (rolesLoading || permissionsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RBAC Management</h1>
          <p className="text-gray-600">Manage roles, permissions, and user access control</p>
        </div>
        <ConditionalRender requiredPermissions={['system.admin', 'user.manage_roles']}>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateRole(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
            <Button onClick={() => setShowCreatePermission(true)} variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Permission
            </Button>
          </div>
        </ConditionalRender>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Roles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => r.is_active).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
              </div>
              <Key className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Roles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => r.is_system).length}
                </p>
              </div>
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles Management</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Management</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Roles</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Permissions</CardTitle>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {permissionCategories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPermissions.map((permission) => (
                  <PermissionCard key={permission.id} permission={permission} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Role Card Component
const RoleCard: React.FC<{ role: RBACRole }> = ({ role }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: role.color || '#6B7280' }}
            />
            <h3 className="font-semibold text-gray-900">{role.display_name}</h3>
          </div>
          <ConditionalRender requiredPermissions={['system.admin', 'user.manage_roles']}>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </ConditionalRender>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{role.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant={role.is_active ? "default" : "secondary"}>
              {role.is_active ? "Active" : "Inactive"}
            </Badge>
            {role.is_system && (
              <Badge variant="outline">System</Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">
            Level {role.level}
          </span>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{role.permissions?.length || 0} permissions</span>
            <span>{role.user_count || 0} users</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Permission Card Component
const PermissionCard: React.FC<{ permission: RBACPermission }> = ({ permission }) => {
  const getPermissionTypeColor = (type: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      execute: 'bg-purple-100 text-purple-800',
      manage: 'bg-indigo-100 text-indigo-800',
      approve: 'bg-orange-100 text-orange-800',
      admin: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{permission.display_name}</h3>
          <ConditionalRender requiredPermissions={['system.admin']}>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </ConditionalRender>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{permission.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={getPermissionTypeColor(permission.permission_type)}>
            {permission.permission_type}
          </Badge>
          <Badge variant="outline">
            {permission.resource_type}
          </Badge>
          <Badge variant="secondary">
            {permission.category}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500">
          <code>{permission.name}</code>
        </div>
      </CardContent>
    </Card>
  );
};