# ADMIPAEDIA Portal Guidance Guide

This document explains how to use ADMIPAEDIA portal by portal. It is written for school operators, teachers, parents, students, and platform administrators who need a practical guide to the main workflows in the system.

## 1. Before You Start

### Signing in
- Open the school portal URL provided by your school or platform administrator.
- Enter your email, username, or phone number, depending on how your account was created.
- Enter your password and complete any required verification step.

### Shared navigation patterns
- The left sidebar contains the main modules for your role.
- The top bar gives access to notifications, language switcher, theme options, and your profile.
- Most pages use filters for academic year, term, class, or child selection. Always confirm these filters before saving data.

### Profile and account setup
- Upload a profile picture if your role allows it.
- Review your phone number, email, and other personal details.
- Change your password after first login.
- If your avatar or profile picture does not load, refresh the page and confirm the file exists in the latest profile update.

## 2. Admin Portal

The Admin Portal is the operational center for school management.

### Main responsibilities
- Set up school structure and settings
- Manage students, staff, classes, and subjects
- Control fees, payments, and financial reports
- Monitor attendance, timetable, library, and announcements

### Recommended admin workflow
1. Complete school settings:
   - School identity
   - Academic year and current term
   - Currency
   - Branch and department setup
2. Configure academic structure:
   - Classes and streams/sections
   - Subjects
   - Teachers and class assignments
3. Set up admissions and student onboarding:
   - Admission forms
   - Student creation
   - Parent linkage
4. Configure finance:
   - Fee categories
   - Fee templates
   - Payment tracking
5. Review administration modules:
   - Staff Management
   - Academic Calendar
   - Library Management
   - Infrastructure

### Key modules

#### Students
- Add new students manually or from approved admissions.
- Edit student records to update class, DOB, guardian data, and profile picture.
- Admins can upload and lock student profile pictures.
- Use the full student record before editing if you need all synced admission details.

#### Subjects and classes
- Assign classes and teachers after saving the main subject details.
- For stream-aware classes, confirm the class display name, such as `Class 1 A` or `Class 1 B`.

#### Fees
- Create fee templates in the school currency.
- Fee templates can be applied semi-automatically for standard students.
- Scholarship or waiver cases should be handled manually.
- If a fee template has already generated student fee records, treat it as in use and create a new template for changes instead of forcing deletion.

#### Financial Management
- Use this for summaries, fee record review, and quick finance actions.
- When you need detailed fee collection or payment processing, continue into the full Fees page workflow.

#### Staff Management
- Review the mixed directory for both teaching and non-teaching staff.
- Use teacher edit for academic staff and staff edit for non-teaching HR records.
- Always confirm the directory type before editing attendance or profile details.

#### Administration
- Use Academic Calendar for school-wide events and key term planning.
- Use Library Management for books, members, digital resources, and reporting.
- Use Infrastructure for facilities and operational assets.

### Common admin checks
- Confirm academic year and term before editing fees, reports, or calendar items.
- Confirm branch/class/stream before assigning staff or students.
- Verify school currency before approving fee templates or payment records.

## 3. Teacher Portal

The Teacher Portal is focused on classroom delivery and learner tracking.

### Main responsibilities
- View assigned classes and timetable
- Take attendance
- Enter grades
- Manage assignments and class communication

### Recommended teacher workflow
1. Review dashboard for assigned classes and upcoming schedule.
2. Open the correct class.
3. Take attendance for the day.
4. Enter or update assessments and grades.
5. Review messages and announcements.

### Key modules

#### My Classes
- Open a class to access attendance, gradebook, assignments, and announcements.
- Confirm class, term, and subject before making entries.

#### Attendance
- Attendance is shared with admin workflows, so save carefully.
- Use the correct date and class register to avoid duplicates.

#### Gradebook
- Load students for the selected class and term.
- Save assessment scores, grades, and remarks.
- Confirm you are working in the right assessment structure before finalizing.

#### Messages
- Use the standard messaging workflow so communication is visible across the platform.

### Common teacher checks
- Confirm you are inside the correct class page.
- Confirm the selected term before entering grades.
- Refresh if a class roster looks incomplete after a recent enrollment change.

## 4. Parent Portal

The Parent Portal helps families monitor their children and stay aligned with school activity.

### Main responsibilities
- Monitor child performance and attendance
- Review fee balances and payment status
- Track admissions and child setup tasks
- Communicate with school staff

### Recommended parent workflow
1. Open the dashboard.
2. Select the child you want to review.
3. Move through the student tabs:
   - Dashboard
   - Academics
   - Attendance
   - Fees
   - Messages
4. Review admissions or setup tasks if the child is newly linked.

### Key modules

#### My Children
- Use the child selector first.
- Review academic snapshot, attendance trend, and pending fees.
- Open reports when you need term-by-term academic detail.

#### Fees
- Parent fee visibility is aligned to admin fee setup.
- Pending fees should reflect the real configured school fee structures and balances.

#### Messages
- Use the same messaging flow used across the platform for teacher contact and school messages.

#### Admissions
- Parents can create and manage admissions through the parent workflow.
- Use the form status and CRUD actions to avoid duplicate or orphaned applications.

### Common parent checks
- Confirm the correct child is selected before reviewing fees or reports.
- Refresh after admin updates to enrollment, class placement, or fee setup.

## 5. Student Portal

The Student Portal gives learners direct access to their academic and school information.

### Main responsibilities
- Review attendance and grades
- Track assignments
- View timetable and class information
- Read announcements and messages

### Recommended student workflow
1. Open the dashboard for quick academic and schedule insight.
2. Review grades for the selected term.
3. Check attendance history.
4. Review assignments and due dates.

### Key modules

#### Grades
- Grades are read-only from the student side.
- Confirm the active term before reviewing results.

#### Attendance
- Use attendance history to monitor presence, lateness, and trends.

#### Assignments
- Review assignment status and due dates regularly.

#### Dashboard
- Use the dashboard for quick visibility into classes, messages, and pending work.

## 6. Super Admin Portal

The Super Admin Portal is for platform-level oversight across schools or tenants.

### Main responsibilities
- Manage tenants and subscriptions
- Review platform health
- Control privileged settings
- Oversee billing and security-sensitive actions

### Recommended super admin workflow
1. Review tenant health and subscription state.
2. Check recent privileged actions and operational signals.
3. Review billing or token allocation controls where applicable.
4. Adjust platform-level settings carefully and document major changes.

### Common super admin checks
- Confirm you are changing platform configuration, not a school-level setting.
- Review audit-sensitive changes before saving.

## 7. Shared Workflows That Matter Across Portals

### Profile pictures
- User and student pictures are expected to stay consistent across portals.
- If an admin locks a student picture, student self-service updates should not override it.

### Calendar and announcements
- Calendar events and announcements should be treated as shared school communication, not isolated portal content.

### Fees and payments
- Admin fee setup is the source of truth.
- Parent and finance views should reflect the same fee records and currency.

### Attendance
- Attendance should be unique by student, class, and date.
- Teachers and admins are working on the same attendance reality.

## 8. Troubleshooting Guide

### A profile picture or avatar does not load
- Refresh the page.
- Open the profile again after re-uploading if the old file no longer exists.
- Confirm the latest saved record points to a valid image path.

### A fee template cannot be edited or deleted
- Check whether it has already created student fee records.
- If yes, create a new template instead of editing or removing the active one.

### A report card or academic record is empty
- Confirm the student has grades entered and finalized.
- Confirm the correct academic year and term are selected.
- Confirm the student progression record exists for that year.

### A portal page looks incomplete or outdated
- Refresh the page after recent setup changes.
- Recheck the selected child, class, year, term, or stream.
- Confirm the user has the correct role and permissions.

## 9. Support Checklist

When reporting a problem, include:
- Portal name
- Page name
- User role
- Academic year and term
- Student, class, or fee template involved
- Exact error message
- Screenshot if available

## 10. Suggested Next Documentation

This guide should be followed by separate deep-dive manuals for:
- Admin Portal operations manual
- Teacher classroom workflow guide
- Parent self-service guide
- Student quick-start guide
- Super Admin platform operations guide
