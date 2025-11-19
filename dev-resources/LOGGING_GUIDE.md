# AfyaTrack Comprehensive Logging Guide

This document describes the comprehensive logging system implemented across both backend implementations of AfyaTrack.

## 🎯 Overview

The logging system provides detailed insights into every operation happening in the backend, from HTTP requests to database operations, authentication flows, and business logic execution.

## 📊 Logging Levels

### Log Levels Hierarchy
- **`ERROR`** - Critical errors and exceptions
- **`WARN`** - Warnings and security alerts  
- **`INFO`** - General application flow and business events
- **`DEBUG`** - Detailed diagnostic information

### Log Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **HTTP** | Request/Response tracking | `🚀 HTTP Request Started` |
| **Auth** | Authentication events | `User logged in` |
| **Security** | Security-related events | `Login attempt with invalid password` |
| **Database** | Database operations | `Database SELECT users` |
| **Service** | Service method calls | `Service: AuthService.login` |
| **Business** | Business logic outcomes | `Business: User Login success` |
| **Performance** | Timing and performance | `Performance: User Login 156ms` |
| **System** | System-level events | `System: Database connection started` |

## 🔍 What Gets Logged

### ✅ Full Backend (TypeScript)

#### 1. HTTP Request Lifecycle
```json
{
  "timestamp": "2025-08-22T14:30:00.000Z",
  "level": "info",
  "message": "🚀 Starting: HTTP Request",
  "correlationId": "a1b2c3d4-e5f6-7890",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "ip": "127.0.0.1",
  "userAgent": "PostmanRuntime/7.32.0"
}
```

#### 2. Authentication Flow
```json
{
  "timestamp": "2025-08-22T14:30:00.150Z",
  "level": "info", 
  "message": "🔐 Login attempt started",
  "email": "admin@afyatrack.com",
  "correlationId": "a1b2c3d4-e5f6-7890"
}
```

#### 3. Database Operations
```json
{
  "timestamp": "2025-08-22T14:30:00.200Z",
  "level": "debug",
  "message": "Database SELECT",
  "table": "users",
  "operation": "find_user_by_email",
  "email": "admin@afyatrack.com"
}
```

#### 4. Service Operations
```json
{
  "timestamp": "2025-08-22T14:30:00.250Z",
  "level": "info",
  "message": "Service: AuthService.verify_password_complete",
  "userId": "user-123",
  "valid": true
}
```

#### 5. Performance Metrics
```json
{
  "timestamp": "2025-08-22T14:30:00.350Z",
  "level": "info",
  "message": "Performance: User Login",
  "duration": "156ms",
  "userId": "user-123",
  "email": "admin@afyatrack.com"
}
```

#### 6. Security Events
```json
{
  "timestamp": "2025-08-22T14:30:00.400Z",
  "level": "warn",
  "message": "Security: Login attempt with invalid password",
  "userId": "user-123",
  "email": "admin@afyatrack.com"
}
```

#### 7. Error Tracking
```json
{
  "timestamp": "2025-08-22T14:30:00.500Z",
  "level": "error",
  "message": "Database connection failed",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\\n    at Database.connect...",
  "correlationId": "a1b2c3d4-e5f6-7890"
}
```

### ✅ Simple Backend (JavaScript)

#### 1. Request Tracking
```
[2025-08-22T14:30:00.000Z] INFO: 🚀 HTTP Request Started {"correlationId":"xyz-123","method":"POST","url":"/api/v1/auth/login","ip":"127.0.0.1"}
```

#### 2. Authentication Steps
```
[2025-08-22T14:30:00.100Z] INFO: 🔐 Login attempt started {"correlationId":"xyz-123","email":"admin@afyatrack.com"}
[2025-08-22T14:30:00.150Z] DEBUG: Querying user from database {"correlationId":"xyz-123","email":"admin@afyatrack.com"}
[2025-08-22T14:30:00.200Z] DEBUG: Database query completed {"correlationId":"xyz-123","email":"admin@afyatrack.com","userFound":true}
[2025-08-22T14:30:00.250Z] DEBUG: Verifying password {"correlationId":"xyz-123","userId":"user-123","email":"admin@afyatrack.com"}
[2025-08-22T14:30:00.300Z] DEBUG: Password verification completed {"correlationId":"xyz-123","userId":"user-123","valid":true}
[2025-08-22T14:30:00.350Z] INFO: ✅ Login successful {"correlationId":"xyz-123","userId":"user-123","email":"admin@afyatrack.com","role":"admin","duration":"350ms"}
```

## 🔗 Correlation IDs

Every request gets a unique correlation ID that tracks the request through its entire lifecycle:

- **Generated**: When request starts
- **Propagated**: Through all logging calls
- **Returned**: In response headers as `X-Correlation-ID`
- **Used for**: Tracing specific requests across logs

## 📈 Performance Monitoring

### Timing Logs
Every operation includes timing information:

```json
{
  "operation": "User Login",
  "duration": "156ms",
  "slow": true  // if > 1000ms
}
```

### Performance Alerts
- Requests > 1000ms are flagged as `slow: true`
- Database operations > 500ms logged as warnings
- Memory usage tracked in system logs

## 🛡️ Security Logging

### Authentication Events
- ✅ Successful logins
- ❌ Failed login attempts  
- 🔄 Token refreshes
- 🚪 Logouts
- 🔒 Account lockouts

### Security Alerts
- Invalid password attempts
- Non-existent email attempts
- Inactive account access attempts
- Token manipulation attempts
- Suspicious IP patterns

## 💾 Log Storage & Rotation

### Full Backend
- **Location**: `backend/logs/`
- **Main Log**: `app.log` (all levels)
- **Error Log**: `error.log` (errors only)
- **Exception Log**: `exceptions.log` (uncaught exceptions)
- **Rejection Log**: `rejections.log` (unhandled rejections)

### Rotation Settings
- **Max Size**: 5MB per file
- **Max Files**: 5 files kept
- **Automatic**: Rotates when size limit reached

### Simple Backend
- **Console Output**: Real-time logging to stdout/stderr
- **No File Storage**: Logs to console only
- **Docker Friendly**: Works with container log drivers

## 🔧 Configuration

### Environment Variables
```bash
# Full Backend
LOG_LEVEL=debug          # debug, info, warn, error
LOG_FILE=./logs/app.log  # Log file path

# Simple Backend  
NODE_ENV=development     # Affects log verbosity
```

### Log Levels by Environment

| Environment | Full Backend | Simple Backend |
|-------------|-------------|----------------|
| **Development** | `debug` | All messages |
| **Production** | `info` | Info+ messages |
| **Test** | `warn` | Warnings+ only |

## 📊 Log Analysis Examples

### 1. Trace a Specific Request
```bash
# Find all logs for a correlation ID
grep "a1b2c3d4-e5f6-7890" logs/app.log
```

### 2. Monitor Authentication
```bash
# Find all login attempts
grep "Login attempt" logs/app.log

# Find failed logins
grep "Login failed" logs/app.log
```

### 3. Performance Analysis
```bash
# Find slow requests
grep "slow.*true" logs/app.log

# Find requests > 1000ms
grep "duration.*[0-9][0-9][0-9][0-9]ms" logs/app.log
```

### 4. Security Monitoring
```bash
# Find security events
grep "Security:" logs/app.log

# Find error patterns
grep "ERROR" logs/error.log | tail -20
```

## 🛠️ Development Tools

### Real-time Log Monitoring
```bash
# Full Backend
tail -f backend/logs/app.log

# Simple Backend
cd backend && npm run simple:js
```

### Structured Log Parsing
```bash
# Parse JSON logs (Full Backend)
cat logs/app.log | jq 'select(.level=="error")'

# Filter by user
cat logs/app.log | jq 'select(.userId=="user-123")'
```

## 🎯 Best Practices

### 1. **Use Appropriate Log Levels**
- `ERROR`: Only for actual errors that need attention
- `WARN`: For concerning but non-breaking events
- `INFO`: For normal business flow tracking
- `DEBUG`: For detailed diagnostic information

### 2. **Include Context**
Always include relevant context:
```javascript
logInfo('User action completed', {
  userId: user.id,
  action: 'update_profile',
  correlationId: req.correlationId,
  duration: '125ms'
});
```

### 3. **Sanitize Sensitive Data**
Never log:
- Passwords
- Tokens (full values)
- Credit card numbers
- Personal identifiable information

### 4. **Use Correlation IDs**
Always propagate correlation IDs through the request chain for traceability.

## 📱 Integration with Monitoring

### Log Aggregation
The structured JSON format (Full Backend) integrates well with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **New Relic**

### Alerting
Set up alerts for:
- High error rates
- Slow response times
- Security events
- System resource issues

## 🔍 Troubleshooting Common Issues

### 1. **No Logs Appearing**
- Check log level configuration
- Verify file permissions
- Ensure log directory exists

### 2. **Too Verbose Logging**
- Increase log level (debug → info → warn)
- Filter specific components

### 3. **Performance Impact**
- Logging is optimized for minimal performance impact
- Async logging used where possible
- Consider log level in production

### 4. **Disk Space Issues**
- Log rotation is automatic
- Monitor disk usage in production
- Adjust retention policies as needed

## 📚 Log Message Reference

### Common Log Messages

| Message Pattern | Level | Description |
|----------------|-------|-------------|
| `🚀 Starting: *` | DEBUG | Operation started |
| `✅ Completed: *` | DEBUG | Operation completed |
| `🔐 Login attempt started` | INFO | Authentication started |
| `✅ Login successful` | INFO | Authentication succeeded |
| `❌ Login failed` | WARN | Authentication failed |
| `Database SELECT/INSERT/UPDATE` | DEBUG | Database operations |
| `Performance: * [time]ms` | INFO | Performance timing |
| `Security: *` | WARN | Security events |
| `🚨 CRITICAL: *` | ERROR | Critical system errors |

This comprehensive logging system provides complete visibility into your AfyaTrack backend operations, making debugging, monitoring, and security analysis much more effective.
