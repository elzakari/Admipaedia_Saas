# ADMIPAEDIA RBAC System Documentation

## Overview

The Role-Based Access Control (RBAC) system provides comprehensive security and access management for the ADMIPAEDIA school management platform. It implements a hierarchical permission system with granular control over resources and actions.

## Architecture

### Core Components

1. **Models** (`app/models/rbac.py`)
   - `RBACRole`: Defines user roles with hierarchy
   - `RBACPermission`: Defines granular permissions
   - `UserRoleAssignment`: Links users to roles
   - `PermissionGrant`: Direct permission grants to users
   - `RoleHierarchy`: Defines role inheritance
   - `AccessControlList`: Resource-specific access control
   - `RoleTemplate`: Predefined role configurations

2. **Service Layer** (`app/services/rbac_service.py`)
   - `RBACService`: Core business logic for RBAC operations
   - System initialization and management
   - Role and permission assignment/revocation
   - User access validation

3. **Decorators** (`app/utils/rbac_decorators.py`)
   - `@require_permission`: Route-level permission checking
   - `@require_role`: Route-level role checking
   - `@require_any_permission`: Multiple permission options
   - `@require_all_permissions`: Multiple permission requirements

4. **API Endpoints** (`app/api/v1/rbac.py`)
   - RESTful API for RBAC management
   - CRUD operations for roles and permissions
   - User role assignment endpoints
   - System administration endpoints

5. **Frontend Components** (`frontend/src/components/administration/UserManagement.tsx`)
   - React components for RBAC management
   - Admin panel for system configuration
   - User-friendly interfaces for role/permission management

## Permission System

### Resource Types
- `user`: User management operations
- `student`: Student-specific operations
- `teacher`: Teacher-specific operations
- `class`: Class management
- `subject`: Subject management
- `exam`: Examination system
- `grade`: Grading operations
- `attendance`: Attendance tracking
- `assignment`: Assignment management
- `financial`: Financial operations
- `report`: Report generation
- `system`: System administration
- `dashboard`: Dashboard access

### Permission Types
- `create`: Create new resources
- `read`: View/read resources
- `update`: Modify existing resources
- `delete`: Remove resources
- `manage`: Full management access
- `assign`: Assignment operations
- `approve`: Approval workflows
- `export`: Data export operations

### Access Types
- `own`: Access to own resources only
- `department`: Department-level access
- `school`: School-wide access
- `system`: System-wide access

## Default Roles

### Super Admin (`super_admin`)
- **Hierarchy Level**: 1 (highest)
- **Description**: Complete system access
- **Permissions**: All system permissions
- **Use Case**: System administrators and developers

### Admin (`admin`)
- **Hierarchy Level**: 2
- **Description**: School administration
- **Permissions**: Most management permissions except system-level
- **Use Case**: School principals and administrators

### Teacher (`teacher`)
- **Hierarchy Level**: 5
- **Description**: Teaching staff access
- **Permissions**: Student management, grading, attendance, assignments
- **Use Case**: Teaching staff members

### Student (`student`)
- **Hierarchy Level**: 8
- **Description**: Student portal access
- **Permissions**: View own data, submit assignments, view grades
- **Use Case**: Student users

### Parent (`parent`)
- **Hierarchy Level**: 9
- **Description**: Parent portal access
- **Permissions**: View child's academic information
- **Use Case**: Parent/guardian users

### Staff (`staff`)
- **Hierarchy Level**: 7
- **Description**: Administrative staff
- **Permissions**: Limited administrative functions
- **Use Case**: Non-teaching staff members

## Implementation Guide

### 1. System Initialization

```python
from app.services.rbac_service import RBACService

# Initialize default permissions and roles
RBACService.initialize_default_permissions()
RBACService.initialize_default_roles()
```

### 2. Protecting Routes

```python
from app.utils.rbac_decorators import require_permission, require_role

@app.route('/api/students')
@require_permission('student', 'read')
def get_students():
    return jsonify(students)

@app.route('/api/admin/users')
@require_role('admin')
def admin_users():
    return jsonify(users)
```

### 3. Assigning Roles

```python
from app.services.rbac_service import RBACService

# Assign teacher role to user
success = RBACService.assign_role_to_user(
    user_id=user.id,
    role_name='teacher',
    assigned_by=current_user.id,
    expires_at=datetime.utcnow() + timedelta(days=365)
)
```

### 4. Checking Permissions in Code

```python
from app.services.rbac_service import RBACService

# Check if user has specific permission
has_permission = RBACService.user_has_permission(
    user_id=user.id,
    resource_type='student',
    permission_type='read'
)

# Check if user has role
has_role = RBACService.user_has_role(user.id, 'teacher')
```

### 5. Frontend Integration

```tsx
import { useRBAC } from '../hooks/useRBAC';

function StudentManagement() {
    const { hasPermission, hasRole } = useRBAC();
    
    const canCreateStudent = hasPermission('student', 'create');
    const isTeacher = hasRole('teacher');
    
    return (
        <div>
            {canCreateStudent && (
                <Button onClick={createStudent}>Add Student</Button>
            )}
        </div>
    );
}
```

## API Endpoints

### Roles Management
- `GET /api/v1/rbac/roles` - List all roles
- `POST /api/v1/rbac/roles` - Create new role
- `GET /api/v1/rbac/roles/{id}` - Get role details
- `PUT /api/v1/rbac/roles/{id}` - Update role
- `DELETE /api/v1/rbac/roles/{id}` - Delete role

### Permissions Management
- `GET /api/v1/rbac/permissions` - List all permissions
- `POST /api/v1/rbac/permissions` - Create new permission
- `GET /api/v1/rbac/permissions/{id}` - Get permission details
- `PUT /api/v1/rbac/permissions/{id}` - Update permission
- `DELETE /api/v1/rbac/permissions/{id}` - Delete permission

### User Role Assignment
- `GET /api/v1/rbac/users/{user_id}/roles` - Get user roles
- `POST /api/v1/rbac/users/{user_id}/roles` - Assign role to user
- `DELETE /api/v1/rbac/users/{user_id}/roles/{role_name}` - Revoke role from user

### Permission Checking
- `POST /api/v1/rbac/check/permission` - Check user permission
- `POST /api/v1/rbac/check/role` - Check user role
- `POST /api/v1/rbac/check/resource` - Check resource access

### System Administration
- `POST /api/v1/rbac/system/initialize` - Initialize RBAC system
- `GET /api/v1/rbac/dashboard/stats` - Get system statistics
- `POST /api/v1/rbac/system/backup` - Backup RBAC configuration
- `POST /api/v1/rbac/system/restore` - Restore RBAC configuration

## Database Schema

### Tables Created
1. `rbac_permissions` - Permission definitions
2. `rbac_roles` - Role definitions
3. `role_permissions` - Role-permission associations
4. `user_role_assignments` - User-role assignments
5. `role_hierarchy` - Role inheritance structure
6. `permission_grants` - Direct user permissions
7. `access_control_lists` - Resource-specific ACLs
8. `role_templates` - Predefined role configurations

## Security Considerations

### 1. Principle of Least Privilege
- Users are granted minimum necessary permissions
- Regular permission audits recommended
- Time-limited role assignments supported

### 2. Role Hierarchy
- Higher-level roles inherit lower-level permissions
- Prevents privilege escalation
- Clear separation of concerns

### 3. Audit Trail
- All role assignments/revocations are logged
- Permission checks can be audited
- User activity tracking

### 4. Data Protection
- Sensitive operations require explicit permissions
- Resource-level access control
- Encryption of sensitive permission data

## Testing

### Running Tests
```bash
# Run all RBAC tests
pytest backend/tests/test_rbac.py -v

# Run specific test class
pytest backend/tests/test_rbac.py::TestRBACService -v

# Run with coverage
pytest backend/tests/test_rbac.py --cov=app.services.rbac_service
```

### Test Coverage
- Model functionality
- Service layer operations
- API endpoint testing
- Decorator functionality
- Integration testing
- Security validation

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role assignments
   - Verify permission definitions
   - Review role hierarchy

2. **Role Assignment Failures**
   - Ensure role exists
   - Check user exists
   - Verify assigner permissions

3. **System Initialization Issues**
   - Check database connectivity
   - Verify migration status
   - Review error logs

### Debug Commands
```python
# Check user permissions
from app.services.rbac_service import RBACService
permissions = RBACService.get_user_permissions(user_id)

# List user roles
roles = RBACService.get_user_roles(user_id)

# Verify system health
stats = RBACService.get_system_stats()
```

## Migration Guide

### From Basic Auth to RBAC

1. **Backup existing user data**
2. **Run RBAC migrations**
3. **Initialize RBAC system**
4. **Migrate existing users to appropriate roles**
5. **Update application code to use RBAC decorators**
6. **Test thoroughly before production deployment**

## Performance Optimization

### Caching Strategy
- Role assignments cached per session
- Permission checks cached with TTL
- Database query optimization

### Database Indexing
- Indexed user_id, role_id relationships
- Composite indexes for permission checks
- Regular index maintenance

## Future Enhancements

### Planned Features
1. **Dynamic Permissions**: Runtime permission creation
2. **Conditional Access**: Time/location-based permissions
3. **Advanced Auditing**: Detailed permission usage analytics
4. **API Rate Limiting**: Permission-based rate limits
5. **Multi-tenancy**: School-specific RBAC configurations

### Integration Roadmap
1. **Single Sign-On (SSO)**: RBAC integration with external auth
2. **Mobile App**: RBAC support for mobile applications
3. **Third-party APIs**: Permission-based API access
4. **Reporting Dashboard**: Advanced RBAC analytics

## Support and Maintenance

### Regular Tasks
- Monthly permission audits
- Quarterly role reviews
- Annual security assessments
- Performance monitoring

### Contact Information
- **Development Team**: dev@admipaedia.com
- **Security Team**: security@admipaedia.com
- **Documentation**: docs@admipaedia.com

## Cross-References
- API blueprint: `backend/app/api/v1/rbac.py`
- Decorators: `backend/app/utils/rbac_decorators.py`
- Service layer: `backend/app/services/rbac_service.py`
- Tests: `backend/tests/test_rbac.py`

---

*This documentation is maintained by the ADMIPAEDIA development team and is updated with each system release.*
