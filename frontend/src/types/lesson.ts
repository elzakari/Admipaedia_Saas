export type LessonStatus = 'planned' | 'in-progress' | 'completed';
export type LessonVisibility = 'private' | 'class_only' | 'school_wide' | 'public';
export type BroadcastStatus = 'scheduled' | 'live' | 'paused' | 'ended' | 'cancelled' | 'rebroadcasting';
export type AttachmentType = 'file' | 'link';
export type CommentVisibility = 'private' | 'teachers_only' | 'class' | 'school_wide';
export type NotifyMode = 'push' | 'badge' | 'none';

export interface LessonV2 {
  id: number;
  title: string;
  description?: string | null;
  date: string;
  status: LessonStatus | string;
  period_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  visibility: LessonVisibility;
  homework_due_date?: string | null;
  strand?: Record<string, unknown>[];
  objectives?: Record<string, unknown>[];
  classwork?: Record<string, unknown>;
  homework?: Record<string, unknown>;
  assessment?: Record<string, unknown>;
  materials?: Record<string, unknown>[];
  engagement_seen_count: number;
  engagement_ack_count: number;
  tenant_id?: string | null;
  subject_id?: number | null;
  subject_name?: string;
  class_id: number;
  class_name?: string | null;
  teacher_id?: number | null;
  teacher_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LessonBroadcast {
  id: number;
  lesson_id: number;
  tenant_id: string;
  parent_broadcast_id?: number | null;
  status: BroadcastStatus;
  started_at?: string | null;
  ended_at?: string | null;
  peak_viewers: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  stream_url?: string | null;
  recording_url?: string | null;
  viewer_count: number;
  is_rebroadcast: boolean;
  rebroadcast_count: number;
  broadcast_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LessonAttachment {
  id: number;
  lesson_id: number;
  tenant_id: string;
  storage_key?: string | null;
  filename: string;
  mime_type?: string | null;
  size?: number | null;
  link_url?: string | null;
  attachment_type: AttachmentType;
  display_order: number;
  uploader_id?: number | null;
  attachment_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LinkPayload {
  link_url: string;
  filename: string;
  display_order?: number;
}

export interface LessonComment {
  id: number;
  lesson_id: number;
  author_id: number;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  tenant_id: string;
  parent_comment_id?: number | null;
  content: string;
  visibility: CommentVisibility;
  requires_approval: boolean;
  is_approved: boolean;
  approved_by_id?: number | null;
  approved_at?: string | null;
  is_deleted: boolean;
  deleted_by_id?: number | null;
  deleted_at?: string | null;
  edited_at?: string | null;
  edit_count: number;
  created_by_ip?: string | null;
  created_by_user_agent?: string | null;
  comment_metadata?: Record<string, unknown>;
  replies?: LessonComment[];
  created_at: string;
  updated_at: string;
}

export interface LessonAcknowledgement {
  id?: number;
  lesson_id: number;
  user_id: number;
  user_name?: string;
  acknowledged_at: string;
  acknowledgement_type?: 'seen' | 'acknowledged';
  metadata?: Record<string, unknown>;
}

export interface LiveLessonStats {
  lesson_id: number;
  active_viewers: number;
  peak_viewers: number;
  viewer_count: number;
  acknowledgement_count: number;
  comment_count: number;
  attachment_count: number;
  broadcast_status?: BroadcastStatus;
  started_at?: string | null;
  duration_seconds?: number;
  timestamp: string;
}

export interface LessonStudioForm {
  title: string;
  description?: string | null;
  date: string;
  status?: LessonStatus;
  subject_id?: number | null;
  class_id: number;
  teacher_id?: number | null;
  period_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  visibility?: LessonVisibility;
  homework_due_date?: string | null;
  objectives?: Record<string, unknown>[];
  classwork?: Record<string, unknown>;
  homework?: Record<string, unknown>;
  assessment?: Record<string, unknown>;
  materials?: Record<string, unknown>[];
  strand?: Record<string, unknown>[];
}

export interface PerClassNotifyPref {
  class_id: number;
  notify_mode: NotifyMode;
  updated_at?: string;
}

export interface AcknowledgeLessonPayload {
  acknowledgement_type?: 'seen' | 'acknowledged';
  metadata?: Record<string, unknown>;
}

export interface CreateLessonCommentPayload {
  content: string;
  parent_comment_id?: number | null;
  visibility?: CommentVisibility;
}

export interface MonitoringKpiFilters {
  class_id?: number;
  teacher_id?: number;
  subject_id?: number;
  date_from?: string;
  date_to?: string;
  status?: LessonStatus | string;
  page?: number;
  per_page?: number;
  department_id?: number[] | number;
  period_number?: number[] | number;
  visibility?: LessonVisibility | string;
  broadcast_status?: BroadcastStatus | string;
  homework_due_from?: string;
  homework_due_to?: string;
}

export interface LessonMonitoringKpis {
  total_lessons: number;
  live_lessons: number;
  completed_lessons: number;
  planned_lessons: number;
  total_viewers: number;
  average_viewers_per_lesson: number;
  total_acknowledgements: number;
  acknowledgement_rate: number;
  total_comments: number;
  teachers_with_lessons: number;
  classes_with_lessons: number;
  lessons_without_logs_today: number;
  live_count: number;
  peak_viewers_today: number;
}
