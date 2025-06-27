import { sql } from './db.js';
import logger from '../utils/logger.js';

/**
 * Event Log Analytics Dashboard
 * Provides insights into bot performance and usage patterns
 */
class EventAnalytics {
    
    /**
     * Get overview statistics for the dashboard
     */
    async getDashboardOverview(hours = 24) {
        try {
            const stats = await sql`
                WITH recent_logs AS (
                    SELECT 
                        el.*,
                        ec.name as category_name,
                        ll.name as level_name,
                        ll.severity
                    FROM event_logs el
                    JOIN event_categories ec ON el.category_id = ec.id
                    JOIN log_levels ll ON el.level_id = ll.id
                    WHERE el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                )
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT guild_id) as active_guilds,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(CASE WHEN level_name = 'ERROR' THEN 1 END) as error_count,
                    COUNT(CASE WHEN level_name = 'FATAL' THEN 1 END) as fatal_count,
                    COUNT(CASE WHEN category_name = 'COMMAND' THEN 1 END) as command_executions,
                    AVG(CASE WHEN execution_time_ms IS NOT NULL THEN execution_time_ms END) as avg_execution_time,
                    MAX(execution_time_ms) as max_execution_time,
                    AVG(memory_usage_mb) as avg_memory_usage,
                    MAX(memory_usage_mb) as peak_memory_usage
                FROM recent_logs
            `;

            return stats[0];
        } catch (error) {
            await logger.error('analytics.overview_failed', 'Failed to get dashboard overview', error);
            throw error;
        }
    }

    /**
     * Get command usage statistics
     */
    async getCommandStats(hours = 24, limit = 10) {
        try {
            return await sql`
                SELECT 
                    el.command_name,
                    COUNT(*) as execution_count,
                    COUNT(CASE WHEN el.error_message IS NOT NULL THEN 1 END) as error_count,
                    AVG(el.execution_time_ms) as avg_execution_time,
                    MAX(el.execution_time_ms) as max_execution_time,
                    COUNT(DISTINCT el.user_id) as unique_users,
                    COUNT(DISTINCT el.guild_id) as unique_guilds
                FROM event_logs el
                JOIN log_levels ll ON el.level_id = ll.id
                WHERE el.command_name IS NOT NULL
                AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                GROUP BY el.command_name
                ORDER BY execution_count DESC
                LIMIT ${limit}
            `;
        } catch (error) {
            await logger.error('analytics.command_stats_failed', 'Failed to get command statistics', error);
            throw error;
        }
    }

    /**
     * Get error analysis
     */
    async getErrorAnalysis(hours = 24) {
        try {
            return await sql`
                SELECT 
                    ec.name as category,
                    el.event_type,
                    el.command_name,
                    COUNT(*) as error_count,
                    COUNT(DISTINCT el.guild_id) as affected_guilds,
                    COUNT(DISTINCT el.user_id) as affected_users,
                    el.error_message,
                    MAX(el.created_at) as last_occurrence
                FROM event_logs el
                JOIN event_categories ec ON el.category_id = ec.id
                JOIN log_levels ll ON el.level_id = ll.id
                WHERE ll.name IN ('ERROR', 'FATAL')
                AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                GROUP BY ec.name, el.event_type, el.command_name, el.error_message
                ORDER BY error_count DESC, last_occurrence DESC
                LIMIT 20
            `;
        } catch (error) {
            await logger.error('analytics.error_analysis_failed', 'Failed to get error analysis', error);
            throw error;
        }
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(hours = 24) {
        try {
            return await sql`
                SELECT 
                    DATE_TRUNC('hour', el.created_at) as hour,
                    COUNT(*) as event_count,
                    AVG(el.execution_time_ms) as avg_execution_time,
                    MAX(el.execution_time_ms) as max_execution_time,
                    AVG(el.memory_usage_mb) as avg_memory_usage,
                    MAX(el.memory_usage_mb) as peak_memory_usage,
                    COUNT(CASE WHEN ll.name IN ('ERROR', 'FATAL') THEN 1 END) as error_count
                FROM event_logs el
                JOIN log_levels ll ON el.level_id = ll.id
                WHERE el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                GROUP BY DATE_TRUNC('hour', el.created_at)
                ORDER BY hour DESC
            `;
        } catch (error) {
            await logger.error('analytics.performance_trends_failed', 'Failed to get performance trends', error);
            throw error;
        }
    }

    /**
     * Get top active guilds
     */
    async getTopGuilds(hours = 24, limit = 10) {
        try {
            return await sql`
                SELECT 
                    el.guild_id,
                    COUNT(*) as total_events,
                    COUNT(DISTINCT el.user_id) as unique_users,
                    COUNT(CASE WHEN el.command_name IS NOT NULL THEN 1 END) as command_count,
                    COUNT(CASE WHEN ll.name IN ('ERROR', 'FATAL') THEN 1 END) as error_count,
                    AVG(el.execution_time_ms) as avg_execution_time
                FROM event_logs el
                JOIN log_levels ll ON el.level_id = ll.id
                WHERE el.guild_id IS NOT NULL
                AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                GROUP BY el.guild_id
                ORDER BY total_events DESC
                LIMIT ${limit}
            `;
        } catch (error) {
            await logger.error('analytics.top_guilds_failed', 'Failed to get top guilds', error);
            throw error;
        }
    }

    /**
     * Get recent critical events
     */
    async getCriticalEvents(hours = 24, limit = 20) {
        try {
            return await sql`
                SELECT 
                    el.created_at,
                    ec.name as category,
                    ll.name as level,
                    el.event_name,
                    el.command_name,
                    el.guild_id,
                    el.user_id,
                    el.message,
                    el.error_message,
                    el.execution_time_ms
                FROM event_logs el
                JOIN event_categories ec ON el.category_id = ec.id
                JOIN log_levels ll ON el.level_id = ll.id
                WHERE ll.name IN ('ERROR', 'FATAL')
                AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
                ORDER BY el.created_at DESC
                LIMIT ${limit}
            `;
        } catch (error) {
            await logger.error('analytics.critical_events_failed', 'Failed to get critical events', error);
            throw error;
        }
    }

    /**
     * Generate a comprehensive report
     */
    async generateReport(hours = 24) {
        try {
            const [
                overview,
                commandStats,
                errorAnalysis,
                performanceTrends,
                topGuilds,
                criticalEvents
            ] = await Promise.all([
                this.getDashboardOverview(hours),
                this.getCommandStats(hours),
                this.getErrorAnalysis(hours),
                this.getPerformanceTrends(hours),
                this.getTopGuilds(hours),
                this.getCriticalEvents(hours)
            ]);

            return {
                period: `Last ${hours} hours`,
                generatedAt: new Date().toISOString(),
                overview,
                commands: commandStats,
                errors: errorAnalysis,
                performance: performanceTrends,
                guilds: topGuilds,
                criticalEvents
            };
        } catch (error) {
            await logger.error('analytics.report_failed', 'Failed to generate analytics report', error);
            throw error;
        }
    }

    /**
     * Print a formatted console report
     */
    async printReport(hours = 24) {
        console.log(`\n🤖 Discord Bot Analytics Report - Last ${hours} hours`);
        console.log('='.repeat(60));

        try {
            const report = await this.generateReport(hours);
            const { overview, commands, errors, guilds } = report;

            // Overview
            console.log('\n📊 OVERVIEW');
            console.log(`   Total Events: ${overview.total_events}`);
            console.log(`   Active Guilds: ${overview.active_guilds}`);
            console.log(`   Active Users: ${overview.active_users}`);
            console.log(`   Command Executions: ${overview.command_executions}`);
            console.log(`   Errors: ${overview.error_count} | Fatal: ${overview.fatal_count}`);
            console.log(`   Avg Execution Time: ${overview.avg_execution_time?.toFixed(2)}ms`);
            console.log(`   Avg Memory Usage: ${overview.avg_memory_usage?.toFixed(2)}MB`);

            // Top Commands
            console.log('\n🚀 TOP COMMANDS');
            commands.slice(0, 5).forEach((cmd, i) => {
                console.log(`   ${i + 1}. /${cmd.command_name}: ${cmd.execution_count} uses (${cmd.error_count} errors)`);
            });

            // Recent Errors
            if (errors.length > 0) {
                console.log('\n❌ RECENT ERRORS');
                errors.slice(0, 3).forEach((err, i) => {
                    console.log(`   ${i + 1}. ${err.category} - ${err.error_message?.substring(0, 80)}...`);
                });
            }

            // Top Guilds
            console.log('\n🏆 MOST ACTIVE GUILDS');
            guilds.slice(0, 3).forEach((guild, i) => {
                console.log(`   ${i + 1}. ${guild.guild_id}: ${guild.total_events} events (${guild.unique_users} users)`);
            });

            console.log('\n' + '='.repeat(60));
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    }
}

// Export singleton instance
const analytics = new EventAnalytics();
export default analytics;
export { EventAnalytics };
