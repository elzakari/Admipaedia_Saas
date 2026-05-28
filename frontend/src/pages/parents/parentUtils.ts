// app/frontend/src/pages/parents/parentUtils.ts

export const TELEMETRY_TABS = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'academics', label: 'Études' },
    { id: 'attendance', label: 'Présence' }
];

export const EMPTY_TELEMETRY_FALLBACK = {
    grade_average: 0,
    attendance_rate: 0,
    recent_grades: [],
    recent_attendance: []
};

export const ALLOWED_TABS = ['dashboard', 'academics', 'attendance', 'fees', 'messages'];
