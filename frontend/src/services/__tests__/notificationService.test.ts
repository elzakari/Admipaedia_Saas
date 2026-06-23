import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApi = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
}));

vi.mock('@/lib/api', () => ({
  default: mockApi,
  api: mockApi,
}));

import notificationService from '@/services/notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes notification list responses from the supported backend payload', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 3,
            title: 'Exam Reminder',
            message: 'Your assessment starts tomorrow.',
            type: 'warning',
            priority: 'high',
            read: false,
            created_at: '2026-06-20T10:00:00Z',
            related_entity_type: 'exam',
            related_entity_id: 44,
            action_url: '/portal/exams/44',
            attachments: [
              {
                id: 'file-1',
                filename: 'revision-guide.pdf',
                download_url: '/uploads/revision-guide.pdf',
              },
            ],
          },
        ],
      },
    });

    const result = await notificationService.getNotifications({ limit: 10 });

    expect(mockApi.get).toHaveBeenCalledWith('/notifications', { params: { limit: 10 } });
    expect(result).toEqual([
      expect.objectContaining({
        id: '3',
        title: 'Exam Reminder',
        message: 'Your assessment starts tomorrow.',
        type: 'warning',
        category: 'system',
        priority: 'high',
        is_read: false,
        is_starred: false,
        is_archived: false,
        metadata: expect.objectContaining({
          url: '/portal/exams/44',
          related_entity_type: 'exam',
          related_entity_id: 44,
          attachments: [
            expect.objectContaining({
              id: 'file-1',
              filename: 'revision-guide.pdf',
            }),
          ],
        }),
      }),
    ]);
  });

  it('computes notification stats client-side from normalized notifications', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 11,
            title: 'Urgent update',
            message: 'Immediate action required.',
            priority: 'urgent',
            category: 'security',
            read: false,
            created_at: now.toISOString(),
          },
          {
            id: 12,
            title: 'Class reminder',
            message: 'New timetable published.',
            priority: 'medium',
            category: 'academic',
            read: true,
            created_at: threeDaysAgo.toISOString(),
          },
          {
            id: 13,
            title: 'Archive notice',
            message: 'Last term notice.',
            priority: 'low',
            category: 'administrative',
            read: false,
            created_at: eightDaysAgo.toISOString(),
          },
        ],
      },
    });

    const result = await notificationService.getNotificationStats(9);

    expect(mockApi.get).toHaveBeenCalledWith('/notifications', { params: { user_id: 9 } });
    expect(result).toEqual({
      total: 3,
      unread: 2,
      today: 1,
      this_week: 2,
      by_category: {
        security: 1,
        academic: 1,
        administrative: 1,
      },
      by_priority: {
        urgent: 1,
        medium: 1,
        low: 1,
      },
    });
  });

  it('finds a notification by id from the normalized collection', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 20, title: 'Welcome', message: 'Hello there', read: true },
          { id: 21, title: 'Unread notice', message: 'Please review', read: false },
        ],
      },
    });

    const result = await notificationService.getNotificationById('21');

    expect(result).toEqual(
      expect.objectContaining({
        id: '21',
        title: 'Unread notice',
        is_read: false,
      })
    );
  });

  it('calls the backend notification state routes for unread, star, archive, and delete', async () => {
    mockApi.patch.mockResolvedValue({ data: { success: true } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    await notificationService.markAsUnread(['10']);
    await notificationService.markAsStarred(['10'], true);
    await notificationService.archiveNotifications(['10']);
    await notificationService.deleteNotifications(['10']);

    expect(mockApi.patch).toHaveBeenCalledWith('/notifications/mark-unread', {
      notification_ids: ['10'],
    });
    expect(mockApi.patch).toHaveBeenCalledWith('/notifications/star', {
      notification_ids: ['10'],
      starred: true,
    });
    expect(mockApi.patch).toHaveBeenCalledWith('/notifications/archive', {
      notification_ids: ['10'],
      archived: true,
    });
    expect(mockApi.delete).toHaveBeenCalledWith('/notifications/delete', {
      data: { notification_ids: ['10'] },
    });
  });
});
