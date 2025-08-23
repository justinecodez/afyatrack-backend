import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Enable verbose mode for debugging in development
const sqlite = sqlite3.verbose();

class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'afyatrack.db');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  public async connect(): Promise<sqlite3.Database> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err.message);
          reject(err);
        } else {
          console.log(`Connected to SQLite database at ${this.dbPath}`);
          
          // Enable foreign keys and WAL mode for better performance
          this.db!.serialize(() => {
            this.db!.run('PRAGMA foreign_keys = ON');
            this.db!.run('PRAGMA journal_mode = WAL');
            this.db!.run('PRAGMA synchronous = NORMAL');
            this.db!.run('PRAGMA cache_size = 1000');
            this.db!.run('PRAGMA temp_store = memory');
          });
          
          resolve(this.db!);
        }
      });
    });
  }

  public async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }

  public getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  // Promisified database methods for easier async/await usage
  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.getDatabase().run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.getDatabase().get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.getDatabase().all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  // Transaction support
  public async transaction<T>(callback: (db: sqlite3.Database) => Promise<T>): Promise<T> {
    const db = this.getDatabase();
    
    await this.run('BEGIN TRANSACTION');
    
    try {
      const result = await callback(db);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Backup method (simplified - copy file)
  public async backup(backupPath?: string): Promise<void> {
    const backup = backupPath || `${this.dbPath}.backup.${Date.now()}`;
    
    try {
      const fs = require('fs');
      await fs.promises.copyFile(this.dbPath, backup);
      console.log(`Database backed up to ${backup}`);
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const dbManager = new DatabaseManager();

// Export the database connection for direct access when needed
export { sqlite3 };
