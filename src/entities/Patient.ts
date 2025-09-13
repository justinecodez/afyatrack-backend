import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Visit } from './Visit';
import { Facility } from './Facility';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column({
    type: 'text',
    enum: Gender,
  })
  gender: Gender;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'nhif_number', nullable: true })
  nhifNumber?: string;

  @Column({ name: 'national_id', nullable: true, unique: true })
  nationalId?: string;

  // Emergency contact information
  @Column({ name: 'emergency_contact_name', nullable: true })
  emergencyContactName?: string;

  @Column({ name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone?: string;

  @Column({ name: 'emergency_contact_relationship', nullable: true })
  emergencyContactRelationship?: string;

  // Medical information
  @Column({ type: 'text', nullable: true })
  allergies?: string;

  @Column({ name: 'chronic_conditions', type: 'text', nullable: true })
  chronicConditions?: string;

  @Column({ name: 'current_medications', type: 'text', nullable: true })
  currentMedications?: string;

  @Column({ name: 'blood_group', nullable: true })
  bloodGroup?: string;

  @Column({ name: 'facility_id', nullable: true })
  facilityId?: string;

  @ManyToOne(() => Facility, (facility) => facility.patients, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @OneToMany(() => Visit, (visit) => visit.patient)
  visits: Visit[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Calculate age from date of birth
  get age(): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Get formatted date of birth
  get formattedDateOfBirth(): string {
    return this.dateOfBirth.toISOString().split('T')[0];
  }
}