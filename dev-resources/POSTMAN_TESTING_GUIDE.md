# AfyaTrack API Testing with Postman

This guide explains how to use the provided Postman collection to test the AfyaTrack backend APIs.

## Files Included

1. **`AfyaTrack-API-Collection.postman_collection.json`** - Complete API collection
2. **`AfyaTrack-Environment.postman_environment.json`** - Environment variables
3. **`POSTMAN_TESTING_GUIDE.md`** - This guide

## Quick Setup

### 1. Import into Postman

1. Open Postman
2. Click **Import** in the top left
3. Drag and drop both JSON files or click **Upload Files**
4. Select both files:
   - `AfyaTrack-API-Collection.postman_collection.json`
   - `AfyaTrack-Environment.postman_environment.json`

### 2. Select Environment

1. In the top right corner of Postman, select **"AfyaTrack Development"** from the environment dropdown
2. The environment contains pre-configured URLs and demo credentials

### 3. Start Backend Server

Choose one of the backend implementations:

**Option A: Simple Backend (Recommended for testing)**
```bash
cd backend
npm run simple:js
```

**Option B: Full Backend (Complete features)**
```bash
cd backend
npm run dev
```

## Collection Structure

### 🔹 Simple Backend (Port 5001)
- **Health Check** - Verify server is running
- **API Information** - Get API details
- **Login** - Authenticate and get token
- **Logout** - Sign out

### 🔹 Full Backend (Port 5000)
- **System**
  - Health Check
  - API Information
- **Authentication**
  - Login (with auto token storage)
  - Refresh Token
  - Logout
  - Get Current User
- **Patients**
  - Get All Patients (with pagination)
  - Search Patients
  - Create Patient (auto-saves patient ID)
  - Get Patient by ID
  - Update Patient
  - Delete Patient
- **Visits**
  - Get All Visits
  - Get Visits by Patient
  - Create Visit (auto-saves visit ID)
  - Get Visit by ID
  - Update Visit
  - Generate SOAP Note
  - Delete Visit

### 🔹 Test Scenarios
- **Complete Patient Flow** - End-to-end workflow test

## Testing Workflows

### Basic Authentication Test

1. **Start Simple Backend**: `npm run simple:js`
2. **Run Health Check**: Verify server is running
3. **Login**: Use demo credentials (auto-populated)
4. **Logout**: Test session termination

### Complete Patient Management Flow

1. **Start Full Backend**: `npm run dev`
2. **Login**: Authenticate first
3. **Create Patient**: Add new patient record
4. **Create Visit**: Document patient visit
5. **Generate SOAP**: Create clinical note
6. **Update Visit**: Complete the visit

### Testing Both Backends

You can test both backends simultaneously:

1. Start Simple Backend: `npm run simple:js` (Port 5001)
2. Start Full Backend: `npm run dev` (Port 5000)
3. Use the appropriate collection folders for each backend

## Demo Credentials

The collection includes pre-configured demo credentials:

- **Email**: `admin@afyatrack.com`
- **Password**: `AfyaTrack123!`

These are automatically used in the login requests.

## Environment Variables

The environment automatically manages these variables:

| Variable | Description | Auto-Updated |
|----------|-------------|--------------|
| `baseUrl` | Current backend URL | Manual |
| `simpleBackendUrl` | Simple backend URL (5001) | Fixed |
| `fullBackendUrl` | Full backend URL (5000) | Fixed |
| `authToken` | JWT authentication token | ✅ Yes |
| `refreshToken` | JWT refresh token | ✅ Yes |
| `userId` | Current user ID | ✅ Yes |
| `patientId` | Test patient ID | ✅ Yes |
| `visitId` | Test visit ID | ✅ Yes |

## Automated Testing Features

### Token Management
- Login requests automatically save authentication tokens
- All authenticated requests use the saved token
- Tokens are shared across all requests

### ID Tracking
- Patient creation saves the patient ID for subsequent requests
- Visit creation saves the visit ID for subsequent requests
- Easy to test CRUD operations without manual ID copying

### Test Assertions
The "Complete Patient Flow" includes automated tests:
- Login success validation
- Patient creation validation
- Visit creation validation
- SOAP generation validation

## Common Testing Scenarios

### 1. API Health Check
```
GET {{baseUrl}}/health
```
Expected: `200 OK` with health status

### 2. Authentication Flow
```
POST {{baseUrl}}/api/v1/auth/login
Body: { "email": "admin@afyatrack.com", "password": "AfyaTrack123!" }
```
Expected: `200 OK` with user data and token

### 3. Patient Management
```
# Create Patient
POST {{baseUrl}}/api/v1/patients
Headers: Authorization: Bearer {{authToken}}
Body: Patient data

# Get Patient
GET {{baseUrl}}/api/v1/patients/{{patientId}}
Headers: Authorization: Bearer {{authToken}}
```

### 4. Visit Documentation
```
# Create Visit
POST {{baseUrl}}/api/v1/visits
Headers: Authorization: Bearer {{authToken}}
Body: Visit data

# Generate SOAP Note
POST {{baseUrl}}/api/v1/visits/generate-soap
Headers: Authorization: Bearer {{authToken}}
Body: Clinical data
```

## Error Testing

Test error scenarios by:

1. **Invalid Credentials**: Change login password
2. **Missing Token**: Remove Authorization header
3. **Invalid IDs**: Use non-existent patient/visit IDs
4. **Invalid Data**: Send malformed JSON or missing required fields

## Switching Between Backends

### Method 1: Change Environment Variable
1. Open Environment settings
2. Change `baseUrl` from `http://localhost:5001` to `http://localhost:5000`
3. Save and continue testing

### Method 2: Use Specific URLs
- Use `{{simpleBackendUrl}}` for simple backend requests
- Use `{{fullBackendUrl}}` for full backend requests

## Running Collection Tests

### Manual Testing
1. Start with authentication requests
2. Run requests in logical order (Create → Read → Update → Delete)
3. Check response status and data

### Automated Testing
1. Use the "Complete Patient Flow" folder
2. Right-click → "Run Folder"
3. Postman will run all requests in sequence with automated validation

## Troubleshooting

### Backend Not Responding
- Check if backend server is running
- Verify correct port in environment variables
- Check backend console for errors

### Authentication Failures
- Verify demo credentials are correct
- Check if login request completed successfully
- Ensure token is saved in environment variables

### CORS Errors
- Backend CORS is configured for `localhost:5173` and `localhost:3000`
- No CORS issues expected with API testing

### Database Errors
- Simple backend creates SQLite database automatically
- Full backend may need database migration: `npm run db:migrate`

## Sample API Responses

### Health Check Response
```json
{
  "success": true,
  "message": "AfyaTrack Simple API is running",
  "timestamp": "2025-08-22T14:00:00.000Z",
  "version": "1.0.0"
}
```

### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "admin@afyatrack.com",
      "name": "System Administrator",
      "role": "admin"
    },
    "token": "jwt-token-here",
    "expiresAt": "2025-08-23T14:00:00.000Z"
  }
}
```

### Patient Creation Response
```json
{
  "success": true,
  "message": "Patient created successfully",
  "data": {
    "id": "patient-id",
    "name": "John Doe",
    "dateOfBirth": "1985-03-15",
    "gender": "male",
    "phone": "+255123456789",
    "createdAt": "2025-08-22T14:00:00.000Z"
  }
}
```

## Next Steps

1. **Import the collection** into Postman
2. **Start a backend server** (simple or full)
3. **Run the health check** to verify connectivity
4. **Test authentication** with demo credentials
5. **Explore the endpoints** based on your testing needs

For more detailed API documentation, see the `INTEGRATION_GUIDE.md` file in the project root.
