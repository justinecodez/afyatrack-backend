import { AppDataSource } from '../config/database';
import { Visit, VisitStatus, VisitType } from '../entities/Visit';
import { Patient } from '../entities/Patient';
import { Repository } from 'typeorm';

export interface CreateVisitRequest {
  patientId: string;
  visitType?: VisitType;
  chiefComplaint: string;
  currentIllness?: string;
  medicalHistory?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  soapSubjective?: string;
  soapObjective?: string;
  soapAssessment?: string;
  soapPlan?: string;
  recommendations?: Array<{ type: string; title: string; message: string }>;
  transcript?: string;
  audioUrl?: string;
  durationMinutes?: number;
  nextAppointment?: string;
  vitalSigns?: Record<string, any>;
  prescriptions?: Array<any>;
  labOrders?: string;
  labResults?: string;
}

export interface UpdateVisitRequest {
  visitType?: VisitType;
  chiefComplaint?: string;
  currentIllness?: string;
  medicalHistory?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  soapSubjective?: string;
  soapObjective?: string;
  soapAssessment?: string;
  soapPlan?: string;
  recommendations?: Array<{ type: string; title: string; message: string }>;
  transcript?: string;
  audioUrl?: string;
  durationMinutes?: number;
  nextAppointment?: string;
  status?: VisitStatus;
  vitalSigns?: Record<string, any>;
  prescriptions?: Array<any>;
  labOrders?: string;
  labResults?: string;
}

export interface VisitQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: VisitStatus;
  visitType?: VisitType;
  startDate?: string;
  endDate?: string;
}

export class VisitService {
  private visitRepository: Repository<Visit>;
  private patientRepository: Repository<Patient>;

  constructor() {
    this.visitRepository = AppDataSource.getRepository(Visit);
    this.patientRepository = AppDataSource.getRepository(Patient);
  }

  /**
   * Create a new visit
   */
  async createVisit(visitData: CreateVisitRequest, userId: string): Promise<Visit> {
    // Verify patient exists and is active
    const patient = await this.patientRepository.findOne({
      where: { id: visitData.patientId, isActive: true },
    });

    if (!patient) {
      throw new Error('Patient not found or inactive');
    }

    const visit = this.visitRepository.create({
      patientId: visitData.patientId,
      visitDate: new Date(),
      visitType: visitData.visitType || VisitType.CONSULTATION,
      chiefComplaint: visitData.chiefComplaint,
      currentIllness: visitData.currentIllness,
      medicalHistory: visitData.medicalHistory,
      physicalExam: visitData.physicalExam,
      assessment: visitData.assessment,
      plan: visitData.plan,
      soapSubjective: visitData.soapSubjective,
      soapObjective: visitData.soapObjective,
      soapAssessment: visitData.soapAssessment,
      soapPlan: visitData.soapPlan,
      transcript: visitData.transcript,
      audioUrl: visitData.audioUrl,
      durationMinutes: visitData.durationMinutes,
      nextAppointment: visitData.nextAppointment ? new Date(visitData.nextAppointment) : undefined,
      labOrders: visitData.labOrders,
      labResults: visitData.labResults,
      status: VisitStatus.ACTIVE,
    });

    // Handle JSON fields
    if (visitData.recommendations) {
      visit.setParsedRecommendations(visitData.recommendations);
    }

    if (visitData.vitalSigns) {
      visit.setParsedVitalSigns(visitData.vitalSigns);
    }

    if (visitData.prescriptions) {
      visit.setParsedPrescriptions(visitData.prescriptions);
    }

    return await this.visitRepository.save(visit);
  }

  /**
   * Get visits with pagination and filtering
   */
  async getVisits(query: VisitQuery): Promise<{
    visits: Visit[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.patient', 'patient')
      .orderBy('visit.visitDate', 'DESC');

    // Apply filters
    if (query.patientId) {
      queryBuilder.andWhere('visit.patientId = :patientId', { patientId: query.patientId });
    }

    if (query.status) {
      queryBuilder.andWhere('visit.status = :status', { status: query.status });
    }

    if (query.visitType) {
      queryBuilder.andWhere('visit.visitType = :visitType', { visitType: query.visitType });
    }

    if (query.startDate) {
      queryBuilder.andWhere('visit.visitDate >= :startDate', { startDate: new Date(query.startDate) });
    }

    if (query.endDate) {
      queryBuilder.andWhere('visit.visitDate <= :endDate', { endDate: new Date(query.endDate) });
    }

    const [visits, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      visits,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get visit by ID
   */
  async getVisitById(id: string, includePatient: boolean = true): Promise<Visit | null> {
    const queryBuilder = this.visitRepository.createQueryBuilder('visit');

    if (includePatient) {
      queryBuilder.leftJoinAndSelect('visit.patient', 'patient');
    }

    return await queryBuilder
      .where('visit.id = :id', { id })
      .getOne();
  }

  /**
   * Update visit information
   */
  async updateVisit(id: string, updateData: UpdateVisitRequest, userId: string): Promise<Visit> {
    const visit = await this.visitRepository.findOne({
      where: { id },
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Update basic fields
    Object.assign(visit, {
      ...updateData,
      nextAppointment: updateData.nextAppointment ? new Date(updateData.nextAppointment) : visit.nextAppointment,
    });

    // Handle JSON fields
    if (updateData.recommendations) {
      visit.setParsedRecommendations(updateData.recommendations);
    }

    if (updateData.vitalSigns) {
      visit.setParsedVitalSigns(updateData.vitalSigns);
    }

    if (updateData.prescriptions) {
      visit.setParsedPrescriptions(updateData.prescriptions);
    }

    return await this.visitRepository.save(visit);
  }

  /**
   * Delete (soft delete) visit
   */
  async deleteVisit(id: string, userId: string): Promise<void> {
    const visit = await this.visitRepository.findOne({
      where: { id },
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    visit.status = VisitStatus.CANCELLED;
    await this.visitRepository.save(visit);
  }

  /**
   * Complete a visit
   */
  async completeVisit(id: string, userId: string): Promise<Visit> {
    const visit = await this.visitRepository.findOne({
      where: { id },
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    visit.status = VisitStatus.COMPLETED;
    return await this.visitRepository.save(visit);
  }

  /**
   * Upload and update visit audio
   */
  async updateVisitAudio(
    id: string, 
    audioUrl: string, 
    transcript?: string, 
    durationMinutes?: number
  ): Promise<Visit> {
    const visit = await this.visitRepository.findOne({
      where: { id },
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    visit.audioUrl = audioUrl;
    if (transcript) visit.transcript = transcript;
    if (durationMinutes) visit.durationMinutes = durationMinutes;

    return await this.visitRepository.save(visit);
  }

  /**
   * Get visit statistics
   */
  async getVisitStatistics(facilityId?: string): Promise<{
    totalVisits: number;
    visitsToday: number;
    visitsThisWeek: number;
    visitsThisMonth: number;
    visitsByType: Record<string, number>;
    visitsByStatus: Record<string, number>;
    averageDuration: number;
  }> {
    const queryBuilder = this.visitRepository.createQueryBuilder('visit');

    if (facilityId) {
      queryBuilder
        .leftJoin('visit.patient', 'patient')
        .where('patient.facilityId = :facilityId', { facilityId });
    }

    // Total visits
    const totalVisits = await queryBuilder.getCount();

    // Visits today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const visitsToday = await queryBuilder
      .andWhere('visit.visitDate >= :today AND visit.visitDate < :tomorrow', { today, tomorrow })
      .getCount();

    // Visits this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const visitsThisWeek = await queryBuilder
      .andWhere('visit.visitDate >= :startOfWeek', { startOfWeek })
      .getCount();

    // Visits this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const visitsThisMonth = await queryBuilder
      .andWhere('visit.visitDate >= :startOfMonth', { startOfMonth })
      .getCount();

    // Visits by type and status
    const typeStats = await this.visitRepository
      .createQueryBuilder('visit')
      .select('visit.visitType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('visit.visitType')
      .getRawMany();

    const statusStats = await this.visitRepository
      .createQueryBuilder('visit')
      .select('visit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('visit.status')
      .getRawMany();

    const visitsByType: Record<string, number> = {};
    typeStats.forEach((stat) => {
      visitsByType[stat.type] = parseInt(stat.count, 10);
    });

    const visitsByStatus: Record<string, number> = {};
    statusStats.forEach((stat) => {
      visitsByStatus[stat.status] = parseInt(stat.count, 10);
    });

    // Average duration
    const durationResult = await this.visitRepository
      .createQueryBuilder('visit')
      .select('AVG(visit.durationMinutes)', 'averageDuration')
      .where('visit.durationMinutes IS NOT NULL')
      .getRawOne();

    const averageDuration = parseFloat(durationResult?.averageDuration || '0');

    return {
      totalVisits,
      visitsToday,
      visitsThisWeek,
      visitsThisMonth,
      visitsByType,
      visitsByStatus,
      averageDuration,
    };
  }
}