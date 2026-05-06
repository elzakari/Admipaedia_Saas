# ADMIPAEDIA Frontend Component Plan

## 1. Core Architecture Updates

### 1.1 Multi-Tenancy (SaaS)
*   **TenantResolver**: A new high-level component (in `App.tsx`) to detect tenant from subdomain or path.
*   **TenantContext**: Global context to store current tenant info (name, logo, theme, features).
*   **FeatureGuard**: Wrapper component to conditionally render UI based on plan limits.

### 1.2 Internationalization (i18n)
*   **LanguageSwitcher**: Dropdown in `Navbar` to toggle languages.
*   **RTLProvider**: Context to handle `dir="rtl"` and flip icons dynamically.
*   **Translation Files**: Structure `public/locales/{lang}/{ns}.json` for all modules.

## 2. New Components & Pages

### 2.1 Public Pages (SaaS Marketing)
*   `LandingPage`: Hero section, features, pricing, contact.
*   `PricingPage`: Plan comparison, toggle monthly/annual.
*   `SignUpPage`: School registration wizard.
    *   `Step1_SchoolDetails`: Name, Country, Type.
    *   `Step2_AdminUser`: Email, Phone, Password.
    *   `Step3_SelectPlan`: Starter, Growth, Enterprise.

### 2.2 Admin Portal (Missing Modules)
*   **Timetable Module**:
    *   `TimetableGrid`: Drag-and-drop schedule builder.
    *   `ConflictDetector`: Visual indicator of double-booked teachers/rooms.
    *   `PeriodConfig`: Define lesson durations and breaks.
*   **Library Module**:
    *   `BookCatalog`: Searchable list with cover images.
    *   `IssueBookModal`: Form to loan books to students/staff.
    *   `OverdueReport`: List of late returns with fine calculation.
*   **Fee Management**:
    *   `FeeStructureBuilder`: Create fee items (Tuition, PTA, Bus) and assign to classes.
    *   `PaymentHistory`: Student-centric view of all transactions.
    *   `ReceiptGenerator`: PDF download of payment proof.

### 2.3 Parent Portal
*   `ChildSelector`: For parents with multiple children in the same school.
*   `FeeStatusCard`: Quick view of outstanding balance + "Pay Now" button.
*   `AttendanceView`: Calendar view of child's presence/absence.
*   `ReportCardDownload`: Secure link to PDF reports.

## 3. Component Refactoring Strategy

### 3.1 Consolidating "Enhanced" Components
*   **Goal**: Remove `Enhanced` prefix.
*   **Action**:
    1.  Compare `StudentGrid` vs `EnhancedStudentGrid`.
    2.  Merge advanced features (filters, bulk actions) into `StudentGrid`.
    3.  Update all imports to point to `StudentGrid`.
    4.  Delete `EnhancedStudentGrid`.
    5.  Repeat for `Dashboard`, `TeacherList`, etc.

### 3.2 Shared UI Library
*   Ensure all base components (`Button`, `Input`, `Modal`, `Table`) are in `src/components/ui`.
*   Verify accessibility compliance (ARIA labels, keyboard nav).
*   Implement `Skeleton` loaders for all data-fetching components.

## 4. State Management (React Query)
*   **Query Keys**: Standardize in `src/constants/queryKeys.ts`.
    *   `['tenant', 'settings']`
    *   `['students', 'list', filters]`
    *   `['fees', 'structure', session_id]`
*   **Mutations**: Use `useMutation` with optimistic updates for:
    *   Attendance marking.
    *   Grade entry.
    *   Book issue/return.
