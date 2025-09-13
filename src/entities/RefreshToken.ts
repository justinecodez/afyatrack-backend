import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'created_by_ip', nullable: true })
  createdByIp?: string;

  @Column({ name: 'revoked_by_ip', nullable: true })
  revokedByIp?: string;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Check if token is active (not expired and not revoked)
  get isActive(): boolean {
    return !this.isRevoked && this.expiresAt > new Date();
  }

  // Revoke the token
  revoke(revokedByIp?: string): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedByIp = revokedByIp;
  }
}