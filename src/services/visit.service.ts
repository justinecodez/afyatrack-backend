import { v4 as uuidv4 } from 'uuid';
import { dbManager } from '../config/database';
import { 
  AppError, 
  Visit, 
  CreateVisitRequest, 
  UpdateVisitRequest, 
  VisitQuery, 
  PaginatedResponse,
  VisitType,
  VisitStatus,
  SOAPNotes
} from '../types';
import { logDatabase } from '../config/logger';

export class VisitService {
  /**
   * Create a new visit
   */
  public async createVisit(visitData: CreateVisitRequest, doctorId: string): Promise<Visit> {
    try {
      // Verify patient exists
      const patient = await dbManager.get(
        'SELECT id FROM patients WHERE id = ?',
        [visitData.patientId]
      );

      if (!patient) {
        throw new AppError('Patient not found', 404);
      }

      const visitId = uuidv4();
      const visitDate = visitData.visitDate ? new Date(visitData.visitDate) : new Date();

      await dbManager.run(`
        INSERT INTO visits (
          id, patient_id, doctor_id, visit_date, visit_type,
          chief_complaint, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitId,
        visitData.patientId,
        doctorId,
        visitDate.toISOString(),
        visitData.visitType,
        visitData.chiefComplaint,
        VisitStatus.SCHEDULED
      ]);

      logDatabase('INSERT', 'visits', { visitId, patientId: visitData.patientId, doctorId });

      return this.getVisitById(visitId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visit by ID
   */
  public async getVisitById(visitId: string): Promise<Visit> {
    try {
      const visit = await dbManager.get(`
        SELECT 
          v.id, v.patient_id, v.doctor_id, v.visit_date, v.visit_type,
          v.chief_complaint, v.transcript, v.audio_file_path,
          v.subjective, v.objective, v.assessment, v.plan,
          v.status, v.duration, v.follow_up_date,
          v.created_at, v.updated_at,
          p.first_name as patient_first_name, p.last_name as patient_last_name,
          u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        JOIN users u ON v.doctor_id = u.id
        WHERE v.id = ?
      `, [visitId]);

      if (!visit) {
        throw new AppError('Visit not found', 404);
      }

      // Get diagnoses
      const diagnoses = await dbManager.all(
        'SELECT id, icd_code, description, is_primary FROM diagnoses WHERE visit_id = ?',
        [visitId]
      );

      // Get medications
      const medications = await dbManager.all(
        'SELECT id, medication_name, dosage, frequency, duration, instructions FROM medications WHERE visit_id = ?',
        [visitId]
      );

      // Get recommendations
      const recommendations = await dbManager.all(
        'SELECT id, type, title, description, priority, is_read FROM recommendations WHERE visit_id = ?',
        [visitId]
      );

      return {
        id: visit.id,
        patientId: visit.patient_id,
        doctorId: visit.doctor_id,
        visitDate: new Date(visit.visit_date),
        visitType: visit.visit_type,
        chiefComplaint: visit.chief_complaint,
        transcript: visit.transcript,
        audioFilePath: visit.audio_file_path,
        soapNotes: visit.subjective || visit.objective || visit.assessment || visit.plan ? {
          subjective: visit.subjective || '',
          objective: visit.objective || '',
          assessment: visit.assessment || '',
          plan: visit.plan || ''
        } : undefined,
        status: visit.status,
        duration: visit.duration,
        followUpDate: visit.follow_up_date ? new Date(visit.follow_up_date) : undefined,
        createdAt: new Date(visit.created_at),
        updatedAt: new Date(visit.updated_at),
        // Additional fields for frontend
        patientName: `${visit.patient_first_name} ${visit.patient_last_name}`,
        doctorName: `${visit.doctor_first_name} ${visit.doctor_last_name}`,
        diagnoses,
        medications,
        recommendations
      } as Visit & {
        patientName: string;
        doctorName: string;
        diagnoses: any[];
        medications: any[];
        recommendations: any[];
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visits with pagination and filtering
   */
  public async getVisits(query: VisitQuery, userId: string, userRole: string): Promise<PaginatedResponse<Visit>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Role-based filtering (non-admin users can only see their own visits or patients they created)
      if (userRole !== 'admin') {
        whereConditions.push('(v.doctor_id = ? OR p.created_by = ?)');
        params.push(userId, userId);
      }

      // Patient filter
      if (query.patientId) {
        whereConditions.push('v.patient_id = ?');
        params.push(query.patientId);
      }

      // Doctor filter
      if (query.doctorId) {
        whereConditions.push('v.doctor_id = ?');
        params.push(query.doctorId);
      }

      // Visit type filter
      if (query.visitType) {
        whereConditions.push('v.visit_type = ?');
        params.push(query.visitType);
      }

      // Status filter
      if (query.status) {
        whereConditions.push('v.status = ?');
        params.push(query.status);
      }

      // Date range filter
      if (query.fromDate) {
        whereConditions.push('DATE(v.visit_date) >= ?');
        params.push(query.fromDate);
      }

      if (query.toDate) {
        whereConditions.push('DATE(v.visit_date) <= ?');
        params.push(query.toDate);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await dbManager.get(
        `SELECT COUNT(*) as total 
         FROM visits v
         JOIN patients p ON v.patient_id = p.id
         ${whereClause}`,
        params
      );
      const total = countResult.total;

      // Get visits
      const visits = await dbManager.all(`
        SELECT 
          v.id, v.patient_id, v.doctor_id, v.visit_date, v.visit_type,
          v.chief_complaint, v.status, v.duration, v.follow_up_date,
          v.created_at, v.updated_at,
          p.first_name as patient_first_name, p.last_name as patient_last_name,
          u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        JOIN users u ON v.doctor_id = u.id
        ${whereClause}
        ORDER BY v.visit_date DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const data = visits.map(visit => ({
        id: visit.id,
        patientId: visit.patient_id,
        doctorId: visit.doctor_id,
        visitDate: new Date(visit.visit_date),
        visitType: visit.visit_type,
        chiefComplaint: visit.chief_complaint,
        status: visit.status,
        duration: visit.duration,
        followUpDate: visit.follow_up_date ? new Date(visit.follow_up_date) : undefined,
        createdAt: new Date(visit.created_at),
        updatedAt: new Date(visit.updated_at),
        patientName: `${visit.patient_first_name} ${visit.patient_last_name}`,
        doctorName: `${visit.doctor_first_name} ${visit.doctor_last_name}`
      })) as Visit[];

      logDatabase('SELECT', 'visits', { query, resultCount: data.length });

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
   * Update visit information
   */
  public async updateVisit(visitId: string, updates: UpdateVisitRequest): Promise<Visit> {
    try {
      // Check if visit exists
      await this.getVisitById(visitId);

      const fields: string[] = [];
      const values: any[] = [];

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          switch (key) {
            case 'chiefComplaint':
              fields.push('chief_complaint = ?');
              values.push(value);
              break;
            case 'soapNotes':
              const soap = value as SOAPNotes;
              if (soap.subjective !== undefined) {
                fields.push('subjective = ?');
                values.push(soap.subjective);
              }
              if (soap.objective !== undefined) {
                fields.push('objective = ?');
                values.push(soap.objective);
              }
              if (soap.assessment !== undefined) {
                fields.push('assessment = ?');
                values.push(soap.assessment);
              }
              if (soap.plan !== undefined) {
                fields.push('plan = ?');
                values.push(soap.plan);
              }
              break;
            case 'followUpDate':
              fields.push('follow_up_date = ?');
              values.push(value);
              break;
            default:
              if (['transcript', 'status', 'duration'].includes(key)) {
                const dbField = key === 'transcript' ? 'transcript' : 
                               key === 'status' ? 'status' : 'duration';
                fields.push(`${dbField} = ?`);
                values.push(value);
              }
          }
        }
      });

      if (fields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      values.push(visitId);

      await dbManager.run(
        `UPDATE visits SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      logDatabase('UPDATE', 'visits', { visitId, fieldsUpdated: fields.length });

      return this.getVisitById(visitId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete visit
   */
  public async deleteVisit(visitId: string): Promise<void> {
    try {
      // Check if visit exists
      await this.getVisitById(visitId);

      await dbManager.run('DELETE FROM visits WHERE id = ?', [visitId]);

      logDatabase('DELETE', 'visits', { visitId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visit statistics
   */
  public async getVisitStats(userId: string, userRole: string): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byType: { [key: string]: number };
    thisMonth: number;
    avgDuration: number;
  }> {
    try {
      const roleFilter = userRole !== 'admin' ? 'WHERE v.doctor_id = ?' : '';
      const params = userRole !== 'admin' ? [userId] : [];

      // Total visits
      const totalResult = await dbManager.get(
        `SELECT COUNT(*) as total FROM visits v ${roleFilter}`,
        params
      );

      // By status
      const statusResults = await dbManager.all(
        `SELECT status, COUNT(*) as count FROM visits v ${roleFilter} GROUP BY status`,
        params
      );

      const byStatus: { [key: string]: number } = {};
      statusResults.forEach(row => {
        byStatus[row.status] = row.count;
      });

      // By type
      const typeResults = await dbManager.all(
        `SELECT visit_type, COUNT(*) as count FROM visits v ${roleFilter} GROUP BY visit_type`,
        params
      );

      const byType: { [key: string]: number } = {};
      typeResults.forEach(row => {
        byType[row.visit_type] = row.count;
      });

      // This month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const monthParams = userRole !== 'admin' 
        ? [firstDayOfMonth.toISOString(), userId] 
        : [firstDayOfMonth.toISOString()];
      const monthWhere = userRole !== 'admin' 
        ? 'WHERE v.visit_date >= ? AND v.doctor_id = ?' 
        : 'WHERE v.visit_date >= ?';

      const monthResult = await dbManager.get(
        `SELECT COUNT(*) as count FROM visits v ${monthWhere}`,
        monthParams
      );

      // Average duration
      const durationResult = await dbManager.get(
        `SELECT AVG(duration) as avg_duration FROM visits v ${roleFilter} WHERE duration IS NOT NULL`,
        params
      );

      return {
        total: totalResult.total,
        byStatus,
        byType,
        thisMonth: monthResult.count,
        avgDuration: Math.round(durationResult.avg_duration || 0)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient visit history
   */
  public async getPatientVisitHistory(patientId: string): Promise<Visit[]> {
    try {
      const visits = await dbManager.all(`
        SELECT 
          v.id, v.patient_id, v.doctor_id, v.visit_date, v.visit_type,
          v.chief_complaint, v.status, v.duration, v.follow_up_date,
          v.created_at, v.updated_at,
          u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM visits v
        JOIN users u ON v.doctor_id = u.id
        WHERE v.patient_id = ?
        ORDER BY v.visit_date DESC
      `, [patientId]);

      return visits.map(visit => ({
        id: visit.id,
        patientId: visit.patient_id,
        doctorId: visit.doctor_id,
        visitDate: new Date(visit.visit_date),
        visitType: visit.visit_type,
        chiefComplaint: visit.chief_complaint,
        status: visit.status,
        duration: visit.duration,
        followUpDate: visit.follow_up_date ? new Date(visit.follow_up_date) : undefined,
        createdAt: new Date(visit.created_at),
        updatedAt: new Date(visit.updated_at),
        doctorName: `${visit.doctor_first_name} ${visit.doctor_last_name}`
      })) as Visit[];
    } catch (error) {
      throw error;
    }
  }
}
