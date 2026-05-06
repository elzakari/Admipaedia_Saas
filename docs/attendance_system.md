# Attendance System Documentation

## Overview
The ADMIPAEDIA attendance system provides comprehensive tracking of student attendance with support for multiple status options (present, absent, late, excused) and bulk operations.

## Components

### Frontend
- **ClassAttendance Component**: Core UI for marking and submitting attendance
- **AttendanceCalendar**: Visual representation of attendance patterns
- **ClassAttendanceAnalytics**: Statistical analysis of attendance data
- **useClassAttendance Hook**: Custom hook with attendance submission functionality

### Backend
- **AttendanceService**: Business logic for attendance management
- **Attendance Model**: Database structure for attendance records
- **Attendance API**: RESTful endpoints for attendance operations

## API Endpoints
- `GET /attendances`: Retrieve attendance records
- `POST /attendances`: Create a single attendance record
- `POST /attendances/bulk`: Create multiple attendance records at once
- `PUT /attendances/{id}`: Update an attendance record
- `DELETE /attendances/{id}`: Delete an attendance record
- `GET /attendances/stats`: Get attendance statistics

## Implementation Notes
- The bulk attendance API uses a specialized schema that excludes nested relationships to prevent serialization errors
- Attendance records are linked to students, classes, and subjects
- The system supports real-time updates through WebSocket integration