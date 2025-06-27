import { runMigrations } from './database/migrate.js';
import analytics from './database/analytics.js';
import logger from './utils/logger.js';

/**
 * Bot startup script
 * Handles database migrations and initial setup
 */
async function startup() {
    console.log('🚀 Starting Discord Bot...\n');

    try {
        // Run database migrations
        console.log('📦 Setting up database...');
        await runMigrations();
        
        // Test logging system
        console.log('\n🧪 Testing logging system...');
        await logger.info('system.startup', 'Bot startup process initiated', {
            category: 'SYSTEM',
            details: {
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsage: process.memoryUsage()
            }
        });

        // Generate initial analytics report
        console.log('\n📊 Generating analytics report...');
        await analytics.printReport(168); // Last week

        console.log('\n✅ Startup complete! Bot is ready.');
        
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startup();
}

export { startup };
