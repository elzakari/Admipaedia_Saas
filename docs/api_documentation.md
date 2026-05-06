# ADMIPAEDIA API Documentation

## Overview
Base path: `/api/v1`

This document outlines the primary API endpoints and references to their implementations in the codebase. All protected endpoints require JWT authentication unless noted.

## Authentication

- `POST /api/v1/auth/login` (Implemented in `backend/app/api/v1/auth/routes.py`)
  - Request
  ```json
  { "email": "admin@admipaedia.com", "password": "password123" }
  ```
  - Response
  ```json
  { "success": true, "access_token": "...", "refresh_token": "..." }
  ```
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- Enhanced auth and MFA endpoints (see `backend/docs/enhanced_authentication.md`)

## Users

- `GET /api/v1/users` (Implemented in `backend/app/api/v1/users/routes.py`)
- `POST /api/v1/users`
- `GET /api/v1/users/{id}`
- `PUT /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`

## Students

- `GET /api/v1/students` (Implemented in `backend/app/api/v1/students/routes.py`)
  - Query params: `page`, `per_page`, `class_id`, `status`
  - Response
  ```json
  { "success": true, "students": [ /* Student objects */ ], "pagination": { "total": 0, "pages": 0, "page": 1, "per_page": 20 } }
  ```
- `POST /api/v1/students`
  - Request
  ```json
  {
    "admission_number": "STU001",
    "date_of_birth": "2010-01-15",
    "gender": "male",
    "address": "123 Main St",
    "class_id": 1,
    "parent_id": 1,
    "email": "student001@school.com",
    "first_name": "Stephen",
    "last_name": "EPOU"
  }
  ```
  - Response
  ```json
  { "success": true, "message": "Student created successfully", "student": { /* Student */ } }
  ```
- `GET /api/v1/students/{id}`
- `PUT /api/v1/students/{id}`
  - Request (partial updates)
  ```json
  { "address": "456 Oak Ave", "class_id": 2 }
  ```
  - Response
  ```json
  { "success": true, "message": "Student updated successfully", "student": { /* Student */ } }
  ```
- `DELETE /api/v1/students/{id}`
- Enhanced students endpoints (bulk import, analytics) in `backend/app/api/v1/enhanced_students.py`

## Teachers

- `GET /api/v1/teachers` (Implemented in `backend/app/api/v1/teachers/routes.py`)
- `POST /api/v1/teachers`
- `GET /api/v1/teachers/{id}`
- `PUT /api/v1/teachers/{id}`
- `DELETE /api/v1/teachers/{id}`

## Classes

- `GET /api/v1/classes` (Implemented in `backend/app/api/v1/classes/routes.py`)
- `POST /api/v1/classes`
- `GET /api/v1/classes/{id}`
- `PUT /api/v1/classes/{id}`
- `DELETE /api/v1/classes/{id}`

## Subjects

- `GET /api/v1/subjects` (Implemented in `backend/app/api/v1/subjects/routes.py`)
- `POST /api/v1/subjects`
- `GET /api/v1/subjects/{id}`
- `PUT /api/v1/subjects/{id}`
- `DELETE /api/v1/subjects/{id}`

## Exams

- `GET /api/v1/exams` (Implemented in `backend/app/api/v1/exams/routes.py`)
- `POST /api/v1/exams`
- `GET /api/v1/exams/{id}`
- `PUT /api/v1/exams/{id}`
- `DELETE /api/v1/exams/{id}`

## Attendance

- `GET /api/v1/attendances` (Implemented in `backend/app/api/v1/attendances/routes.py:18`)
  - Query params: `page`, `per_page`, `class_id`, `student_id`, `status`, `date_from`, `date_to`
  - Response
  ```json
  {
    "success": true,
    "attendances": [ /* Attendance objects */ ],
    "pagination": { "total": 0, "pages": 0, "page": 1, "per_page": 20, "next": null, "prev": null }
  }
  ```
- `POST /api/v1/attendances` (Implemented in `backend/app/api/v1/attendances/routes.py:77`)
  - Request (AttendanceCreateSchema)
  ```json
  { "student_id": 1, "class_id": 10, "date": "2025-01-10", "status": "present", "subject_id": 5 }
  ```
  - Response
  ```json
  { "success": true, "message": "Attendance record created successfully", "attendance": { /* Attendance */ } }
  ```
- `POST /api/v1/attendances/bulk` (Implemented in `backend/app/api/v1/attendances/routes.py:142`)
  - Request (AttendanceBulkCreateSchema)
  ```json
  {
    "records": [
      { "student_id": 1, "class_id": 10, "date": "2025-01-10", "status": "present", "subject_id": 5 },
      { "student_id": 2, "class_id": 10, "date": "2025-01-10", "status": "absent", "subject_id": 5 }
    ]
  }
  ```
  - Response
  ```json
  {
    "success": true,
    "message": "2 attendance records created/updated successfully",
    "attendances": [ /* Attendance objects without nested relations */ ]
  }
  ```
- `PUT /api/v1/attendances/{id}` (Implemented in `backend/app/api/v1/attendances/routes.py:102`)
- `DELETE /api/v1/attendances/{id}` (Implemented in `backend/app/api/v1/attendances/routes.py:127`)

### Error Envelope
```json
{ "success": false, "message": "Error description", "errors": { /* field errors if validation */ } }
```

## Messages

- `GET /api/v1/messages` (Implemented in `backend/app/api/v1/messages/routes.py`)
  - Query params: `page`, `per_page`, `recipient_id`, `sender_id`, `is_read`
  - Response
  ```json
  {
    "success": true,
    "messages": [ /* Message objects */ ],
    "pagination": { "total": 0, "pages": 0, "page": 1, "per_page": 20 }
  }
  ```
- `POST /api/v1/messages`
  - Request
  ```json
  { "recipient_id": 123, "subject": "Parent-Teacher", "body": "Hello...", "attachments": [] }
  ```
  - Response
  ```json
  { "success": true, "message": "Message sent", "data": { /* Message */ } }
  ```
- `GET /api/v1/messages/{id}`
  - Response
  ```json
  { "success": true, "message": "Message retrieved", "data": { /* Message */ } }
  ```
- `DELETE /api/v1/messages/{id}`
  - Response
  ```json
  { "success": true, "message": "Message deleted" }
  ```

## RBAC

- `GET /api/v1/rbac/roles` (Implemented in `backend/app/api/v1/rbac.py`)
- `POST /api/v1/rbac/roles`
- `GET /api/v1/rbac/permissions`
- `POST /api/v1/rbac/permissions`
- `POST /api/v1/rbac/users/{user_id}/roles`
- `DELETE /api/v1/rbac/users/{user_id}/roles/{role_name}`

## Reports and Dashboard

- `GET /api/v1/reports` (Implemented in `backend/app/api/v1/reports/routes.py`)
- `GET /api/v1/dashboard` (Implemented in `backend/app/api/v1/dashboard/routes.py`)

## Calendar and Curriculum

## Competencies

- `GET /api/v1/competencies/core-competencies` (Implemented in `backend/app/api/v1/competencies/routes.py`)
  - Response
  ```json
  {
    "success": true,
    "competencies": [
      {
        "id": 1,
        "name": "Communication Collaboration",
        "description": "Ability to communicate and collaborate effectively",
        "category": "academic",
        "is_active": true,
        "code": "COMMUNICATION_COLLABORATION",
        "applicable_key_phases": [],
        "assessment_indicators": []
      }
    ]
  }
  ```

- `GET /api/v1/competencies/core-competencies/{id}/indicators`
  - Response
  ```json
  {
    "success": true,
    "indicators": [
      {
        "id": 101,
        "competency_id": 1,
        "indicator_code": "COMMUNICATION_COLLABORATION.1",
        "indicator_text": "Demonstrates active listening",
        "domain": "COMMUNICATION_COLLABORATION",
        "min_educational_level": 1,
        "max_educational_level": 6,
        "level_1_descriptor": "Beginning level",
        "level_2_descriptor": "Developing level",
        "level_3_descriptor": "Proficient level",
        "level_4_descriptor": "Advanced level",
        "is_active": true
      }
    ]
  }
  ```

- `POST /api/v1/competencies/competency-assessments`
  - Request
  ```json
  {
    "student_id": 1,
    "competency_id": 1,
    "assessment_date": "2025-01-10",
    "term": "Term 1",
    "academic_year": "2024/2025",
    "level_achieved": 3,
    "evidence": "Project work",
    "teacher_comments": "Good progress"
  }
  ```
  - Response
  ```json
  {
    "success": true,
    "message": "Competency assessment created successfully",
    "assessment": {
      "id": 2001,
      "student_id": 1,
      "competency_id": 1,
      "level_achieved": 3
    }
  }
  ```
  - Error
  ```json
  {
    "success": false,
    "message": "Validation error",
    "errors": {
      "student_id": "Invalid student_id"
    }
  }
  ```

- `GET /api/v1/competencies/students/{id}/competency-profile`
  - Response
  ```json
  {
    "success": true,
    "profile": {
      "student_id": 1,
      "academic_year": "2024/2025",
      "communication_collaboration_score": 2.5,
      "critical_thinking_score": 2.0,
      "creativity_innovation_score": 3.0,
      "cultural_identity_score": 2.0,
      "personal_development_score": 2.5,
      "digital_literacy_score": 3.0,
      "overall_score": 2.5
    }
  }
  ```
  - Error
  ```json
  { "success": false, "message": "Student not found" }
  ```

- `GET /api/v1/competencies/classes/{id}/competency-dashboard`
  - Query params: `academic_year`
  - Response
  ```json
  {
    "success": true,
    "dashboard": {
      "student_progress": [
        {
          "student_id": 1,
          "student_name": "Test Student",
          "academic_year": "2024/2025",
          "communication_collaboration_score": 2.5,
          "critical_thinking_score": 2.0,
          "creativity_innovation_score": 3.0,
          "cultural_identity_score": 2.0,
          "personal_development_score": 2.5,
          "digital_literacy_score": 3.0,
          "overall_score": 2.5
        }
      ],
      "class_averages": {
        "communication_collaboration": 2.3,
        "critical_thinking": 2.1,
        "creativity_innovation": 2.7,
        "cultural_identity": 2.2,
        "personal_development": 2.4,
        "digital_literacy": 2.8,
        "overall": 2.5
      },
      "top_performers": [
        { "student_id": 1, "student_name": "Test Student", "overall_score": 2.5 }
      ],
      "improvement_needed": [
        { "student_id": 2, "student_name": "Student Two", "weak_areas": [] }
      ]
    }
  }
  ```

- `GET /api/v1/calendar/events` (Implemented in `backend/app/api/v1/calendar/routes.py`)
- `GET /api/v1/curriculum` (Implemented in `backend/app/api/v1/curriculum/routes.py`)

## Notes
- For enhanced authentication details, see `backend/docs/enhanced_authentication.md`
- Attendance implementation notes: `docs/attendance_system.md`
