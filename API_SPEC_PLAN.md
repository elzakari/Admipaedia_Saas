# ADMIPAEDIA API Specification Plan

## 1. Platform Administration (Super Admin)

### 1.1 Tenant Management
*   `POST /api/v1/platform/tenants`: Create a new school/tenant.
    *   Body: `name`, `subdomain`, `admin_email`, `plan`, `country_code`.
*   `GET /api/v1/platform/tenants`: List all schools.
*   `GET /api/v1/platform/tenants/{id}`: Get school details + subscription status.
*   `PATCH /api/v1/platform/tenants/{id}/status`: Suspend/Activate a school.

### 1.2 Global Configuration
*   `GET /api/v1/platform/educational-systems`: List available templates (GES, NERDC, etc.).
*   `POST /api/v1/platform/educational-systems`: Create/Update a template.
*   `GET /api/v1/platform/languages`: List supported languages.

## 2. Tenant Administration (School Admin)

### 2.1 Educational System Setup
*   `GET /api/v1/tenant/educational-system`: Get current config.
*   `POST /api/v1/tenant/educational-system/apply`: Apply a template (e.g., "GES Basic").
*   `PATCH /api/v1/tenant/educational-system`: Customize grades/subjects.

### 2.2 School Settings
*   `GET /api/v1/tenant/settings`: Get school info (Logo, Address, Contact).
*   `PATCH /api/v1/tenant/settings`: Update school info.
*   `POST /api/v1/tenant/custom-domain`: Request a custom domain (e.g., `portal.myschool.com`).

## 3. Academic Modules (Missing Endpoints)

### 3.1 Timetable Management
*   `GET /api/v1/timetables`: List all schedules.
*   `POST /api/v1/timetables`: Create a new schedule (e.g., "Term 1 2025").
*   `GET /api/v1/timetables/{id}/slots`: Get all periods/lessons.
*   `POST /api/v1/timetables/{id}/slots`: Add a lesson (Class + Subject + Teacher + Time).
*   `DELETE /api/v1/timetables/slots/{slot_id}`: Remove a lesson.
*   `GET /api/v1/timetables/teacher/{teacher_id}`: Get a teacher's specific schedule.

### 3.2 Library Management
*   `GET /api/v1/library/books`: List catalog (Searchable).
*   `POST /api/v1/library/books`: Add a new book title.
*   `POST /api/v1/library/issues`: Issue a book to a user.
    *   Body: `book_id`, `user_id`, `due_date`.
*   `POST /api/v1/library/returns/{issue_id}`: Return a book.
*   `GET /api/v1/library/overdue`: List late returns.

### 3.3 Staff Management
*   `GET /api/v1/staff`: List all non-teaching staff.
*   `POST /api/v1/staff`: Add a staff member.
*   `POST /api/v1/staff/leave-requests`: Submit a leave request.
*   `PATCH /api/v1/staff/leave-requests/{id}/status`: Approve/Reject leave.

## 4. AI Services

### 4.1 Predictive Analytics
*   `POST /api/v1/ai/predict/student-performance`: Predict future grades based on history.
    *   Body: `student_id`.
*   `POST /api/v1/ai/generate/report-comment`: Generate a personalized comment.
    *   Body: `student_id`, `term_id`, `tone` (Encouraging/Critical).

## 5. Integration Services

### 5.1 Payments
*   `POST /api/v1/payments/initialize`: Start a transaction.
    *   Body: `amount`, `currency`, `gateway` (Paystack/Stripe).
*   `POST /api/v1/payments/webhook/{gateway}`: Handle callback from provider.

### 5.2 Notifications
*   `POST /api/v1/notifications/send`: Manual SMS/Email blast.
    *   Body: `recipients` (Array), `message`, `channel` (SMS/Email).
