export type StudentClass = {
  id: string;
  subject: string;
  teacher: string;
  room?: string;
  nextSession?: string;
  announcements: Array<{ id: string; title: string; body: string; createdAt: string }>;
  materials: Array<{ id: string; title: string; kind: 'pdf' | 'link'; href: string }>;
};

export type StudentAssignment = {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
  status: 'open' | 'submitted' | 'graded';
  feedback?: string;
};

export type StudentGradeRow = {
  subject: string;
  score: number;
  grade: string;
  remarks?: string;
};

export type StudentAttendanceEvent = {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  note?: string;
};

export type StudentTimetableItem = {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
  subject: string;
  room?: string;
};

export type StudentCalendarEvent = {
  id: string;
  date: string;
  title: string;
  location?: string;
  description?: string;
};

export type StudentMessageThread = {
  id: string;
  title: string;
  participants: string;
  lastMessageAt: string;
  messages: Array<{ id: string; sender: string; body: string; sentAt: string }>;
};

export type StudentNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  kind: 'announcement' | 'grade' | 'assignment' | 'attendance' | 'general';
};

export const studentClasses: StudentClass[] = [
  {
    id: 'cls-math',
    subject: 'Mathematics',
    teacher: 'Mr. Williams',
    room: 'Room 101',
    nextSession: 'Tomorrow • 08:00–09:30',
    announcements: [
      { id: 'a1', title: 'Quiz on Friday', body: 'Revision quiz covers chapters 4–5.', createdAt: '2026-04-19' },
      { id: 'a2', title: 'Homework reminder', body: 'Submit exercise 5.2 by tomorrow.', createdAt: '2026-04-18' }
    ],
    materials: [
      { id: 'm1', title: 'Chapter 5 Notes', kind: 'pdf', href: '/privacy' },
      { id: 'm2', title: 'Practice Set', kind: 'link', href: '/terms' }
    ]
  },
  {
    id: 'cls-phy',
    subject: 'Physics',
    teacher: 'Mrs. Davis',
    room: 'Lab 2',
    nextSession: 'Thu • 10:00–11:30',
    announcements: [
      { id: 'a3', title: 'Lab coats required', body: 'Bring your lab coat for the next practical.', createdAt: '2026-04-17' }
    ],
    materials: [
      { id: 'm3', title: 'Experiment Safety Sheet', kind: 'pdf', href: '/privacy' }
    ]
  },
  {
    id: 'cls-eng',
    subject: 'English',
    teacher: 'Ms. Thompson',
    room: 'Room 105',
    nextSession: 'Fri • 13:00–14:30',
    announcements: [],
    materials: [
      { id: 'm4', title: 'Essay rubric', kind: 'pdf', href: '/terms' }
    ]
  }
];

export const studentAssignments: StudentAssignment[] = [
  {
    id: 'as1',
    classId: 'cls-math',
    title: 'Mathematics Assignment #4',
    description: 'Complete problems 1–12 on page 54.',
    dueAt: '2026-04-22T23:59:00Z',
    status: 'open'
  },
  {
    id: 'as2',
    classId: 'cls-phy',
    title: 'Physics Lab Report',
    description: 'Write a short report on the pendulum experiment.',
    dueAt: '2026-04-25T17:00:00Z',
    status: 'submitted'
  },
  {
    id: 'as3',
    classId: 'cls-eng',
    title: 'English Essay',
    description: 'Write a 500–700 word essay on the theme of resilience.',
    dueAt: '2026-04-28T09:00:00Z',
    status: 'graded',
    feedback: 'Strong structure and clear argument. Watch punctuation.'
  }
];

export const studentGradesByTerm: Record<string, StudentGradeRow[]> = {
  'Term 1': [
    { subject: 'Mathematics', score: 92, grade: 'A', remarks: 'Excellent progress' },
    { subject: 'Physics', score: 88, grade: 'A-', remarks: 'Good practical work' },
    { subject: 'English', score: 85, grade: 'B+', remarks: 'Great effort' }
  ],
  'Term 2': [
    { subject: 'Mathematics', score: 89, grade: 'A-', remarks: 'Keep it up' },
    { subject: 'Physics', score: 90, grade: 'A', remarks: 'Outstanding' },
    { subject: 'English', score: 83, grade: 'B', remarks: 'Improve vocabulary' }
  ]
};

export const studentAttendance: StudentAttendanceEvent[] = [
  { id: 'at1', date: '2026-04-18', status: 'present' },
  { id: 'at2', date: '2026-04-17', status: 'late', note: 'Traffic delay' },
  { id: 'at3', date: '2026-04-16', status: 'present' },
  { id: 'at4', date: '2026-04-15', status: 'absent', note: 'Sick' }
];

export const studentTimetable: StudentTimetableItem[] = [
  { id: 'tt1', day: 'Mon', start: '08:00', end: '09:30', subject: 'Mathematics', room: 'Room 101' },
  { id: 'tt2', day: 'Mon', start: '10:00', end: '11:30', subject: 'Physics', room: 'Lab 2' },
  { id: 'tt3', day: 'Wed', start: '13:00', end: '14:30', subject: 'English', room: 'Room 105' },
  { id: 'tt4', day: 'Fri', start: '08:00', end: '09:30', subject: 'Mathematics', room: 'Room 101' }
];

export const studentCalendarEvents: StudentCalendarEvent[] = [
  { id: 'ce1', date: '2026-04-23', title: 'Inter-house Sports', location: 'Main Field' },
  { id: 'ce2', date: '2026-04-26', title: 'PTA Meeting', location: 'Hall A' },
  { id: 'ce3', date: '2026-04-29', title: 'Science Fair', location: 'Science Block' }
];

export const studentThreads: StudentMessageThread[] = [
  {
    id: 'th1',
    title: 'Math — Homework Help',
    participants: 'You, Mr. Williams',
    lastMessageAt: '2026-04-20T16:10:00Z',
    messages: [
      { id: 'm1', sender: 'You', body: 'Please clarify question 8?', sentAt: '2026-04-20T15:55:00Z' },
      { id: 'm2', sender: 'Mr. Williams', body: 'Use the formula from section 5.2 and show steps.', sentAt: '2026-04-20T16:10:00Z' }
    ]
  },
  {
    id: 'th2',
    title: 'English — Essay Topic',
    participants: 'You, Ms. Thompson',
    lastMessageAt: '2026-04-19T11:30:00Z',
    messages: [
      { id: 'm3', sender: 'Ms. Thompson', body: 'Pick a personal example of resilience and keep it specific.', sentAt: '2026-04-19T11:30:00Z' }
    ]
  }
];

export const studentNotifications: StudentNotification[] = [
  { id: 'n1', title: 'New announcement', body: 'Quiz on Friday in Mathematics.', createdAt: '2026-04-19', unread: true, kind: 'announcement' },
  { id: 'n2', title: 'Grade posted', body: 'English Essay has been graded.', createdAt: '2026-04-18', unread: false, kind: 'grade' },
  { id: 'n3', title: 'Assignment due', body: 'Mathematics Assignment #4 is due tomorrow.', createdAt: '2026-04-21', unread: true, kind: 'assignment' }
];

