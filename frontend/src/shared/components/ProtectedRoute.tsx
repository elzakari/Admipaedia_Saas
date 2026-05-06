import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  
  // Check if user is authenticated
  if (!token || !userString) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check role-based access if required
  if (requiredRoles.length > 0) {
    const user = JSON.parse(userString);
    const userRoles = user.roles || [];
    
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;