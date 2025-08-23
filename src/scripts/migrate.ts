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
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await dbManager.run(statement);
      } catch (error) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
    
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
