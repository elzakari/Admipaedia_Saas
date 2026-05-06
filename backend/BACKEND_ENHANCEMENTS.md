# ADMIPAEDIA Backend Enhancements

This document outlines the comprehensive backend enhancements implemented for the ADMIPAEDIA School Management System.

## Overview

The following enhancements have been added to provide advanced student management capabilities:

1. **User Creation Integration** - Seamless student account creation with user authentication
2. **Profile Picture Upload** - File upload functionality for student profile pictures
3. **Bulk Import** - CSV/Excel import for multiple students
4. **Advanced Analytics** - Performance tracking and attendance integration
5. **Parent Portal Integration** - Link students with parent accounts

## New Files Created

### Services
- `app/services/enhanced_student_service.py` - Enhanced service layer with new functionality

### API Routes
- `app/api/v1/enhanced_students.py` - New API endpoints for enhanced features

### Utilities
- `app/utils/response.py` - Standardized API response helpers
- `app/utils/decorators.py` - Enhanced with role-based access control

### Database
- `migrations/add_profile_picture_to_students.py` - Migration for profile picture field

## API Endpoints

### 1. Create Student with User Account

**POST** `/api/v1/enhanced-students/create-with-user`

**Required Roles:** `admin`, `teacher`

**Request Body:**
```json
{
  "student": {
    "admission_number": "STU001",
    "date_of_birth": "2010-01-15",
    "gender": "male",
    "address": "123 Main St",
    "class_id": 1,
    "parent_id": 1
  },
  "user": {
    "username": "student001",
    "email": "student001@school.com",
    "password": "SecurePass123!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student created successfully with user account",
  "data": {
    "id": 1,
    "admission_number": "STU001",
    "user_id": 123,
    "date_of_birth": "2010-01-15",
    "gender": "male",
    "address": "123 Main St",
    "profile_picture": null,
    "class_id": 1,
    "parent_id": 1
  }
}
```

### 2. Upload Profile Picture

**POST** `/api/v1/enhanced-students/{student_id}/profile-picture`

**Required Roles:** `admin`, `teacher`, `student`

**Request:** Multipart form data with `file` field

**Supported Formats:** PNG, JPG, JPEG, GIF

**Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profile_picture_url": "uploads/profile_pictures/1_abc123_photo.jpg"
  }
}
```

### 3. Bulk Import Students

**POST** `/api/v1/enhanced-students/bulk-import`

**Required Roles:** `admin`

**Request:** Multipart form data with:
- `file` - CSV or Excel file
- `create_users` - Boolean (optional, default: false)

**CSV/Excel Format:**
```csv
admission_number,date_of_birth,gender,address,class_id,parent_id,email,username,password
STU001,2010-01-15,male,123 Main St,1,1,student001@school.com,student001,Pass123!
STU002,2010-02-20,female,456 Oak Ave,1,2,student002@school.com,student002,Pass123!
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed. 2 students imported successfully, 0 failed.",
  "data": {
    "successful_count": 2,
    "failed_count": 0,
    "successful_imports": [
      {
        "row": 1,
        "student_id": 1,
        "admission_number": "STU001"
      }
    ],
    "failed_imports": []
  }
}
```

### 4. Get Student Analytics

**GET** `/api/v1/enhanced-students/{student_id}/analytics`

**Required Roles:** `admin`, `teacher`, `student`, `parent`

**Query Parameters:**
- `date_from` - ISO date string (optional)
- `date_to` - ISO date string (optional)

**Response:**
```json
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "data": {
    "student_id": 1,
    "period": {
      "from": "2024-01-01T00:00:00",
      "to": "2024-01-31T23:59:59"
    },
    "attendance": {
      "total_days": 20,
      "present_days": 18,
      "absent_days": 2,
      "late_days": 0,
      "attendance_rate": 90.0
    },
    "performance": {
      "average_grade": 0,
      "total_exams": 0,
      "subjects_performance": []
    },
    "trends": {
      "weekly_attendance": [
        {
          "week": "2024-01-01T00:00:00",
          "total": 5,
          "present": 5,
          "rate": 100.0
        }
      ]
    }
  }
}
```

### 5. Link Student to Parent

**POST** `/api/v1/enhanced-students/{student_id}/link-parent`

**Required Roles:** `admin`, `teacher`

**Request Body:**
```json
{
  "parent_id": 1
}
```

### 6. Get Students by Parent

**GET** `/api/v1/enhanced-students/by-parent/{parent_id}`

**Required Roles:** `admin`, `teacher`, `parent`

### 7. Generate Student Report

**GET** `/api/v1/enhanced-students/{student_id}/report`

**Required Roles:** `admin`, `teacher`, `parent`

**Query Parameters:**
- `type` - Report type (default: 'comprehensive')

### 8. Analytics Summary

**GET** `/api/v1/enhanced-students/analytics/summary`

**Required Roles:** `admin`, `teacher`

**Query Parameters:**
- `class_id` - Filter by class (optional)
- `date_from` - ISO date string (optional)
- `date_to` - ISO date string (optional)

## Database Changes

### Students Table
Added new field:
- `profile_picture` (VARCHAR(255), nullable) - Stores the file path of uploaded profile pictures

## File Upload Configuration

### Supported File Types
- PNG
- JPG/JPEG
- GIF

### Upload Directory
- `uploads/profile_pictures/` (relative to app root)
- Files are named with format: `{student_id}_{uuid}_{original_filename}`

## Security Features

### Role-Based Access Control
- All endpoints require JWT authentication
- Role-specific access controls implemented
- File upload validation and sanitization

### File Security
- Filename sanitization using `secure_filename`
- File type validation
- Unique filename generation to prevent conflicts

## Installation and Setup

### 1. Install Dependencies
```bash
pip install pandas openpyxl
```

### 2. Run Database Migration
```bash
flask db upgrade
```

### 3. Create Upload Directory
```bash
mkdir -p uploads/profile_pictures
```

### 4. Update Environment Variables
Add to your `.env` file:
```env
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB max file size
```

## Usage Examples

### Python Client Example
```python
import requests
import json

# Login and get JWT token
login_response = requests.post('http://localhost:5000/api/v1/auth/login', 
                              json={'username': 'admin', 'password': 'password'})
token = login_response.json()['access_token']

headers = {'Authorization': f'Bearer {token}'}

# Create student with user account
student_data = {
    "student": {
        "admission_number": "STU001",
        "date_of_birth": "2010-01-15",
        "gender": "male",
        "address": "123 Main St"
    },
    "user": {
        "username": "student001",
        "email": "student001@school.com",
        "password": "SecurePass123!"
    }
}

response = requests.post('http://localhost:5000/api/v1/enhanced-students/create-with-user',
                        json=student_data, headers=headers)
print(response.json())

# Upload profile picture
with open('student_photo.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:5000/api/v1/enhanced-students/1/profile-picture',
                           files=files, headers=headers)
print(response.json())
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {}
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, missing data)
- `401` - Unauthorized (invalid/missing JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Performance Considerations

### File Uploads
- Implement file size limits
- Consider using cloud storage for production
- Add image compression for large files

### Bulk Import
- Process large files in chunks
- Implement background job processing for very large imports
- Add progress tracking for long-running imports

### Analytics
- Consider caching for frequently accessed analytics
- Implement database indexing for performance
- Use pagination for large result sets

## Future Enhancements

1. **Image Processing** - Automatic resizing and optimization
2. **Background Jobs** - Async processing for bulk operations
3. **Advanced Analytics** - Machine learning insights
4. **Real-time Notifications** - WebSocket integration
5. **API Rate Limiting** - Prevent abuse
6. **Audit Logging** - Track all changes
7. **Data Export** - Generate reports in various formats