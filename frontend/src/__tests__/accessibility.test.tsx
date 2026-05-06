import React from 'react';
import { render, testAccessibility } from '../utils/testUtils';
import App from '../App';
import TeachersPage from '../pages/teachers/TeachersPage';
import StudentsPage from '../pages/students/StudentsPage';
import Dashboard from '../pages/dashboard/DashboardPage';

// Mock API calls to prevent network requests during testing
jest.mock('../services/teacherService');
jest.mock('../services/studentService');
jest.mock('../services/dashboardService');

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

  it('Form components have proper ARIA labels', async () => {
    const { container } = render(<TeachersPage />);
    
    // Check for proper form labeling
    const searchInput = container.querySelector('input[type="search"]');
    expect(searchInput).toHaveAttribute('aria-label');
    
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
    
    await testAccessibility(container);
  });
});