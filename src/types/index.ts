// Common Types and Interfaces for AfyaTrack Backend

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  licenseNumber?: string;
  hospitalId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  ADMIN = 'admin',
  CLINICIAN = 'clinician'
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  email?: string;
  address?: string;
  nhifNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Visit {
  id: string;
  patientId: string;
  doctorId: string;
  visitDate: Date;
  visitType: VisitType;
  chiefComplaint?: string;
  transcript?: string;
  audioFilePath?: string;
  soapNotes?: SOAPNotes;
  status: VisitStatus;
  duration?: number; // in minutes
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum VisitType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  SCREENING = 'screening',
  ANC = 'anc', // Antenatal Care
  VACCINATION = 'vaccination'
}

export enum VisitStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Recommendation {
  id: string;
  visitId: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: Priority;
  isRead: boolean;
  createdAt: Date;
}

export enum RecommendationType {
  MEDICATION = 'medication',
  FOLLOW_UP = 'follow_up',
  LIFESTYLE = 'lifestyle',
  DIAGNOSTIC = 'diagnostic',
  WARNING = 'warning',
  INFO = 'info'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Diagnosis {
  id: string;
  visitId: string;
  icdCode: string;
  description: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Medication {
  id: string;
  visitId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  createdAt: Date;
}

// Request/Response Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  email?: string;
  address?: string;
  nhifNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface CreateVisitRequest {
  patientId: string;
  visitType: VisitType;
  chiefComplaint?: string;
  visitDate?: string;
}

export interface UpdateVisitRequest {
  chiefComplaint?: string;
  transcript?: string;
  soapNotes?: SOAPNotes;
  status?: VisitStatus;
  duration?: number;
  followUpDate?: string;
}

// Database Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

// Query Parameters
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PatientQuery extends PaginationQuery {
  search?: string;
  gender?: 'male' | 'female' | 'other';
  minAge?: number;
  maxAge?: number;
}

export interface VisitQuery extends PaginationQuery {
  patientId?: string;
  doctorId?: string;
  visitType?: VisitType;
  status?: VisitStatus;
  fromDate?: string;
  toDate?: string;
}

// File Upload Types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Error Types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Error Type
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
