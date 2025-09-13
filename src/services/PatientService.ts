import { Repository, Like, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Patient, Gender } from '../entities/Patient';
import { Visit } from '../entities/Visit';

export interface CreatePatientRequest {
  name: string;
  dateOfBirth: Date;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  nhifNumber?: string;
  nationalId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  bloodGroup?: string;
  facilityId?: string;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {}

export interface PatientQuery {
  page?: number;
  limit?: number;
  search?: string;
  gender?: Gender;
  facilityId?: string;
  ageRange?: {
    min?: number;
    max?: number;
  };
}

export interface PatientWithStats extends Patient {
  visitCount: number;
  lastVisitDate?: Date;
  recentVisits: Visit[];
}

export class PatientService {
  private patientRepository: Repository<Patient>;
  private visitRepository: Repository<Visit>;

  constructor() {
    this.patientRepository = AppDataSource.getRepository(Patient);
    this.visitRepository = AppDataSource.getRepository(Visit);
  }

  /**
   * Create a new patient
   */
  async createPatient(patientData: CreatePatientRequest, userId: string): Promise<Patient> {
    // Check for duplicate national ID if provided
    if (patientData.nationalId) {
      const existingPatient = await this.patientRepository.findOne({
        where: { nationalId: patientData.nationalId, isActive: true },
      });

      if (existingPatient) {
        throw new Error('Patient with this National ID already exists');
      }
    }

    // Check for duplicate NHIF number if provided
    if (patientData.nhifNumber) {
      const existingPatient = await this.patientRepository.findOne({
        where: { nhifNumber: patientData.nhifNumber, isActive: true },
      });

      if (existingPatient) {
        throw new Error('Patient with this NHIF number already exists');
      }
    }

    const patient = this.patientRepository.create({
      ...patientData,
      isActive: true,
    });

    return await this.patientRepository.save(patient);
  }

  /**
   * Get paginated list of patients with search
   */
  async getPatients(query: PatientQuery): Promise<{
    patients: Patient[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      gender,
      facilityId,
      ageRange,
    } = query;

    const skip = (page - 1) * limit;
    
    const queryBuilder = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.facility', 'facility')
      .where('patient.isActive = :isActive', { isActive: true });

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(patient.name LIKE :search OR patient.nhifNumber LIKE :search OR patient.nationalId LIKE :search OR patient.phone LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply gender filter
    if (gender) {
      queryBuilder.andWhere('patient.gender = :gender', { gender });
    }

    // Apply facility filter
    if (facilityId) {
      queryBuilder.andWhere('patient.facilityId = :facilityId', { facilityId });
    }

    // Apply age range filter
    if (ageRange) {
      const today = new Date();
      
      if (ageRange.min !== undefined) {
        const maxBirthDate = new Date(today.getFullYear() - ageRange.min, today.getMonth(), today.getDate());
        queryBuilder.andWhere('patient.dateOfBirth <= :maxBirthDate', { maxBirthDate });
      }
      
      if (ageRange.max !== undefined) {
        const minBirthDate = new Date(today.getFullYear() - ageRange.max - 1, today.getMonth(), today.getDate());
        queryBuilder.andWhere('patient.dateOfBirth > :minBirthDate', { minBirthDate });
      }
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and get results
    const patients = await queryBuilder
      .orderBy('patient.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      patients,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get patient by ID with additional statistics
   */
  async getPatientById(id: string, includeStats: boolean = false): Promise<PatientWithStats | null> {
    const patient = await this.patientRepository.findOne({
      where: { id, isActive: true },
      relations: ['facility'],
    });

    if (!patient) {
      return null;
    }

    if (!includeStats) {
      return {
        ...patient,
        visitCount: 0,
        recentVisits: [],
        age: patient.age,
        formattedDateOfBirth: patient.formattedDateOfBirth,
      };
    }

    // Get visit statistics
    const visitCount = await this.visitRepository.count({
      where: { patientId: id },
    });

    const lastVisit = await this.visitRepository.findOne({
      where: { patientId: id },
      order: { visitDate: 'DESC' },
    });

    const recentVisits = await this.visitRepository.find({
      where: { patientId: id },
      order: { visitDate: 'DESC' },
      take: 5,
    });

    return {
      ...patient,
      visitCount,
      lastVisitDate: lastVisit?.visitDate,
      recentVisits,
      age: patient.age,
      formattedDateOfBirth: patient.formattedDateOfBirth,
    };
  }

  /**
   * Update patient information
   */
  async updatePatient(id: string, updateData: UpdatePatientRequest, userId: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check for duplicate national ID if being updated
    if (updateData.nationalId && updateData.nationalId !== patient.nationalId) {
      const existingPatient = await this.patientRepository.findOne({
        where: { nationalId: updateData.nationalId, isActive: true },
      });

      if (existingPatient && existingPatient.id !== id) {
        throw new Error('Patient with this National ID already exists');
      }
    }

    // Check for duplicate NHIF number if being updated
    if (updateData.nhifNumber && updateData.nhifNumber !== patient.nhifNumber) {
      const existingPatient = await this.patientRepository.findOne({
        where: { nhifNumber: updateData.nhifNumber, isActive: true },
      });

      if (existingPatient && existingPatient.id !== id) {
        throw new Error('Patient with this NHIF number already exists');
      }
    }

    // Update patient fields
    Object.assign(patient, updateData);

    return await this.patientRepository.save(patient);
  }

  /**
   * Soft delete patient (deactivate)
   */
  async deletePatient(id: string, userId: string): Promise<void> {
    const patient = await this.patientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    patient.isActive = false;
    await this.patientRepository.save(patient);
  }

  /**
   * Get patient's visit history
   */
  async getPatientVisits(
    patientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    visits: Visit[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [visits, total] = await this.visitRepository.findAndCount({
      where: { patientId },
      order: { visitDate: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      visits,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Search patients by various criteria
   */
  async searchPatients(searchTerm: string, limit: number = 10): Promise<Patient[]> {
    return await this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.facility', 'facility')
      .where('patient.isActive = :isActive', { isActive: true })
      .andWhere(
        '(patient.name LIKE :search OR patient.nhifNumber LIKE :search OR patient.nationalId LIKE :search OR patient.phone LIKE :search)',
        { search: `%${searchTerm}%` }
      )
      .orderBy('patient.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get patient statistics
   */
  async getPatientStatistics(facilityId?: string): Promise<{
    totalPatients: number;
    activePatients: number;
    newPatientsThisMonth: number;
    patientsByGender: { male: number; female: number; other: number };
    averageAge: number;
  }> {
    const queryBuilder = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.isActive = :isActive', { isActive: true });

    if (facilityId) {
      queryBuilder.andWhere('patient.facilityId = :facilityId', { facilityId });
    }

    // Total active patients
    const totalPatients = await queryBuilder.getCount();

    // New patients this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newPatientsThisMonth = await queryBuilder
      .andWhere('patient.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    // Patients by gender
    const genderStats = await this.patientRepository
      .createQueryBuilder('patient')
      .select('patient.gender', 'gender')
      .addSelect('COUNT(*)', 'count')
      .where('patient.isActive = :isActive', { isActive: true })
      .andWhere(facilityId ? 'patient.facilityId = :facilityId' : '1=1', { facilityId })
      .groupBy('patient.gender')
      .getRawMany();

    const patientsByGender = {
      male: 0,
      female: 0,
      other: 0,
    };

    genderStats.forEach((stat) => {
      patientsByGender[stat.gender as keyof typeof patientsByGender] = parseInt(stat.count, 10);
    });

    // Average age calculation
    const patients = await this.patientRepository.find({
      where: facilityId ? { isActive: true, facilityId } : { isActive: true },
      select: ['dateOfBirth'],
    });

    const totalAge = patients.reduce((sum, patient) => {
      const today = new Date();
      const birthDate = new Date(patient.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return sum + age;
    }, 0);

    const averageAge = patients.length > 0 ? Math.round(totalAge / patients.length) : 0;

    return {
      totalPatients,
      activePatients: totalPatients,
      newPatientsThisMonth,
      patientsByGender,
      averageAge,
    };
  }
}