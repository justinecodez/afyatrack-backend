import { dbManager } from '../config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, VisitType, VisitStatus, RecommendationType, Priority } from '../types';

async function seedDatabase(): Promise<void> {
  try {
    console.log('Starting database seeding...');
    
    await dbManager.connect();
    
    // Check if data already exists
    const existingUsers = await dbManager.get('SELECT COUNT(*) as count FROM users');
    if (existingUsers && existingUsers.count > 0) {
      console.log('Database already contains data. Skipping seed.');
      return;
    }
    
    // Seed Users
    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('AfyaTrack123!', 12);
    
    const users = [
      {
        id: uuidv4(),
        email: 'dr.mwalimu@afyatrack.com',
        password: hashedPassword,
        firstName: 'Dr. John',
        lastName: 'Mwalimu',
        role: UserRole.DOCTOR,
        licenseNumber: 'TZ-DOC-001',
        isActive: 1
      },
      {
        id: uuidv4(),
        email: 'dr.hassan@afyatrack.com',
        password: hashedPassword,
        firstName: 'Dr. Amina',
        lastName: 'Hassan',
        role: UserRole.DOCTOR,
        licenseNumber: 'TZ-DOC-002',
        isActive: 1
      },
      {
        id: uuidv4(),
        email: 'nurse.mwamba@afyatrack.com',
        password: hashedPassword,
        firstName: 'Grace',
        lastName: 'Mwamba',
        role: UserRole.NURSE,
        licenseNumber: 'TZ-NUR-001',
        isActive: 1
      },
      {
        id: uuidv4(),
        email: 'admin@afyatrack.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        isActive: 1
      }
    ];
    
    for (const user of users) {
      await dbManager.run(`
        INSERT INTO users (id, email, password, first_name, last_name, role, license_number, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [user.id, user.email, user.password, user.firstName, user.lastName, user.role, user.licenseNumber, user.isActive]);
    }
    
    // Seed Patients
    console.log('Seeding patients...');
    const doctorId = users[0]?.id; // Dr. Mwalimu
    if (!doctorId) {
      throw new Error('Doctor user not found');
    }
    
    const patients = [
      {
        id: uuidv4(),
        firstName: 'Rehema',
        lastName: 'Mwakalinga',
        dateOfBirth: '1989-03-15',
        gender: 'female',
        phoneNumber: '+255712345678',
        email: 'rehema.mwakalinga@email.com',
        address: 'Kinondoni, Dar es Salaam',
        nhifNumber: 'NH001234567',
        emergencyContactName: 'Hassan Mwakalinga',
        emergencyContactPhone: '+255713456789',
        emergencyContactRelationship: 'Husband'
      },
      {
        id: uuidv4(),
        firstName: 'John',
        lastName: 'Massawe',
        dateOfBirth: '1995-07-22',
        gender: 'male',
        phoneNumber: '+255754567890',
        address: 'Temeke, Dar es Salaam',
        nhifNumber: 'NH009876543',
        emergencyContactName: 'Maria Massawe',
        emergencyContactPhone: '+255755678901',
        emergencyContactRelationship: 'Sister'
      },
      {
        id: uuidv4(),
        firstName: 'Grace',
        lastName: 'Kilonzo',
        dateOfBirth: '1978-11-08',
        gender: 'female',
        phoneNumber: '+255768901234',
        address: 'Ilala, Dar es Salaam',
        nhifNumber: 'NH005678901',
        emergencyContactName: 'Peter Kilonzo',
        emergencyContactPhone: '+255769012345',
        emergencyContactRelationship: 'Son'
      },
      {
        id: uuidv4(),
        firstName: 'David',
        lastName: 'Mwenda',
        dateOfBirth: '1992-01-30',
        gender: 'male',
        phoneNumber: '+255723456789',
        address: 'Ubungo, Dar es Salaam',
        nhifNumber: 'NH012345678'
      }
    ];
    
    for (const patient of patients) {
      await dbManager.run(`
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, gender, phone_number, 
          email, address, nhif_number, emergency_contact_name, 
          emergency_contact_phone, emergency_contact_relationship, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.id, patient.firstName, patient.lastName, patient.dateOfBirth,
        patient.gender, patient.phoneNumber, patient.email, patient.address,
        patient.nhifNumber, patient.emergencyContactName, patient.emergencyContactPhone,
        patient.emergencyContactRelationship, doctorId
      ]);
    }
    
    // Seed Visits
    console.log('Seeding visits...');
    const visits = [
      {
        id: uuidv4(),
        patientId: patients[0]?.id, // Rehema
        doctorId: doctorId,
        visitDate: '2025-01-15 09:30:00',
        visitType: VisitType.FOLLOW_UP,
        chiefComplaint: 'Hypertension follow-up',
        status: VisitStatus.COMPLETED,
        subjective: 'Mgonjwa anaeleza kuwa ana maumivu ya kichwa yamepungua tangu wiki za nyuma. Anatumia dawa za BP kila siku bila kusahau.',
        objective: 'Vital signs: BP 130/85 mmHg, HR 72 bpm, Temp 36.7°C. Patient appears well, alert and cooperative.',
        assessment: 'Essential hypertension (I10) - showing good response to treatment. Patient demonstrates good medication compliance.',
        plan: '1. Continue Amlodipine 5mg once daily\n2. Lifestyle counseling reinforced\n3. Follow-up in 4 weeks',
        duration: 45
      },
      {
        id: uuidv4(),
        patientId: patients[1]?.id, // John
        doctorId: doctorId,
        visitDate: '2025-01-14 14:15:00',
        visitType: VisitType.CONSULTATION,
        chiefComplaint: 'Routine check-up',
        status: VisitStatus.COMPLETED,
        subjective: 'Patient presents for routine health screening. No current complaints.',
        objective: 'Vital signs within normal limits. Physical examination unremarkable.',
        assessment: 'Healthy adult male, routine screening normal.',
        plan: 'Continue healthy lifestyle. Return in 1 year for routine screening.',
        duration: 30
      },
      {
        id: uuidv4(),
        patientId: patients[2]?.id, // Grace
        doctorId: users[1]?.id, // Dr. Hassan
        visitDate: '2025-01-13 11:00:00',
        visitType: VisitType.FOLLOW_UP,
        chiefComplaint: 'Diabetes management',
        status: VisitStatus.COMPLETED,
        subjective: 'Patient reports good glucose control with current medications. Checking blood sugar regularly.',
        objective: 'HbA1c 7.2%, BP 125/80, BMI 28.5. Foot examination normal.',
        assessment: 'Type 2 Diabetes Mellitus (E11) - fair control.',
        plan: '1. Continue current medications\n2. Dietary counseling\n3. Return in 3 months',
        duration: 40
      }
    ];
    
    for (const visit of visits) {
      if (visit.patientId && visit.doctorId) {
        await dbManager.run(`
          INSERT INTO visits (
            id, patient_id, doctor_id, visit_date, visit_type, chief_complaint,
            status, subjective, objective, assessment, plan, duration
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visit.id, visit.patientId, visit.doctorId, visit.visitDate,
          visit.visitType, visit.chiefComplaint, visit.status,
          visit.subjective, visit.objective, visit.assessment, visit.plan, visit.duration
        ]);
      }
    }
    
    // Seed Diagnoses
    console.log('Seeding diagnoses...');
    if (visits[0]?.id) {
      await dbManager.run(`
        INSERT INTO diagnoses (id, visit_id, icd_code, description, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), visits[0].id, 'I10', 'Essential hypertension', 1]);
    }
    
    if (visits[2]?.id) {
      await dbManager.run(`
        INSERT INTO diagnoses (id, visit_id, icd_code, description, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), visits[2].id, 'E11', 'Type 2 diabetes mellitus', 1]);
    }
    
    // Seed Medications
    console.log('Seeding medications...');
    if (visits[0]?.id) {
      await dbManager.run(`
        INSERT INTO medications (id, visit_id, medication_name, dosage, frequency, duration, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), visits[0].id, 'Amlodipine', '5mg', 'Once daily', '30 days',
        'Take in the morning with food. Monitor blood pressure regularly.'
      ]);
    }
    
    if (visits[2]?.id) {
      await dbManager.run(`
        INSERT INTO medications (id, visit_id, medication_name, dosage, frequency, duration, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), visits[2].id, 'Metformin', '500mg', 'Twice daily', '30 days',
        'Take with meals to reduce stomach upset. Monitor blood glucose.'
      ]);
    }
    
    // Seed Recommendations
    console.log('Seeding recommendations...');
    const recommendations = [
      {
        visitId: visits[0]?.id,
        type: RecommendationType.INFO,
        title: 'Treatment Response',
        description: 'Patient showing excellent response to antihypertensive therapy. Continue current regimen.',
        priority: Priority.MEDIUM
      },
      {
        visitId: visits[0]?.id,
        type: RecommendationType.FOLLOW_UP,
        title: 'Blood Pressure Monitoring',
        description: 'Schedule follow-up in 4 weeks to monitor blood pressure control.',
        priority: Priority.MEDIUM
      },
      {
        visitId: visits[2]?.id,
        type: RecommendationType.WARNING,
        title: 'Diabetes Control',
        description: 'HbA1c slightly above target. Consider medication adjustment or lifestyle modifications.',
        priority: Priority.HIGH
      }
    ];
    
    for (const rec of recommendations) {
      if (rec.visitId) {
        await dbManager.run(`
          INSERT INTO recommendations (id, visit_id, type, title, description, priority)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [uuidv4(), rec.visitId, rec.type, rec.title, rec.description, rec.priority]);
      }
    }
    
    console.log('Database seeding completed successfully!');
    
    // Display seeded accounts
    console.log('\n=== SEEDED ACCOUNTS ===');
    console.log('Email: dr.mwalimu@afyatrack.com');
    console.log('Password: AfyaTrack123!');
    console.log('Role: Doctor');
    console.log('');
    console.log('Email: admin@afyatrack.com');
    console.log('Password: AfyaTrack123!');
    console.log('Role: Admin');
    console.log('=======================\n');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
