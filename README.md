# AfyaTrack Backend API

A comprehensive healthcare management system backend built for Tanzania's healthcare facilities. This API provides robust patient management, visit tracking, and medical records functionality.

## 🏥 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Patient Management**: Complete CRUD operations for patient records
- **Visit Management**: Track patient visits with SOAP note generation
- **Medical Records**: Comprehensive medical history tracking
- **Role-based Permissions**: Doctor, Nurse, Admin, and Receptionist roles
- **Facility Management**: Multi-facility support
- **Data Security**: Encrypted passwords, secure token handling
- **API Rate Limiting**: Protection against abuse
- **Comprehensive Logging**: Request tracking and error monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SQLite (included)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd afyatrack-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The server will be available at `http://localhost:5001`

## 🔧 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed` - Populate database with sample data

## 📚 API Documentation

### Base URL
```
http://localhost:5001/api/v1
```

### Authentication

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints Overview

#### Authentication (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

#### Patients (`/patients`)
- `GET /patients` - Get paginated patients list
- `POST /patients` - Create new patient
- `GET /patients/:id` - Get patient by ID
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient
- `GET /patients/search` - Search patients
- `GET /patients/statistics` - Get patient statistics

### Sample API Usage

#### Login
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.mwalimu@mnh.or.tz",
    "password": "Password123!"
  }'
```

#### Get Patients
```bash
curl -X GET http://localhost:5001/api/v1/patients \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json"
```

#### Create Patient
```bash
curl -X POST http://localhost:5001/api/v1/patients \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "phone": "+255123456789",
    "nhifNumber": "NH123456789"
  }'
```

## 🗄️ Database Schema

### Users
- User authentication and profile information
- Role-based permissions (Doctor, Nurse, Admin, Receptionist)
- Facility association

### Patients
- Personal information (name, DOB, gender, contacts)
- Medical information (allergies, chronic conditions, medications)
- Emergency contacts
- NHIF and National ID integration

### Visits
- Visit tracking and medical records
- SOAP notes structure
- Visit types (Consultation, Follow-up, Emergency, etc.)
- Recommendations and treatment plans

### Facilities
- Healthcare facility information
- Location and contact details
- User and patient associations

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure access and refresh token implementation
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: TypeORM query building
- **Data Encryption**: Sensitive data protection

## 🏗️ Architecture

```
src/
├── config/          # Database and app configuration
├── controllers/     # Route handlers and business logic
├── entities/        # TypeORM database entities
├── middleware/      # Authentication, validation, error handling
├── routes/          # API route definitions
├── services/        # Business logic layer
├── utils/           # Helper functions and utilities
└── types/           # TypeScript type definitions
```

## 🧪 Testing Data

The seeded database includes:

**Users:**
- `dr.mwalimu@mnh.or.tz` / `Password123!` (Doctor)
- `nurse.mary@mnh.or.tz` / `Password123!` (Nurse)
- `admin@afyatrack.com` / `AdminPass123!` (Admin)

**Patients:**
- Rehema Mwakalinga (Female, 34, Hypertension)
- John Mwalimu (Male, 28, Routine check-up)
- Grace Kilonzo (Female, 45, Diabetes management)

## 🌍 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5001

# Database Configuration
DB_PATH=./database.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Detailed error information (development only)
  ]
}
```

## 🚦 HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## 🔄 Future Enhancements

- Visit management endpoints
- SOAP note AI generation
- Lab results integration
- Prescription management
- Appointment scheduling
- Reporting and analytics
- Medical imaging support
- Integration with NHIF systems

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for Tanzania's healthcare system**# afyatrack-backend
