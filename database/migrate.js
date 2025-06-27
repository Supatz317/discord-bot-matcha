import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { sql } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations for event logging
 */
async function runMigrations() {
    console.log('🚀 Starting database migrations for event logging...\n');

    try {
        // Read and execute the migration SQL
        const migrationPath = join(__dirname, 'migrations', '001_create_event_logs.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration: 001_create_event_logs.sql');
        
        // Split the SQL file by statements (basic splitting on semicolon)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let successCount = 0;
        for (const statement of statements) {
            try {
                if (statement.trim()) {
                    await sql.unsafe(statement);
                    successCount++;
                }
            } catch (error) {
                // Some errors are expected (like "already exists")
                if (!error.message.includes('already exists')) {
                    console.warn(`⚠️  Warning executing statement: ${error.message}`);
                }
            }
        }

        console.log(`✅ Migration completed successfully! Executed ${successCount} statements.\n`);

        // Verify the tables were created
        console.log('🔍 Verifying table creation...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%event%' 
            OR table_name LIKE '%log%'
            ORDER BY table_name
        `;

        console.log('📊 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        // Check categories and levels
        const categories = await sql`SELECT name FROM event_categories ORDER BY name`;
        const levels = await sql`SELECT name, severity FROM log_levels ORDER BY severity`;

        console.log('\n📂 Event Categories:');
        categories.forEach(cat => console.log(`   - ${cat.name}`));

        console.log('\n📊 Log Levels:');
        levels.forEach(level => console.log(`   - ${level.name} (${level.severity})`));

        console.log('\n🎉 Event logging database setup complete!');
        console.log('💡 You can now use the EventLogger class to log events to the database.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations()
        .then(() => {
            console.log('\n✨ All done! Exiting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

export { runMigrations };
