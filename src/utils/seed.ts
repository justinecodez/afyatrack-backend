import 'reflect-metadata';
import { config } from 'dotenv';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Facility, FacilityType } from '../entities/Facility';
import { Patient, Gender } from '../entities/Patient';
import { Visit, VisitStatus, VisitType } from '../entities/Visit';
import { PasswordService } from './password';

// Load environment variables
config();

class DatabaseSeeder {
  private facilityRepository = AppDataSource.getRepository(Facility);
  private userRepository = AppDataSource.getRepository(User);
  private patientRepository = AppDataSource.getRepository(Patient);
  private visitRepository = AppDataSource.getRepository(Visit);

  async run(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Initialize database
      await AppDataSource.initialize();
      console.log('✅ Database connected');

      // Clear existing data only if tables exist
      try {
        await this.clearData();
      } catch (error) {
        console.log('⚠️  Skipping data clearing (tables may not exist yet)');
      }

      // Seed data
      const facility = await this.seedFacility();
      const users = await this.seedUsers(facility);
      const patients = await this.seedPatients(facility);
      await this.seedVisits(patients);

      console.log('🎉 Database seeding completed successfully!');
      console.log(`📊 Created: ${users.length} users, ${patients.length} patients`);
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await AppDataSource.destroy();
    }
  }

  private async clearData(): Promise<void> {
    console.log('🧹 Clearing existing data...');
    
    // Clear data using query builders to avoid empty criteria error
    await this.visitRepository.createQueryBuilder().delete().execute();
    await this.patientRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();
    await this.facilityRepository.createQueryBuilder().delete().execute();
    
    console.log('✅ Data cleared');
  }

  private async seedFacility(): Promise<Facility> {
    console.log('🏥 Creating facility...');
    
    const facility = this.facilityRepository.create({
      name: 'Muhimbili National Hospital',
      type: FacilityType.HOSPITAL,
      address: 'United Nations Road, Upanga West, Dar es Salaam',
      phone: '+255222150302',
      email: 'info@mnh.or.tz',
      region: 'Dar es Salaam',
      district: 'Ilala',
      ward: 'Upanga West',
      licenseNumber: 'MNH-001-2024',
      isActive: true,
    });

    return await this.facilityRepository.save(facility);
  }

  private async seedUsers(facility: Facility): Promise<User[]> {
    console.log('👥 Creating users...');
    
    const users = [
      {
        email: 'dr.mwalimu@mnh.or.tz',
        password: await PasswordService.hashPassword('Password123!'),
        name: 'Dr. Mwalimu',
        role: UserRole.DOCTOR,
        facilityId: facility.id,
      },
      {
        email: 'nurse.mary@mnh.or.tz',
        password: await PasswordService.hashPassword('Password123!'),
        name: 'Nurse Mary Kondo',
        role: UserRole.NURSE,
        facilityId: facility.id,
      },
      {
        email: 'admin@afyatrack.com',
        password: await PasswordService.hashPassword('AdminPass123!'),
        name: 'System Administrator',
        role: UserRole.ADMIN,
      },
    ];

    const createdUsers: User[] = [];
    for (const userData of users) {
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);
      createdUsers.push(savedUser);
    }

    console.log(`✅ Created ${createdUsers.length} users`);
    return createdUsers;
  }

  private async seedPatients(facility: Facility): Promise<Patient[]> {
    console.log('👤 Creating patients...');
    
    const patients = [
      {
        name: 'Rehema Mwakalinga',
        dateOfBirth: new Date('1989-05-15'),
        gender: Gender.FEMALE,
        phone: '+255754123456',
        email: 'rehema.mwakalinga@gmail.com',
        address: 'Kinondoni, Dar es Salaam',
        nhifNumber: 'NH001234567',
        nationalId: '19890515-12345-00001-23',
        facilityId: facility.id,
        emergencyContactName: 'Hassan Mwakalinga',
        emergencyContactPhone: '+255767123456',
        emergencyContactRelationship: 'Husband',
        allergies: 'Penicillin',
        chronicConditions: 'Hypertension',
        bloodGroup: 'O+',
      },
      {
        name: 'John Mwalimu',
        dateOfBirth: new Date('1995-03-22'),
        gender: Gender.MALE,
        phone: '+255765987654',
        address: 'Temeke, Dar es Salaam',
        nhifNumber: 'NH009876543',
        nationalId: '19950322-54321-00002-45',
        facilityId: facility.id,
        emergencyContactName: 'Grace Mwalimu',
        emergencyContactPhone: '+255754987654',
        emergencyContactRelationship: 'Sister',
        bloodGroup: 'A+',
      },
      {
        name: 'Grace Kilonzo',
        dateOfBirth: new Date('1978-11-08'),
        gender: Gender.FEMALE,
        phone: '+255713456789',
        email: 'grace.kilonzo@yahoo.com',
        address: 'Ilala, Dar es Salaam',
        nhifNumber: 'NH005678901',
        nationalId: '19781108-67890-00003-78',
        facilityId: facility.id,
        emergencyContactName: 'Peter Kilonzo',
        emergencyContactPhone: '+255722456789',
        emergencyContactRelationship: 'Spouse',
        chronicConditions: 'Type 2 Diabetes',
        currentMedications: 'Metformin 500mg',
        bloodGroup: 'B+',
      },
    ];

    const createdPatients: Patient[] = [];
    for (const patientData of patients) {
      const patient = this.patientRepository.create(patientData);
      const savedPatient = await this.patientRepository.save(patient);
      createdPatients.push(savedPatient);
    }

    console.log(`✅ Created ${createdPatients.length} patients`);
    return createdPatients;
  }

  private async seedVisits(patients: Patient[]): Promise<void> {
    console.log('🏥 Creating visits...');
    
    const [rehema, john, grace] = patients;

    const visits = [
      {
        patientId: rehema.id,
        visitDate: new Date('2025-01-15'),
        visitType: VisitType.FOLLOW_UP,
        chiefComplaint: 'Hypertension follow-up',
        currentIllness: 'Patient reports improved headaches since starting medication',
        physicalExam: 'BP: 130/85 mmHg, HR: 72 bpm, Temp: 36.7°C',
        assessment: 'Essential hypertension - showing good response to treatment',
        plan: 'Continue Amlodipine 5mg once daily, lifestyle counseling, follow-up in 4 weeks',
        soapSubjective: 'Mgonjwa anaeleza kuwa ana maumivu ya kichwa yamepungua tangu wiki za nyuma.',
        soapObjective: 'Vital signs: BP 130/85 mmHg, HR 72 bpm, Temp 36.7°C. Patient appears well.',
        soapAssessment: 'Essential hypertension (I10) - showing good response to treatment.',
        soapPlan: '1. Continue Amlodipine 5mg once daily\\n2. Lifestyle counseling\\n3. Follow-up in 4 weeks',
        status: VisitStatus.COMPLETED,
        durationMinutes: 45,
        recommendations: JSON.stringify([
          { type: 'info', title: 'Treatment Response', message: 'Patient showing excellent response to therapy.' },
          { type: 'suggestion', title: 'Lifestyle Counseling', message: 'Reinforce dietary modifications.' }
        ]),
      },
      {
        patientId: john.id,
        visitDate: new Date('2025-01-14'),
        visitType: VisitType.ROUTINE_CHECK,
        chiefComplaint: 'Routine health check-up',
        currentIllness: 'No specific complaints, annual check-up',
        physicalExam: 'BP: 120/80 mmHg, HR: 68 bpm, Temp: 36.5°C, Weight: 70kg',
        assessment: 'Healthy young adult, routine examination normal',
        plan: 'Continue healthy lifestyle, annual follow-up',
        status: VisitStatus.COMPLETED,
        durationMinutes: 30,
      },
      {
        patientId: grace.id,
        visitDate: new Date('2025-01-13'),
        visitType: VisitType.FOLLOW_UP,
        chiefComplaint: 'Diabetes management follow-up',
        currentIllness: 'Blood sugar levels have been stable, no hypoglycemic episodes',
        physicalExam: 'BP: 135/82 mmHg, HR: 74 bpm, Weight: 68kg, HbA1c: 7.2%',
        assessment: 'Type 2 Diabetes Mellitus - good glycemic control',
        plan: 'Continue Metformin, dietary counseling, follow-up in 3 months',
        status: VisitStatus.COMPLETED,
        durationMinutes: 40,
        recommendations: JSON.stringify([
          { type: 'info', title: 'Glucose Control', message: 'HbA1c levels within target range.' },
          { type: 'suggestion', title: 'Dietary Management', message: 'Continue current meal planning approach.' }
        ]),
      },
    ];

    for (const visitData of visits) {
      const visit = this.visitRepository.create(visitData);
      await this.visitRepository.save(visit);
    }

    console.log(`✅ Created ${visits.length} visits`);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.run()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { DatabaseSeeder };