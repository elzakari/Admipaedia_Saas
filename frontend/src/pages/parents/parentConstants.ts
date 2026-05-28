// app/frontend/src/pages/parents/parentConstants.ts

export const ALLOWED_TABS = ['dashboard', 'academics', 'attendance', 'fees', 'messages'];

export const STUDENT_TAB_CONFIG = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'academics', label: 'Études' },
    { key: 'attendance', label: 'Présence' },
    { key: 'fees', label: 'Frais' }
];

export const DEFAULT_FALLBACK_METRICS = {
    attendance_rate: 0,
    grade_average: 0,
    recent_attendance: [],
    recent_grades: []
};
