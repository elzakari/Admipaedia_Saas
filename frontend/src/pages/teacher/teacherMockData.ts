export type TeacherClass = {
  id: string;
  className: string;
  subject: string;
  room?: string;
  term?: string;
  roster: Array<{ id: string; name: string; status: 'active' | 'inactive'; avatar?: string }>;
};

export type TeacherTimetableItem = {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
  classId: string;
  label: string;
};

export type TeacherCalendarEvent = {
  id: string;
  date: string;
  title: string;
  location?: string;
};

export type TeacherThread = {
  id: string;
  title: string;
  participants: string;
  lastMessageAt: string;
  messages: Array<{ id: string; sender: string; body: string; sentAt: string }>;
};

export type TeacherNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  kind: 'announcement' | 'submission' | 'timetable' | 'general';
};

export const teacherClasses: TeacherClass[] = [
  {
    id: 'tcls-g10a-math',
    className: 'Grade 10-A',
    subject: 'Mathematics',
    room: 'Room 101',
    term: 'Term 2',
    roster: [
      { id: 's1', name: 'Aisha Mensah', status: 'active' },
      { id: 's2', name: 'Kofi Boateng', status: 'active' },
      { id: 's3', name: 'Zainab Ali', status: 'active' },
      { id: 's4', name: 'Samuel Okoye', status: 'inactive' }
    ]
  },
  {
    id: 'tcls-g11b-phy',
    className: 'Grade 11-B',
    subject: 'Physics',
    room: 'Lab 2',
    term: 'Term 2',
    roster: [
      { id: 's5', name: 'Fatima Bello', status: 'active' },
      { id: 's6', name: 'Daniel Njeri', status: 'active' },
      { id: 's7', name: 'Peter Adeyemi', status: 'active' }
    ]
  },
  {
    id: 'tcls-g9c-math',
    className: 'Grade 9-C',
    subject: 'Mathematics',
    room: 'Room 203',
    term: 'Term 2',
    roster: [
      { id: 's8', name: 'Mary Wanjiku', status: 'active' },
      { id: 's9', name: 'Hassan Musa', status: 'active' }
    ]
  }
];

export const teacherTimetable: TeacherTimetableItem[] = [
  { id: 'tt1', day: 'Mon', start: '08:00', end: '09:30', classId: 'tcls-g10a-math', label: 'Mathematics — Grade 10-A' },
  { id: 'tt2', day: 'Mon', start: '10:00', end: '11:30', classId: 'tcls-g11b-phy', label: 'Physics — Grade 11-B' },
  { id: 'tt3', day: 'Wed', start: '13:00', end: '14:30', classId: 'tcls-g9c-math', label: 'Mathematics — Grade 9-C' },
  { id: 'tt4', day: 'Fri', start: '08:00', end: '09:30', classId: 'tcls-g10a-math', label: 'Mathematics — Grade 10-A' }
];

export const teacherCalendarEvents: TeacherCalendarEvent[] = [
  { id: 'ce1', date: '2026-04-23', title: 'Department Meeting', location: 'Staff Room' },
  { id: 'ce2', date: '2026-04-27', title: 'Mid-term Tests Start', location: 'All classrooms' },
  { id: 'ce3', date: '2026-05-02', title: 'PTA Meeting (optional)', location: 'Hall A' }
];

export const teacherThreads: TeacherThread[] = [
  {
    id: 'th1',
    title: 'Grade 10-A — Homework',
    participants: 'You, Aisha Mensah, Kofi Boateng',
    lastMessageAt: '2026-04-20T15:10:00Z',
    messages: [
      { id: 'm1', sender: 'Aisha Mensah', body: 'Sir, do we submit exercise 5.2 today?', sentAt: '2026-04-20T14:50:00Z' },
      { id: 'm2', sender: 'You', body: 'Yes, please submit by 6pm.', sentAt: '2026-04-20T15:10:00Z' }
    ]
  },
  {
    id: 'th2',
    title: 'Grade 11-B — Lab report',
    participants: 'You, Fatima Bello',
    lastMessageAt: '2026-04-19T11:30:00Z',
    messages: [
      { id: 'm3', sender: 'Fatima Bello', body: 'Can I resubmit my report?', sentAt: '2026-04-19T11:30:00Z' }
    ]
  }
];

export const teacherNotifications: TeacherNotification[] = [
  { id: 'n1', title: 'New submission', body: '15 new submissions for Mathematics — Grade 10-A.', createdAt: '2026-04-21', unread: true, kind: 'submission' },
  { id: 'n2', title: 'Announcement', body: 'Department meeting on Thursday at 3pm.', createdAt: '2026-04-20', unread: false, kind: 'announcement' },
  { id: 'n3', title: 'Timetable change', body: 'Friday lesson moved to 09:00–10:30.', createdAt: '2026-04-19', unread: true, kind: 'timetable' }
];

