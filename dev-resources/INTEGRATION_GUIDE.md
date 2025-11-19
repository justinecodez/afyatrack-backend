# AfyaTrack Frontend-Backend Integration Guide

This guide explains how to run AfyaTrack with either the full backend or simple backend implementation.

## Quick Start

### Option 1: Full Backend (Recommended)

The full backend includes all features like authentication, patient management, visit tracking, and SOAP note generation.

```bash
# Terminal 1 - Start the full backend
cd backend
npm install
npm run dev

# Terminal 2 - Start the frontend  
cd frontend
npm install
npm run dev
```

The full backend runs on `http://localhost:5000` and includes:
- Complete authentication system
- Patient and visit management
- SOAP note generation
- Rate limiting and security features
- Comprehensive logging
- Database migrations and seeding

### Option 2: Simple Backend (For Testing)

The simple backend is a lightweight implementation for quick testing and development.

**Option 2a: JavaScript Simple Backend (Recommended for quick testing)**
```bash
# Terminal 1 - Start the simple JavaScript backend
cd backend
npm install
npm run simple:js

# Terminal 2 - Start the frontend
cd frontend  
npm install
npm run dev
```

**Option 2b: TypeScript Simple Backend**
```bash
# Terminal 1 - Start the simple TypeScript backend
cd backend
npm install
npm run simple

# Terminal 2 - Start the frontend
cd frontend  
npm install
npm run dev
```

The simple backend runs on `http://localhost:5001` and includes:
- Basic authentication
- Simplified API endpoints
- Faster startup time
- Minimal dependencies
- No TypeScript compilation needed (JS version)

## Configuration

### Backend Configuration

Both backends can be configured using environment variables or configuration files:

**Full Backend:**
- Uses `backend/src/config/env.ts` for configuration
- Supports `.env` files in the backend directory
- Configurable database, logging, and security settings

**Simple Backend:**
- Uses environment variables directly
- Minimal configuration required
- Port can be set via `PORT` environment variable

### Frontend Configuration

The frontend automatically detects which backend is available:

1. **Automatic Detection:** The frontend will try to connect to the configured API URL
2. **Manual Selection:** Use the backend selector component to choose between available backends
3. **Environment Variables:** Set `VITE_API_URL` to point to your preferred backend

Create a `.env` file in the frontend directory:
```bash
# For full backend (default)
VITE_API_URL=http://localhost:5000

# For simple backend
VITE_API_URL=http://localhost:5001
```

## Database Setup

### Full Backend Database

```bash
cd backend

# Setup database and run migrations
npm run db:migrate

# Seed with test data (optional)
npm run db:seed
```

### Simple Backend Database

```bash
cd backend

# Setup simple database with test user
npm run db:setup
```

## Authentication

Both backends support the same authentication interface:

**Demo Credentials:**
- Email: `admin@afyatrack.com`
- Password: `AfyaTrack123!`

**Login Process:**
1. Open the frontend in your browser
2. Click "Sign In" from the landing page
3. Use the demo credentials or click "Use Demo Credentials"
4. The app will automatically detect and connect to available backends

## API Endpoints

### Full Backend Endpoints

- `GET /health` - Health check
- `GET /api` - API information
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/patients` - Get patients
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/visits` - Get visits
- `POST /api/v1/visits` - Create visit

### Simple Backend Endpoints

- `GET /health` - Health check
- `GET /api` - API information  
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

## Development Workflow

### Running Both Backends Simultaneously

You can run both backends at the same time for testing:

```bash
# Terminal 1 - Full backend on port 5000
cd backend && npm run dev

# Terminal 2 - Simple backend on port 5001  
cd backend && npm run simple

# Terminal 3 - Frontend
cd frontend && npm run dev
```

The frontend includes a backend selector that lets you switch between available backends.

### Building for Production

```bash
# Build backend
cd backend
npm run build

# Start production backend
npm start

# Build frontend
cd frontend
npm run build

# Serve built frontend (using a static server)
npm run preview
```

## Troubleshooting

### Backend Issues

1. **Port conflicts:** Ensure ports 5000 and 5001 are available
2. **Database errors:** Run database setup commands
3. **Permission errors:** Check file permissions in the `backend/data` directory

### Frontend Issues

1. **API connection errors:** Check that the backend is running
2. **CORS errors:** Verify backend CORS configuration
3. **Authentication errors:** Clear browser localStorage and try again

### Common Solutions

```bash
# Clear frontend local storage
# Open browser dev tools > Application > Local Storage > Clear

# Reset database
cd backend
rm -rf data/afyatrack.db
npm run db:migrate
npm run db:seed

# Restart with clean slate
npm run dev # or npm run simple
```

## API Client Features

The frontend includes a robust API client (`frontend/src/lib/api.ts`) that:

- Automatically handles authentication tokens
- Supports token refresh
- Provides consistent error handling
- Works with both backend implementations
- Includes TypeScript types for all endpoints

## Next Steps

1. **Explore the Web App:** After logging in, explore patient management and visit documentation features
2. **API Testing:** Use the browser dev tools to inspect API calls
3. **Customization:** Modify the backends or frontend to suit your specific needs
4. **Production Setup:** Configure environment variables and security settings for production deployment

For more detailed information, see the individual README files in the `backend/` and `frontend/` directories.
