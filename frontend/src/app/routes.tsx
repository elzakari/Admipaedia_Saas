import { RouteObject } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import ClassesPage from '../pages/ClassesPage';
// Import other pages...

export const routes: RouteObject[] = [
  // ... existing routes ...
  {
    path: '/classes',
    element: (
      <ProtectedRoute>
        <ClassesPage />
      </ProtectedRoute>
    ),
  },
  // ... other routes ...
];

export default routes;