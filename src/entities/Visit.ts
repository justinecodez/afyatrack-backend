import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from './Patient';

export enum VisitStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VisitType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  SCREENING = 'screening',
  ROUTINE_CHECK = 'routine_check',
}

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => Patient, (patient) => patient.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'visit_date' })
  visitDate: Date;

  @Column({
    name: 'visit_type',
    type: 'text',
    enum: VisitType,
    default: VisitType.CONSULTATION,
  })
  visitType: VisitType;

  @Column({ name: 'chief_complaint', type: 'text' })
  chiefComplaint: string;

  @Column({ name: 'current_illness', type: 'text', nullable: true })
  currentIllness?: string;

  @Column({ name: 'medical_history', type: 'text', nullable: true })
  medicalHistory?: string;

  @Column({ name: 'physical_exam', type: 'text', nullable: true })
  physicalExam?: string;

  @Column({ type: 'text', nullable: true })
  assessment?: string;

  @Column({ type: 'text', nullable: true })
  plan?: string;

  // SOAP Notes - structured format
  @Column({ name: 'soap_subjective', type: 'text', nullable: true })
  soapSubjective?: string;

  @Column({ name: 'soap_objective', type: 'text', nullable: true })
  soapObjective?: string;

  @Column({ name: 'soap_assessment', type: 'text', nullable: true })
  soapAssessment?: string;

  @Column({ name: 'soap_plan', type: 'text', nullable: true })
  soapPlan?: string;

  // Recommendations as JSON array
  @Column({ type: 'text', nullable: true })
  recommendations?: string;

  // Voice transcript and audio
  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ name: 'audio_url', nullable: true })
  audioUrl?: string;

  @Column({ name: 'duration_minutes', nullable: true })
  durationMinutes?: number;

  // Next appointment
  @Column({ name: 'next_appointment', nullable: true })
  nextAppointment?: Date;

  // Visit status
  @Column({
    type: 'text',
    enum: VisitStatus,
    default: VisitStatus.ACTIVE,
  })
  status: VisitStatus;

  // Vital signs (stored as JSON)
  @Column({ name: 'vital_signs', type: 'text', nullable: true })
  vitalSigns?: string;

  // Prescription information
  @Column({ name: 'prescriptions', type: 'text', nullable: true })
  prescriptions?: string;

  // Lab orders and results
  @Column({ name: 'lab_orders', type: 'text', nullable: true })
  labOrders?: string;

  @Column({ name: 'lab_results', type: 'text', nullable: true })
  labResults?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getParsedRecommendations(): Array<{ type: string; title: string; message: string }> {
    if (!this.recommendations) return [];
    try {
      return JSON.parse(this.recommendations);
    } catch {
      return [];
    }
  }

  setParsedRecommendations(recommendations: Array<{ type: string; title: string; message: string }>): void {
    this.recommendations = JSON.stringify(recommendations);
  }

  getParsedVitalSigns(): Record<string, any> {
    if (!this.vitalSigns) return {};
    try {
      return JSON.parse(this.vitalSigns);
    } catch {
      return {};
    }
  }

  setParsedVitalSigns(vitalSigns: Record<string, any>): void {
    this.vitalSigns = JSON.stringify(vitalSigns);
  }

  getParsedPrescriptions(): Array<any> {
    if (!this.prescriptions) return [];
    try {
      return JSON.parse(this.prescriptions);
    } catch {
      return [];
    }
  }

  setParsedPrescriptions(prescriptions: Array<any>): void {
    this.prescriptions = JSON.stringify(prescriptions);
  }

  // Get formatted visit date
  get formattedVisitDate(): string {
    return this.visitDate.toISOString().split('T')[0];
  }

  // Check if visit is recent (within last 30 days)
  get isRecent(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.visitDate >= thirtyDaysAgo;
  }
}