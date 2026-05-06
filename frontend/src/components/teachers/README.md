# Teacher Management Module

## API Field Naming Convention Issue

When working with the teacher API, it's important to note that there are two key considerations:

1. The backend API expects data in **snake_case** format
2. The `status` field is **read-only** during teacher creation

### Backend API Expects Snake Case

The backend API expects data in **snake_case** format for teacher creation and updates:

```typescript
// Correct format for API requests
{
  "first_name": "Stephen",
  "last_name": "EPOU",
  "phone_number": "+233598335521",
  "qualification": "B.Ed",
  "specialization": "Languages",
  "joining_date": "2021-05-15"
  // Note: status should NOT be included in creation requests
}
```

### Frontend Model Uses Camel Case

However, the frontend `Teacher` model uses **camelCase** format:

```typescript
// Frontend Teacher model
export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string; // Not phone_number
  // ...
  joinDate?: string; // Not joining_date
  // ...
  status: 'active' | 'inactive' | 'on_leave';
  // ...
}
```

## Solution

To handle this discrepancy, we've implemented two approaches:

1. **For Creating Teachers**: Use the `TeacherCreate` interface directly, which is already in snake_case format:

```typescript
export interface TeacherCreate {
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  // ...
  phone_number?: string;
  // ...
  joining_date?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}
```

2. **For Updating Teachers**: Use the `TeacherUpdate` interface, which is also in snake_case format.

3. **For Internal Frontend Use**: The data is transformed between snake_case (API) and camelCase (frontend) using the `transformTeacherFromBackend` and `transformTeacherToBackend` utility functions.

## Example Usage

See `CreateTeacherExample.tsx` for a complete example of creating a teacher with the correct field naming.

## Common Errors

If you receive an error like this:

```json
{
  "errors": {
    "status": [
      "Unknown field."
    ]
  },
  "success": false
}
```

It likely means you're using camelCase field names in your API request instead of snake_case. Make sure to use the appropriate interface (`TeacherCreate` or `TeacherUpdate`) when making API calls.