import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Accessibility testing helper
export const testAccessibility = async (container: HTMLElement) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Mock data generators
export const mockTeacher = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@school.com',
  subject: 'Mathematics',
  phone: '+1234567890',
  address: '123 School St',
  dateOfBirth: '1985-05-15',
  hireDate: '2020-08-01',
  status: 'active' as const,
};

export const mockStudent = {
  id: '1',
  name: 'Jane Smith',
  email: 'jane.smith@student.com',
  class: 'Grade 10A',
  rollNumber: 'S001',
  dateOfBirth: '2008-03-20',
  parentContact: '+1234567891',
  address: '456 Student Ave',
  status: 'active' as const,
};

export const mockClass = {
  id: '1',
  name: 'Grade 10A',
  teacherId: '1',
  subject: 'Mathematics',
  schedule: 'Mon, Wed, Fri 10:00-11:00',
  capacity: 30,
  enrolled: 25,
  status: 'active' as const,
};

// API mocking helpers
export const mockApiResponse = function<T>(data: T, delay = 0): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message: string, status = 500) => {
  return Promise.reject({
    response: {
      status,
      data: { message },
    },
  });
};

export * from '@testing-library/react';
export { customRender as render };