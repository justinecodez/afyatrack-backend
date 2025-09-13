import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { Patient } from './Patient';

export enum FacilityType {
  HOSPITAL = 'hospital',
  HEALTH_CENTER = 'health_center',
  DISPENSARY = 'dispensary',
  CLINIC = 'clinic',
}

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
    enum: FacilityType,
    default: FacilityType.HEALTH_CENTER,
  })
  type: FacilityType;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  district?: string;

  @Column({ nullable: true })
  ward?: string;

  @Column({ name: 'license_number', nullable: true })
  licenseNumber?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.facility)
  users: User[];

  @OneToMany(() => Patient, (patient) => patient.facility)
  patients: Patient[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}