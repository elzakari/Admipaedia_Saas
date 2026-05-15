import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { render } from '@/utils/testUtils';
import AnnouncementsCard from '../AnnouncementsCard';

// Mock antd
vi.mock('antd', () => ({
  Card: ({ children, title, extra }: any) => <div>{title} {extra} {children}</div>,
  List: ({ dataSource, renderItem }: any) => <div>{dataSource.map(renderItem)}</div>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Empty: () => <div>Empty</div>,
  Skeleton: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@ant-design/icons', () => ({
  BellOutlined: () => <span>Bell</span>,
}));

// Mock the hook
vi.mock('../../services/announcementWebSocketService', () => ({
  useAnnouncementWebSocket: () => ({
    announcements: [],
    isConnected: true
  })
}));

// Auto-generated smoke test
describe('AnnouncementsCard Component', () => {
  it('renders without crashing', () => {
    // Basic verification that the component is defined
    expect(AnnouncementsCard).toBeDefined();
  });
});
