import { v4 as uuidv4 } from 'uuid';
import { dbManager } from '../config/database';
import { AppError, Patient, CreatePatientRequest, PatientQuery, PaginatedResponse } from '../types';
import { logDatabase } from '../config/logger';

export class PatientService {
  /**
   * Create a new patient
   */
  public async createPatient(patientData: CreatePatientRequest, createdBy: string): Promise<Patient> {
    try {
      // Check if patient with same name and DOB exists
      const existingPatient = await dbManager.get(
        `SELECT id FROM patients 
         WHERE first_name = ? AND last_name = ? AND date_of_birth = ?`,
        [patientData.firstName, patientData.lastName, patientData.dateOfBirth]
      );

      if (existingPatient) {
        throw new AppError('Patient with same name and date of birth already exists', 409);
      }

      // Check NHIF number uniqueness if provided
      if (patientData.nhifNumber) {
        const existingNhif = await dbManager.get(
          'SELECT id FROM patients WHERE nhif_number = ?',
          [patientData.nhifNumber]
        );

        if (existingNhif) {
          throw new AppError('Patient with this NHIF number already exists', 409);
        }
      }

      const patientId = uuidv4();
      
      await dbManager.run(`
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, gender, phone_number,
          email, address, nhif_number, emergency_contact_name,
          emergency_contact_phone, emergency_contact_relationship, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patientId,
        patientData.firstName,
        patientData.lastName,
        patientData.dateOfBirth,
        patientData.gender,
        patientData.phoneNumber,
        patientData.email,
        patientData.address,
        patientData.nhifNumber,
        patientData.emergencyContact?.name,
        patientData.emergencyContact?.phone,
        patientData.emergencyContact?.relationship,
        createdBy
      ]);

      logDatabase('INSERT', 'patients', { patientId, createdBy });

      return this.getPatientById(patientId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient by ID
   */
  public async getPatientById(patientId: string): Promise<Patient> {
    try {
      const patient = await dbManager.get(`
        SELECT 
          id, first_name, last_name, date_of_birth, gender, phone_number,
          email, address, nhif_number, emergency_contact_name,
          emergency_contact_phone, emergency_contact_relationship,
          created_at, updated_at, created_by
        FROM patients 
        WHERE id = ?
      `, [patientId]);

      if (!patient) {
        throw new AppError('Patient not found', 404);
      }

      return {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: new Date(patient.date_of_birth),
        gender: patient.gender,
        phoneNumber: patient.phone_number,
        email: patient.email,
        address: patient.address,
        nhifNumber: patient.nhif_number,
        emergencyContact: patient.emergency_contact_name ? {
          name: patient.emergency_contact_name,
          phone: patient.emergency_contact_phone,
          relationship: patient.emergency_contact_relationship
        } : undefined,
        createdAt: new Date(patient.created_at),
        updatedAt: new Date(patient.updated_at),
        createdBy: patient.created_by
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patients with pagination and filtering
   */
  public async getPatients(query: PatientQuery, userId: string, userRole: string): Promise<PaginatedResponse<Patient>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Role-based filtering (non-admin users can only see their own patients)
      if (userRole !== 'admin') {
        whereConditions.push('created_by = ?');
        params.push(userId);
      }

      // Search filter
      if (query.search) {
        whereConditions.push(`(
          first_name LIKE ? OR 
          last_name LIKE ? OR 
          nhif_number LIKE ? OR
          phone_number LIKE ?
        )`);
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Gender filter
      if (query.gender) {
        whereConditions.push('gender = ?');
        params.push(query.gender);
      }

      // Age filter
      if (query.minAge || query.maxAge) {
        const currentYear = new Date().getFullYear();
        
        if (query.maxAge) {
          const minBirthYear = currentYear - query.maxAge;
          whereConditions.push(`date_of_birth >= '${minBirthYear}-01-01'`);
        }
        
        if (query.minAge) {
          const maxBirthYear = currentYear - query.minAge;
          whereConditions.push(`date_of_birth <= '${maxBirthYear}-12-31'`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await dbManager.get(
        `SELECT COUNT(*) as total FROM patients ${whereClause}`,
        params
      );
      const total = countResult.total;

      // Get patients
      const patients = await dbManager.all(`
        SELECT 
          id, first_name, last_name, date_of_birth, gender, phone_number,
          email, address, nhif_number, emergency_contact_name,
          emergency_contact_phone, emergency_contact_relationship,
          created_at, updated_at, created_by
        FROM patients 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const data = patients.map(patient => ({
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: new Date(patient.date_of_birth),
        gender: patient.gender,
        phoneNumber: patient.phone_number,
        email: patient.email,
        address: patient.address,
        nhifNumber: patient.nhif_number,
        emergencyContact: patient.emergency_contact_name ? {
          name: patient.emergency_contact_name,
          phone: patient.emergency_contact_phone,
          relationship: patient.emergency_contact_relationship
        } : undefined,
        createdAt: new Date(patient.created_at),
        updatedAt: new Date(patient.updated_at),
        createdBy: patient.created_by
      }));

      logDatabase('SELECT', 'patients', { query, resultCount: data.length });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update patient information
   */
  public async updatePatient(patientId: string, updates: Partial<CreatePatientRequest>): Promise<Patient> {
    try {
      // Check if patient exists
      await this.getPatientById(patientId);

      // Check NHIF uniqueness if updating
      if (updates.nhifNumber) {
        const existingNhif = await dbManager.get(
          'SELECT id FROM patients WHERE nhif_number = ? AND id != ?',
          [updates.nhifNumber, patientId]
        );

        if (existingNhif) {
          throw new AppError('Another patient with this NHIF number already exists', 409);
        }
      }

      const fields: string[] = [];
      const values: any[] = [];

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          switch (key) {
            case 'firstName':
              fields.push('first_name = ?');
              values.push(value);
              break;
            case 'lastName':
              fields.push('last_name = ?');
              values.push(value);
              break;
            case 'dateOfBirth':
              fields.push('date_of_birth = ?');
              values.push(value);
              break;
            case 'phoneNumber':
              fields.push('phone_number = ?');
              values.push(value);
              break;
            case 'nhifNumber':
              fields.push('nhif_number = ?');
              values.push(value);
              break;
            case 'emergencyContact':
              if (value && typeof value === 'object' && 'name' in value) {
                fields.push('emergency_contact_name = ?', 'emergency_contact_phone = ?', 'emergency_contact_relationship = ?');
                values.push(value.name, value.phone, value.relationship);
              }
              break;
            default:
              if (['gender', 'email', 'address'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
              }
          }
        }
      });

      if (fields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      values.push(patientId);

      await dbManager.run(
        `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      logDatabase('UPDATE', 'patients', { patientId, fieldsUpdated: fields.length });

      return this.getPatientById(patientId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete patient (soft delete - mark as inactive)
   */
  public async deletePatient(patientId: string): Promise<void> {
    try {
      // Check if patient exists
      await this.getPatientById(patientId);

      // Check if patient has any visits
      const visitsCount = await dbManager.get(
        'SELECT COUNT(*) as count FROM visits WHERE patient_id = ?',
        [patientId]
      );

      if (visitsCount.count > 0) {
        throw new AppError('Cannot delete patient with existing visits. Consider archiving instead.', 400);
      }

      await dbManager.run('DELETE FROM patients WHERE id = ?', [patientId]);

      logDatabase('DELETE', 'patients', { patientId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient statistics
   */
  public async getPatientStats(userId: string, userRole: string): Promise<{
    total: number;
    byGender: { male: number; female: number; other: number };
    byAgeGroup: { [key: string]: number };
    recentRegistrations: number;
  }> {
    try {
      const roleFilter = userRole !== 'admin' ? 'WHERE created_by = ?' : '';
      const params = userRole !== 'admin' ? [userId] : [];

      // Total patients
      const totalResult = await dbManager.get(
        `SELECT COUNT(*) as total FROM patients ${roleFilter}`,
        params
      );

      // By gender
      const genderResults = await dbManager.all(
        `SELECT gender, COUNT(*) as count FROM patients ${roleFilter} GROUP BY gender`,
        params
      );

      const byGender = { male: 0, female: 0, other: 0 };
      genderResults.forEach(row => {
        byGender[row.gender as keyof typeof byGender] = row.count;
      });

      // By age group
      const currentYear = new Date().getFullYear();
      const ageGroups = {
        '0-18': 0,
        '19-30': 0,
        '31-50': 0,
        '51-65': 0,
        '65+': 0
      };

      const ageResults = await dbManager.all(
        `SELECT date_of_birth FROM patients ${roleFilter}`,
        params
      );

      ageResults.forEach(row => {
        const age = currentYear - new Date(row.date_of_birth).getFullYear();
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 30) ageGroups['19-30']++;
        else if (age <= 50) ageGroups['31-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      });

      // Recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentParams = userRole !== 'admin' ? [thirtyDaysAgo.toISOString(), userId] : [thirtyDaysAgo.toISOString()];
      const recentWhere = userRole !== 'admin' ? 'WHERE created_at >= ? AND created_by = ?' : 'WHERE created_at >= ?';
      
      const recentResult = await dbManager.get(
        `SELECT COUNT(*) as count FROM patients ${recentWhere}`,
        recentParams
      );

      return {
        total: totalResult.total,
        byGender,
        byAgeGroup: ageGroups,
        recentRegistrations: recentResult.count
      };
    } catch (error) {
      throw error;
    }
  }
}
