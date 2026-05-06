// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock Vite's import.meta.env
global.import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:5000',
      // Add other environment variables as needed
    }
  }
};

// Add this line to properly handle import.meta in Jest
jest.mock('./src/config/constants.ts', () => ({
  API_BASE_URL: 'http://localhost:5000',
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_PAGE: 1,
  ATTENDANCE_STATUSES: ['present', 'absent', 'late', 'excused'],
  TEACHER_STATUSES: ['active', 'inactive', 'on_leave'],
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss'
}));

// Create a Jest Setup File
// Mock recharts components for testing
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  AreaChart: function AreaChart({ children }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'area-chart' }, children);
  },
  Area: function Area({ dataKey }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': `area-${dataKey}` });
  },
  ComposedChart: function ComposedChart({ children }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'composed-chart' }, children);
  },
  LineChart: function LineChart({ children }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'line-chart' }, children);
  },
  Line: function Line({ dataKey }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': `line-${dataKey}` });
  },
  XAxis: function XAxis() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'x-axis' });
  },
  YAxis: function YAxis() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'y-axis' });
  },
  CartesianGrid: function CartesianGrid() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'cartesian-grid' });
  },
  Tooltip: function Tooltip() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'tooltip' });
  },
  Legend: function Legend() {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'legend' });
  },
  ResponsiveContainer: function ResponsiveContainer({ children }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'responsive-container' }, children);
  }
}));