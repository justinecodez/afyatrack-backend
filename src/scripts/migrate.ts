import { dbManager } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migration...');
    
    // Connect to database
    await dbManager.connect();
    
    // Read and execute schema file
    const schemaPath = path.join(process.cwd(), 'src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema at once using exec
    // This handles triggers and multi-statement SQL correctly
    await new Promise<void>((resolve, reject) => {
      dbManager.getDatabase().exec(schema, (err) => {
        if (err) {
          console.error('Error executing schema:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    console.log('Database migration completed successfully!');
    
    // Run health check
    const isHealthy = await dbManager.healthCheck();
    console.log(`Database health check: ${isHealthy ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
