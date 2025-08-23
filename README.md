# AfyaTrack Backend

A robust Node.js/Express/TypeScript backend API for AfyaTrack - an AI-powered clinical documentation platform for Tanzanian healthcare providers.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Patient Management**: Comprehensive patient records with NHIF integration
- **Visit Documentation**: Clinical visit tracking with SOAP notes
- **Database**: SQLite with proper schema design and migrations
- **Security**: Industry-standard security practices with rate limiting
- **Validation**: Comprehensive input validation and error handling
- **Logging**: Structured logging with Winston
- **CORS**: Properly configured for frontend integration
- **TypeScript**: Full type safety and modern development experience

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd afyatrack/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=./data/afyatrack.db
   JWT_SECRET=your-super-secure-jwt-secret-key
   FRONTEND_URL=http://localhost:5173
   ```

4. **Initialize database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

### Migration
```bash
npm run db:migrate
```

### Seeding (Development Data)
```bash
npm run db:seed
```

**Default accounts created:**
- **Doctor**: `dr.mwalimu@afyatrack.com` / `AfyaTrack123!`
- **Admin**: `admin@afyatrack.com` / `AfyaTrack123!`

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 📡 API Endpoints

### Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password

### Patients
- `GET /patients` - Get patients (with pagination/filtering)
- `POST /patients` - Create new patient
- `GET /patients/:id` - Get patient by ID
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient (Admin only)
- `GET /patients/stats` - Get patient statistics

### Visits
- `GET /visits` - Get visits (with pagination/filtering)
- `POST /visits` - Create new visit
- `GET /visits/:id` - Get visit by ID
- `PUT /visits/:id` - Update visit
- `DELETE /visits/:id` - Delete visit (Admin only)
- `GET /visits/stats` - Get visit statistics
- `GET /visits/patient/:patientId` - Get patient visit history

### Health Check
- `GET /health` - API health status

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login** to receive access token and refresh token
2. **Include** access token in Authorization header: `Bearer <token>`
3. **Refresh** token when access token expires
4. **Logout** to invalidate refresh token

### Example Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.mwalimu@afyatrack.com", "password": "AfyaTrack123!"}'
```

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **CORS**: Configured for frontend integration
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Comprehensive validation with express-validator
- **Password Hashing**: bcrypt with configurable rounds
- **SQL Injection Prevention**: Parameterized queries
- **JWT Security**: Secure token generation and validation

## 📊 Database Schema

### Core Tables
- **users** - Healthcare professionals
- **patients** - Patient information
- **visits** - Clinical visits
- **diagnoses** - ICD-10 diagnoses
- **medications** - Prescribed medications
- **recommendations** - AI-generated recommendations
- **refresh_tokens** - JWT token management
- **audit_logs** - System audit trail

### Key Features
- Foreign key constraints
- Proper indexing for performance
- Audit triggers for compliance
- Soft deletes where appropriate

## 🌍 Tanzanian Healthcare Context

The API is specifically designed for Tanzanian healthcare providers:

- **NHIF Integration**: Support for Tanzania's National Health Insurance Fund
- **Local Validation**: Phone numbers in +255 format
- **Multilingual Support**: Ready for English/Kiswahili content
- **ICD-10 Codes**: International diagnostic coding standards
- **Local Currency**: Support for Tanzanian Shilling (TSh)

## 📝 Logging

Structured logging with Winston:

- **Development**: Console output with colors
- **Production**: File-based logging with rotation
- **Log Levels**: error, warn, info, debug
- **Log Files**: 
  - `logs/app.log` - All logs
  - `logs/error.log` - Error logs only
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled rejections

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=/path/to/production.db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-domain.com
```

### Docker Support (Optional)
While not included by default, you can add Docker support:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Test specific endpoints with curl or Postman:
```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api
```

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

### API Status
```bash
curl http://localhost:5000/api
```

### Logs
```bash
tail -f logs/app.log
```

## 🛠️ Development

### Code Quality
- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting
- **Prettier**: Code formatting (can be added)
- **Husky**: Git hooks (can be added)

### Best Practices
- Clean architecture with separation of concerns
- Service layer pattern
- Middleware for cross-cutting concerns
- Comprehensive error handling
- Input validation and sanitization
- Security-first approach

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api`

---

**AfyaTrack** - Empowering Tanzanian healthcare through technology 🇹🇿
# afyatrack-backend
