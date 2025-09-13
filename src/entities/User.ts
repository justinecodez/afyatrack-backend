import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Facility } from './Facility';
import { RefreshToken } from './RefreshToken';

export enum UserRole {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  ADMIN = 'admin',
  RECEPTIONIST = 'receptionist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
    enum: UserRole,
    default: UserRole.DOCTOR,
  })
  role: UserRole;

  @Column({ name: 'facility_id', nullable: true })
  facilityId?: string;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', nullable: true })
  lastLogin?: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Method to check if user can access patient data
  canAccessPatient(): boolean {
    return [UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN].includes(this.role);
  }

  // Method to check if user can modify patient data
  canModifyPatient(): boolean {
    return [UserRole.DOCTOR, UserRole.ADMIN].includes(this.role);
  }

  // Method to check if user has admin privileges
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}