# Enhanced Authentication System Documentation

## Overview

The Enhanced Authentication System for ADMIPAEDIA provides enterprise-grade security features including Multi-Factor Authentication (MFA), device tracking, risk-based authentication, and comprehensive security monitoring.

## Features

### 🔐 Multi-Factor Authentication (MFA)

#### TOTP (Time-based One-Time Password)
- Industry-standard TOTP implementation using HMAC-SHA1
- Compatible with Google Authenticator, Authy, and other TOTP apps
- 30-second time windows with 6-digit codes
- QR code generation for easy setup

#### Backup Codes
- 10 single-use backup codes generated during MFA setup
- Securely hashed and stored in the database
- Can be used when primary MFA device is unavailable

#### Multiple Device Support
- Users can register multiple MFA devices
- Each device can be named and managed independently
- Support for TOTP, SMS, and email-based authentication

### 🛡️ Device Management

#### Device Fingerprinting
- Unique device identification based on browser characteristics
- Tracks user agent, screen resolution, timezone, and other attributes
- Used for security monitoring and trusted device features

#### Trusted Devices
- Users can mark frequently used devices as trusted
- Reduces MFA prompts for trusted devices
- Configurable trust duration (1-90 days)
- Automatic trust expiration and revocation

### 📊 Security Monitoring

#### Authentication Attempt Tracking
- Comprehensive logging of all authentication attempts
- Tracks success/failure, IP address, geolocation, and device info
- Risk scoring based on various factors
- Automatic suspicious activity detection

#### Security Audit Logs
- Detailed audit trail for all security-related events
- Categorized by event type and severity level
- Includes user actions, system events, and security incidents
- Searchable and filterable for security analysis

#### Risk-Based Authentication
- Intelligent threat detection using multiple signals
- IP reputation checking and geolocation analysis
- Device behavior analysis and anomaly detection
- Automatic account protection measures

### ⚙️ User Security Settings

#### Customizable Preferences
- Session timeout configuration (30 minutes to 24 hours)
- Maximum concurrent sessions (1-10)
- Login notification preferences
- Suspicious activity alert settings

#### Password Security
- Advanced password strength validation
- Password history tracking (prevents reuse)
- Configurable password expiration policies
- Secure password reset with time-limited tokens

## API Endpoints

### Authentication

#### Enhanced Login
```http
POST /api/v1/auth/login-enhanced
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "remember_me": false,
  "device_info": {
    "name": "Chrome on Windows",
    "type": "desktop"
  },
  "mfa_code": "123456",
  "trust_device": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "access_token": "<ACCESS_TOKEN_EXAMPLE>",
  "refresh_token": "<REFRESH_TOKEN_EXAMPLE>",
  "csrf_token": "abc123def456",
  "expires_in": 28800,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**Response (MFA Required):**
```json
{
  "success": false,
  "mfa_required": true,
  "mfa_token": "temp_mfa_token_123",
  "available_methods": ["totp", "backup_code"]
}
```

### MFA Management

#### Setup MFA
```http
POST /api/v1/auth/mfa/setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_name": "My Phone",
  "device_type": "totp"
}
```

**Response:**
```json
{
  "success": true,
  "secret_key": "<BASE32_SECRET_EXAMPLE>",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backup_codes": [
    "12345678",
    "87654321",
    "..."
  ]
}
```

#### Verify MFA
```http
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{
  "mfa_token": "temp_mfa_token_123",
  "code": "123456",
  "is_backup_code": false,
  "trust_device": true
}
```

### Device Management

#### Get Trusted Devices
```http
GET /api/v1/auth/devices/trusted
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "device_name": "Chrome on Windows",
      "last_seen": "2024-12-20T10:30:00Z",
      "location": {
        "country": "US",
        "city": "New York"
      },
      "trust_expires_at": "2025-01-20T10:30:00Z",
      "created_at": "2024-12-20T10:30:00Z"
    }
  ]
}
```

#### Revoke Trusted Device
```http
DELETE /api/v1/auth/devices/trusted/{device_id}
Authorization: Bearer <access_token>
```

### Security Settings

#### Get Security Settings
```http
GET /api/v1/auth/security/settings
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "mfa_enabled": true,
    "mfa_required": false,
    "session_timeout_minutes": 480,
    "max_concurrent_sessions": 5,
    "login_notifications": true,
    "suspicious_activity_alerts": true,
    "trust_new_devices": false,
    "device_trust_duration_days": 30,
    "last_password_change": "2024-12-01T10:30:00Z"
  }
}
```

#### Update Security Settings
```http
PUT /api/v1/auth/security/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "session_timeout_minutes": 240,
  "login_notifications": true,
  "trust_new_devices": true,
  "device_trust_duration_days": 14
}
```

### Session Management

#### Get User Sessions
```http
GET /api/v1/auth/sessions
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "device_info": "Chrome on Windows",
      "ip_address": "192.168.1.100",
      "location": "New York, US",
      "last_activity": "2024-12-20T10:30:00Z",
      "is_current": true,
      "created_at": "2024-12-20T08:00:00Z"
    }
  ]
}
```

#### Revoke Session
```http
DELETE /api/v1/auth/sessions/{session_id}
Authorization: Bearer <access_token>
```

## Database Schema

### MFA Devices
```sql
CREATE TABLE mfa_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    secret_key VARCHAR(32),
    backup_codes JSON,
    phone_number VARCHAR(20),
    email_address VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_used TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Trusted Devices
```sql
CREATE TABLE trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    device_fingerprint VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(100),
    user_agent TEXT,
    ip_address VARCHAR(45),
    location JSON,
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    trust_expires_at TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    login_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Authentication Attempts
```sql
CREATE TABLE authentication_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    identifier VARCHAR(255) NOT NULL,
    attempt_type VARCHAR(20) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    country VARCHAR(2),
    city VARCHAR(100),
    risk_score FLOAT NOT NULL DEFAULT 0.0,
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason VARCHAR(100),
    failure_reason VARCHAR(100),
    metadata JSON,
    attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with salt rounds
- Password strength validation includes:
  - Minimum 8 characters, maximum 128 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character
  - No common passwords or dictionary words
  - No similarity to username or email

### Token Security
- JWT tokens use HS256 algorithm with secure secret keys
- Access tokens expire after 8 hours (configurable)
- Refresh tokens expire after 30 days (configurable)
- Token revocation is supported through database blacklisting

### Rate Limiting
- Login attempts: 5 per 5 minutes per IP
- MFA setup: 3 per hour per user
- Password changes: 3 per hour per user
- Security settings updates: 10 per hour per user

### Data Protection
- All sensitive data is encrypted at rest
- Database connections use SSL/TLS
- API endpoints use HTTPS only
- CSRF protection on all state-changing operations

## Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRES=28800  # 8 hours in seconds
JWT_REFRESH_TOKEN_EXPIRES=2592000  # 30 days in seconds

# MFA Configuration
MFA_ISSUER=ADMIPAEDIA
MFA_BACKUP_CODES_COUNT=10

# Session Configuration
MAX_CONCURRENT_SESSIONS=5
SESSION_TIMEOUT=28800  # 8 hours in seconds
REMEMBER_ME_DURATION=2592000  # 30 days in seconds

# Security Configuration
BCRYPT_LOG_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=1800  # 30 minutes in seconds
```
