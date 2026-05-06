# ADMIPAEDIA - Claude Development Guide

## Project Overview

**ADMIPAEDIA** is a comprehensive, AI-powered school management system built with React/TypeScript frontend and Flask/Python backend. This document serves as a guide for Claude AI sessions to understand the project structure, requirements, and development standards.

## Quick Project Context

- **Type:** School Management System with AI capabilities
- **Stage:** Beta 0.1.0 - Core functionality implemented, AI integration in progress
- **Architecture:** Full-stack web application with offline capabilities
- **Primary Users:** School administrators, teachers, students, parents
- **Key Differentiator:** AI-powered insights and predictive analytics

## Technology Stack

### Frontend
```json
{
  "framework": "React 18+ with TypeScript",
  "styling": "Tailwind CSS",
  "state_management": "React Query + Context API",
  "routing": "React Router v6",
  "ui_library": "Radix UI + Custom Components",
  "forms": "React Hook Form",
  "build_tool": "Vite",
  "testing": "Jest + React Testing Library"
}
```

### Backend
```python
{
  "framework": "Flask 2.2.3",
  "database": "PostgreSQL with SQLAlchemy ORM",
  "authentication": "JWT with Flask-JWT-Extended",
  "validation": "Marshmallow schemas",
  "background_tasks": "Celery with Redis",
  "websockets": "Flask-SocketIO",
  "testing": "pytest"
}
```

## Project Structure



## Core Modules & Features

### 1. Authentication & User Management
- **JWT-based authentication** with refresh tokens
- **Role-Based Access Control (RBAC)**: Admin, Teacher, Student, Parent, Staff
- **Multi-factor authentication** support
- **Security features**: Rate limiting, password policies, breach monitoring

### 2. Student Management
- **Comprehensive profiles** with academic, personal, medical data
- **Bulk import/export** capabilities
- **Class assignments** and academic session management
- **Parent-student relationships**
- **Performance analytics** with AI insights

### 3. Teacher Portal
- **Dashboard** with AI-powered analytics
- **Class management**: Attendance, grading, assignments
- **Performance prediction** and workload analysis
- **Professional development** recommendations
- **Student engagement** metrics

### 4. Academic Management
- **Curriculum management** with learning objectives
- **Assessment framework** (formative/summative)
- **Multi-scheme grading** system
- **Exam scheduling** with conflict detection
- **Subject-teacher assignments**

### 5. Communication System
- **Multi-channel messaging** (SMS, email, in-app)
- **Role-based announcements**
- **Real-time notifications** via WebSocket
- **Parent-teacher communication** portal

### 6. AI-Powered Features
- **Performance prediction** algorithms
- **Risk assessment** for students
- **Automated insights** generation
- **Personalized recommendations**
- **Predictive analytics** for planning

## Development Standards

### Code Quality Rules
1. **TypeScript**: Use strict typing, define interfaces for all props and API responses
2. **Component Structure**: Functional components with hooks, avoid class components
3. **Styling**: Use Tailwind CSS classes, avoid inline styles
4. **API Integration**: Use React Query for data fetching and caching
5. **Error Handling**: Implement comprehensive error boundaries and validation
6. **Testing**: Write unit tests for components and integration tests for workflows

### Security Requirements
- **Input Validation**: Sanitize all user inputs
- **Authentication**: Verify JWT tokens on all protected routes
- **Authorization**: Implement role-based access checks
- **Data Encryption**: Use HTTPS for all communications
- **SQL Injection Prevention**: Use parameterized queries/ORM methods

### Performance Guidelines
- **Code Splitting**: Implement lazy loading for non-critical components
- **Caching**: Use React Query for API response caching
- **Optimization**: Minimize bundle size, optimize images
- **Mobile Performance**: Ensure responsive design and touch-friendly interfaces

## API Patterns

### Standard API Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "errors": []
}
```

### Authentication Headers
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

### Common Endpoints Pattern
GET    /api/v1/{resource}/           # List resources
POST   /api/v1/{resource}/           # Create resource
GET    /api/v1/{resource}/{id}       # Get specific resource
PUT    /api/v1/{resource}/{id}       # Update resource
DELETE /api/v1/{resource}/{id}       # Delete resource

## Key Components to Understand

### Frontend Components
- **StudentList/StudentGrid**: Student management interfaces
- **TeacherDashboard**: AI-powered teacher analytics
- **AttendanceSystem**: Digital attendance tracking
- **GradingInterface**: Multi-scheme grading system
- **CommunicationCenter**: Multi-channel messaging

### Backend Services
- **AuthService**: JWT authentication and RBAC
- **StudentService**: Student CRUD and analytics
- **TeacherService**: Teacher management and insights
- **AttendanceService**: Attendance tracking and reporting
- **AIAnalyticsService**: AI-powered insights generation

## Database Schema Key Points

### Core Tables
- **users**: Base user authentication and roles
- **students**: Student profiles and academic data
- **teachers**: Teacher profiles and assignments
- **classes**: Class definitions and student assignments
- **attendance**: Daily attendance records
- **grades**: Academic performance data
- **subjects**: Subject definitions and teacher assignments

### Relationships
- Users have roles (many-to-many)
- Students belong to classes (many-to-many)
- Teachers teach subjects (many-to-many)
- Parents linked to students (one-to-many)

## AI Integration Points

### Current AI Features
1. **Teacher Analytics**: Performance prediction, workload analysis
2. **Student Risk Assessment**: Academic and attendance risk scoring
3. **Automated Insights**: Pattern recognition in academic data
4. **Recommendation Engine**: Personalized learning suggestions

### AI Service Integration
```typescript
// Example AI service call
const insights = await AITeacherService.generateTeacherInsights(teacherId);
```

## Common Development Tasks

### Adding New Features
1. **Define TypeScript interfaces** in `/types/`
2. **Create API service methods** in `/services/`
3. **Implement backend routes** in `/api/v1/`
4. **Add database models/schemas** if needed
5. **Create React components** with proper error handling
6. **Add tests** for new functionality

### Working with Forms
```typescript
// Use React Hook Form with validation
const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
```

### API Integration Pattern
```typescript
// Use React Query for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['students', filters],
  queryFn: () => studentService.getStudents(filters)
});
```

## Testing Guidelines

### Frontend Testing
- **Unit Tests**: Test individual components and hooks
- **Integration Tests**: Test component interactions and API calls
- **E2E Tests**: Test complete user workflows with Cypress

### Backend Testing
- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints and database interactions
- **Security Tests**: Test authentication and authorization

## Deployment & Environment

### Development Setup
```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && python run.py
```

### Environment Variables
- **Frontend**: API URLs, feature flags
- **Backend**: Database URLs, JWT secrets, external API keys

## Common Issues & Solutions

### TypeScript Errors
- Always define proper interfaces for props and API responses
- Use strict typing, avoid `any` type
- Import types from dedicated type files

### API Integration Issues
- Check authentication headers
- Verify CORS configuration
- Use proper error handling with React Query

### Performance Issues
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize database queries with proper indexing

## Future Development Priorities

### Phase 2 (Q3 2024)
- Advanced AI features and predictions
- Mobile application development
- Third-party integrations (payments, SMS)
- Performance optimization

### Phase 3 (Q4 2024)
- Machine learning model improvements
- Advanced curriculum management
- Library and transportation modules

## Key Files to Reference

- **Project Rules**: `.trae/rules/project_rules.md`
- **Changelog**: `CHANGELOG.md`
- **Roadmap**: `docs/roadmap.md`
- **API Documentation**: `docs/api_documentation.md`
- **PRD**: `PRODUCT_REQUIREMENTS_DOCUMENT.md`

## Development Commands

```bash
# Start development servers
npm start                    # Both frontend and backend
npm run start:frontend       # Frontend only
npm run start:backend        # Backend only

# Testing
npm test                     # Frontend tests
cd backend && pytest        # Backend tests

# Build
npm run build               # Production build
```

---

## Quick Reference for Claude Sessions

When working on ADMIPAEDIA:

1. **Always check user roles** and implement proper RBAC
2. **Use TypeScript strictly** - define interfaces for everything
3. **Follow the modular architecture** - keep components focused
4. **Implement proper error handling** - use error boundaries and validation
5. **Consider mobile users** - ensure responsive design
6. **Think about offline capabilities** - implement caching where appropriate
7. **Security first** - validate inputs, check permissions
8. **Performance matters** - optimize queries and components
9. **Test thoroughly** - write tests for new features
10. **Document changes** - update relevant documentation

This project emphasizes **educational outcomes through technology**, so always consider the end-user experience for teachers, students, and parents when implementing features.