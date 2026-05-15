import React from 'react';
import { vi } from 'vitest';
import { render, testAccessibility } from '../utils/testUtils';
import App from '../App';
import TeachersPage from '../pages/teachers/TeachersPage';
import StudentsPage from '../pages/students/StudentsPage';
import Dashboard from '../pages/dashboard/DashboardPage';

// Mock API calls to prevent network requests during testing
vi.mock('../services/teacherService');
vi.mock('../services/studentService');
vi.mock('../services/dashboardService');

describe('Accessibility Tests', () => {
  it('App component has no accessibility violations', async () => {
    const { container } = render(<App />);
    await testAccessibility(container);
  });

  it('Dashboard has no accessibility violations', async () => {
    const { container } = render(<Dashboard />);
    await testAccessibility(container);
  });

  it('TeachersPage has no accessibility violations', async () => {
    const { container } = render(<TeachersPage />);
    await testAccessibility(container);
  });

  it('StudentsPage has no accessibility violations', async () => {
    const { container } = render(<StudentsPage />);
    await testAccessibility(container);
  });

});
