/**
 * Protected Route component for RBAC
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../../hooks/useRBAC';
import { ProtectedRouteProps, ResourceType } from '../../types/rbac';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallback,
  redirectTo = '/unauthorized'
}) => {
  const { hasPermission, hasRole, hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions, loading } = useRBAC();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAll 
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles);
    
    if (!hasRequiredRoles) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    
    if (!hasRequiredPermissions) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

/**
 * Conditional render component based on RBAC
 */
export const ConditionalRender: React.FC<{
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallback = null
}) => {
  const { hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions, loading } = useRBAC();

  if (loading) {
    return null;
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAll 
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles);
    
    if (!hasRequiredRoles) {
      return <>{fallback}</>;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * Higher-order component for RBAC protection
 */
export const withRBAC = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[] = [],
  requiredRoles: string[] = [],
  requireAll: boolean = false
) => {
  return (props: P) => (
    <ProtectedRoute
      requiredPermissions={requiredPermissions}
      requiredRoles={requiredRoles}
      requireAll={requireAll}
    >
      <Component {...props} />
    </ProtectedRoute>
  );
};