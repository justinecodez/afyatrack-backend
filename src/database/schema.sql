-- AfyaTrack Database Schema
-- SQLite Database for Clinical Documentation Platform

-- Users table - Healthcare professionals using the system
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'admin', 'clinician')),
    license_number TEXT,
    hospital_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table for JWT token management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Patients table - Patient information
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone_number TEXT,
    email TEXT,
    address TEXT,
    nhif_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Visits table - Patient visit records
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    visit_date DATETIME NOT NULL,
    visit_type TEXT NOT NULL CHECK (visit_type IN ('consultation', 'follow_up', 'emergency', 'screening', 'anc', 'vaccination')),
    chief_complaint TEXT,
    transcript TEXT,
    audio_file_path TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    duration INTEGER, -- in minutes
    follow_up_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Diagnoses table - ICD-10 diagnoses for visits
CREATE TABLE IF NOT EXISTS diagnoses (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    icd_code TEXT NOT NULL,
    description TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- Medications table - Prescribed medications
CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- Recommendations table - AI-generated clinical recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('medication', 'follow_up', 'lifestyle', 'diagnostic', 'warning', 'info')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- Upload files table - Track uploaded audio files and documents
CREATE TABLE IF NOT EXISTS upload_files (
    id TEXT PRIMARY KEY,
    visit_id TEXT,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Audit logs table - Track all database changes for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    user_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System settings table - Application configuration
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_nhif ON patients(nhif_number);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);

CREATE INDEX IF NOT EXISTS idx_diagnoses_visit ON diagnoses(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_icd ON diagnoses(icd_code);

CREATE INDEX IF NOT EXISTS idx_medications_visit ON medications(visit_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_visit ON recommendations(visit_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);

CREATE INDEX IF NOT EXISTS idx_files_visit ON upload_files(visit_id);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON upload_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_patients_timestamp 
    AFTER UPDATE ON patients
    FOR EACH ROW
    BEGIN
        UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_visits_timestamp 
    AFTER UPDATE ON visits
    FOR EACH ROW
    BEGIN
        UPDATE visits SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Create triggers for audit logging
CREATE TRIGGER IF NOT EXISTS audit_users_insert
    AFTER INSERT ON users
    FOR EACH ROW
    BEGIN
        INSERT INTO audit_logs (id, table_name, record_id, action, new_values)
        VALUES (
            hex(randomblob(16)),
            'users',
            NEW.id,
            'INSERT',
            json_object(
                'id', NEW.id,
                'email', NEW.email,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'role', NEW.role
            )
        );
    END;

CREATE TRIGGER IF NOT EXISTS audit_users_update
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        INSERT INTO audit_logs (id, table_name, record_id, action, old_values, new_values)
        VALUES (
            hex(randomblob(16)),
            'users',
            NEW.id,
            'UPDATE',
            json_object(
                'id', OLD.id,
                'email', OLD.email,
                'first_name', OLD.first_name,
                'last_name', OLD.last_name,
                'role', OLD.role
            ),
            json_object(
                'id', NEW.id,
                'email', NEW.email,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'role', NEW.role
            )
        );
    END;

CREATE TRIGGER IF NOT EXISTS audit_patients_insert
    AFTER INSERT ON patients
    FOR EACH ROW
    BEGIN
        INSERT INTO audit_logs (id, table_name, record_id, action, new_values, user_id)
        VALUES (
            hex(randomblob(16)),
            'patients',
            NEW.id,
            'INSERT',
            json_object(
                'id', NEW.id,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'date_of_birth', NEW.date_of_birth,
                'gender', NEW.gender
            ),
            NEW.created_by
        );
    END;

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('app_name', 'AfyaTrack', 'Application name'),
('app_version', '1.0.0', 'Current application version'),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', 'audio/mp3,audio/wav,audio/m4a,audio/mpeg', 'Allowed file MIME types for upload'),
('session_timeout', '3600', 'Session timeout in seconds (1 hour)'),
('max_login_attempts', '5', 'Maximum login attempts before account lockout'),
('backup_retention_days', '30', 'Number of days to retain database backups');
