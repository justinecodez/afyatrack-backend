# AfyaTrack API Endpoints Reference

Quick reference for all available API endpoints in both backend implementations.

## 🟢 Simple Backend (Port 5001)

### System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api` | API information |

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/auth/login` | User login | ❌ No |
| `POST` | `/api/v1/auth/logout` | User logout | ✅ Yes |

---

## 🔵 Full Backend (Port 5000)

### System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Comprehensive health check |
| `GET` | `/api` | Detailed API information |

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/auth/login` | User login | ❌ No |
| `POST` | `/api/v1/auth/logout` | User logout | ✅ Yes |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | ❌ No |
| `GET` | `/api/v1/auth/me` | Get current user | ✅ Yes |

### Patient Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/patients` | Get all patients (paginated) | ✅ Yes |
| `GET` | `/api/v1/patients?search={query}` | Search patients | ✅ Yes |
| `POST` | `/api/v1/patients` | Create new patient | ✅ Yes |
| `GET` | `/api/v1/patients/{id}` | Get patient by ID | ✅ Yes |
| `PUT` | `/api/v1/patients/{id}` | Update patient | ✅ Yes |
| `DELETE` | `/api/v1/patients/{id}` | Delete patient | ✅ Yes |

### Visit Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/visits` | Get all visits (paginated) | ✅ Yes |
| `GET` | `/api/v1/visits?patientId={id}` | Get visits by patient | ✅ Yes |
| `POST` | `/api/v1/visits` | Create new visit | ✅ Yes |
| `GET` | `/api/v1/visits/{id}` | Get visit by ID | ✅ Yes |
| `PUT` | `/api/v1/visits/{id}` | Update visit | ✅ Yes |
| `DELETE` | `/api/v1/visits/{id}` | Delete visit | ✅ Yes |

### Clinical Features
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/visits/generate-soap` | Generate SOAP note | ✅ Yes |

---

## 🔐 Authentication

### Demo Credentials
```json
{
  "email": "admin@afyatrack.com",
  "password": "AfyaTrack123!"
}
```

### Token Usage
Include in request headers:
```
Authorization: Bearer {your-jwt-token}
```

---

## 📝 Request Examples

### Login Request
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@afyatrack.com",
    "password": "AfyaTrack123!"
  }'
```

### Create Patient (Full Backend)
```bash
curl -X POST http://localhost:5000/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "name": "John Doe",
    "dateOfBirth": "1985-03-15",
    "gender": "male",
    "phone": "+255123456789",
    "address": "Dar es Salaam, Tanzania",
    "nhifNumber": "NHIF123456"
  }'
```

### Create Visit (Full Backend)
```bash
curl -X POST http://localhost:5000/api/v1/visits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "patientId": "{patient-id}",
    "visitDate": "2025-08-22T10:00:00.000Z",
    "chiefComplaint": "Maumivu ya kichwa na homa",
    "currentIllness": "Patient ameanza na maumivu ya kichwa na homa kwa siku 3",
    "status": "active"
  }'
```

### Generate SOAP Note (Full Backend)
```bash
curl -X POST http://localhost:5000/api/v1/visits/generate-soap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "chiefComplaint": "Maumivu ya kichwa na homa",
    "currentIllness": "Patient ameanza na maumivu ya kichwa na homa kwa siku 3",
    "medicalHistory": "Hakuna historia ya magonjwa makuu",
    "physicalExam": "Vital signs: BP 120/80, Temp 38.5C, HR 95"
  }'
```

---

## 📊 Response Formats

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Paginated Response (Full Backend)
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## 🚀 Quick Testing Commands

### Health Check Both Backends
```bash
# Simple Backend
curl http://localhost:5001/health

# Full Backend  
curl http://localhost:5000/health
```

### Test Authentication
```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@afyatrack.com","password":"AfyaTrack123!"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test authenticated endpoint (Full Backend)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/auth/me
```

---

## 📋 Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Invalid input data |
| `401` | Unauthorized - Authentication required/failed |
| `403` | Forbidden - Access denied |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource already exists |
| `500` | Internal Server Error - Server error |

---

## 🔄 Query Parameters

### Pagination (Full Backend)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Search
- `search` - Search term for patients (name, phone, NHIF)

### Filtering
- `patientId` - Filter visits by patient ID
- `status` - Filter visits by status
- `startDate` - Filter visits from date
- `endDate` - Filter visits to date

---

## 📚 Additional Resources

- **Postman Collection**: Import `AfyaTrack-API-Collection.postman_collection.json`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Testing Guide**: See `POSTMAN_TESTING_GUIDE.md`
- **Frontend**: http://localhost:5173 (when running)
