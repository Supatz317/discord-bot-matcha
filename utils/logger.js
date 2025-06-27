import { sql } from '../database/db.js';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

/**
 * Enhanced Discord Bot Event Logger
 * Provides structured logging with database persistence and performance metrics
 */
class EventLogger {
    constructor() {
        this.sessionId = randomUUID();
        this.correlationMap = new Map(); // For tracking related events
        this.metricsCache = new Map(); // For storing performance metrics
    }

    /**
     * Main logging method
     * @param {Object} options - Logging options
     */
    async log({
        category = 'SYSTEM',
        level = 'INFO',
        eventName,
        eventType = null,
        message,
        
        // Discord Context
        guildId = null,
        channelId = null,
        userId = null,
        messageId = null,
        interactionId = null,
        
        // Command Context
        commandName = null,
        
        // Error Context
        error = null,
        
        // Additional Data
        details = {},
        requestData = null,
        responseData = null,
        
        // Performance
        executionTimeMs = null,
        
        // Correlation
        correlationId = null,
        
        // Optional metadata
        userAgent = null,
        ipAddress = null
    }) {
        const startTime = performance.now();
        
        try {
            // Generate correlation ID if not provided
            if (!correlationId) {
                correlationId = randomUUID();
            }

            // Get category and level IDs
            const categoryResult = await sql`
                SELECT id FROM event_categories WHERE name = ${category}
            `;
            const levelResult = await sql`
                SELECT id FROM log_levels WHERE name = ${level}
            `;

            if (categoryResult.length === 0) {
                throw new Error(`Unknown category: ${category}`);
            }
            if (levelResult.length === 0) {
                throw new Error(`Unknown level: ${level}`);
            }

            const categoryId = categoryResult[0].id;
            const levelId = levelResult[0].id;

            // Prepare error information
            let errorMessage = null;
            let errorStack = null;
            let errorCode = null;

            if (error) {
                errorMessage = error.message || String(error);
                errorStack = error.stack;
                errorCode = error.code || error.name;
            }

            // Get system metrics
            const memoryUsage = process.memoryUsage();
            const memoryUsageMB = Number((memoryUsage.heapUsed / 1024 / 1024).toFixed(2));

            // Insert the log entry
            const logResult = await sql`
                INSERT INTO event_logs (
                    category_id, level_id, event_name, event_type,
                    guild_id, channel_id, user_id, message_id, interaction_id,
                    command_name, message, details,
                    error_message, error_stack, error_code,
                    execution_time_ms, memory_usage_mb,
                    request_data, response_data,
                    session_id, correlation_id, user_agent, ip_address,
                    created_at, processed_at
                ) VALUES (
                    ${categoryId}, ${levelId}, ${eventName}, ${eventType},
                    ${guildId}, ${channelId}, ${userId}, ${messageId}, ${interactionId},
                    ${commandName}, ${message}, ${JSON.stringify(details)},
                    ${errorMessage}, ${errorStack}, ${errorCode},
                    ${executionTimeMs}, ${memoryUsageMB},
                    ${requestData ? JSON.stringify(requestData) : null},
                    ${responseData ? JSON.stringify(responseData) : null},
                    ${this.sessionId}, ${correlationId}, ${userAgent}, ${ipAddress},
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING id
            `;

            const logId = logResult[0].id;
            const dbOperationTime = performance.now() - startTime;

            // Console output with color coding
            this.consoleLog(level, category, eventName, message, {
                guildId, channelId, userId, commandName, correlationId,
                executionTimeMs, dbTime: Math.round(dbOperationTime)
            });

            return { logId, correlationId };

        } catch (dbError) {
            // Fallback to console logging if database fails
            console.error(`[DB-ERROR] Failed to log to database:`, dbError);
            this.consoleLog(level, category, eventName, message, { error: dbError.message });
            throw dbError;
        }
    }

    /**
     * Enhanced console logging with colors and formatting
     */
    consoleLog(level, category, eventName, message, context = {}) {
        const timestamp = new Date().toISOString();
        const colors = {
            DEBUG: '\x1b[36m',   // Cyan
            INFO: '\x1b[32m',    // Green
            WARN: '\x1b[33m',    // Yellow
            ERROR: '\x1b[31m',   // Red
            FATAL: '\x1b[35m'    // Magenta
        };
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';

        const color = colors[level] || '\x1b[37m'; // Default to white
        
        // Format context for display - prioritize important fields
        const contextEntries = Object.entries(context)
            .filter(([key, value]) => value !== null && value !== undefined);
        
        // Sort to show important fields first
        const priorityFields = ['messageId', 'userId', 'interactionId', 'commandName', 'guildId', 'channelId'];
        const sortedEntries = contextEntries.sort((a, b) => {
            const aIndex = priorityFields.indexOf(a[0]);
            const bIndex = priorityFields.indexOf(b[0]);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });

        const contextStr = sortedEntries
            .map(([key, value]) => `${key}=${value}`)
            .join(' ');

        console.log(
            `${color}[${timestamp}] [${level}] [${category}]${reset} ` +
            `${bold}${eventName}${reset}: ${message}` +
            (contextStr ? ` | ${contextStr}` : '')
        );
    }

    /**
     * Convenience methods for different log levels
     */
    async debug(eventName, message, options = {}) {
        return this.log({ level: 'DEBUG', eventName, message, ...options });
    }

    async info(eventName, message, options = {}) {
        return this.log({ level: 'INFO', eventName, message, ...options });
    }

    async warn(eventName, message, options = {}) {
        return this.log({ level: 'WARN', eventName, message, ...options });
    }

    async error(eventName, message, error = null, options = {}) {
        return this.log({ level: 'ERROR', eventName, message, error, ...options });
    }

    async fatal(eventName, message, error = null, options = {}) {
        return this.log({ level: 'FATAL', eventName, message, error, ...options });
    }

    /**
     * Log command execution with performance tracking
     */
    async logCommand({
        commandName,
        interaction,
        executionTimeMs,
        success = true,
        error = null,
        responseData = null
    }) {
        const category = 'COMMAND';
        const level = success ? 'INFO' : 'ERROR';
        const eventName = `command.${commandName}`;
        const message = success 
            ? `Command /${commandName} executed successfully`
            : `Command /${commandName} failed`;

        const requestData = {
            options: interaction.options?.data || [],
            commandType: interaction.commandType,
            locale: interaction.locale
        };

        return this.log({
            category,
            level,
            eventName,
            eventType: 'interactionCreate',
            message,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            interactionId: interaction.id,
            commandName,
            executionTimeMs,
            error,
            requestData,
            responseData
        });
    }

    /**
     * Log Discord events
     */
    async logEvent({
        eventType,
        eventData,
        processingTimeMs = null,
        error = null
    }) {
        const level = error ? 'ERROR' : 'INFO';
        const eventName = `event.${eventType}`;
        const message = error 
            ? `Event ${eventType} processing failed`
            : `Event ${eventType} processed`;

        // Extract Discord context from event data
        const context = this.extractDiscordContext(eventType, eventData);

        return this.log({
            category: 'EVENT',
            level,
            eventName,
            eventType,
            message,
            executionTimeMs: processingTimeMs,
            error,
            details: { eventData: this.sanitizeEventData(eventData) },
            ...context
        });
    }

    /**
     * Log database operations
     */
    async logDatabase({
        operation,
        table,
        executionTimeMs,
        rowsAffected = null,
        error = null
    }) {
        const level = error ? 'ERROR' : 'INFO';
        const eventName = `db.${operation}`;
        const message = error 
            ? `Database ${operation} on ${table} failed`
            : `Database ${operation} on ${table} completed`;

        return this.log({
            category: 'DATABASE',
            level,
            eventName,
            message,
            executionTimeMs,
            error,
            details: { table, rowsAffected }
        });
    }

    /**
     * Log API calls
     */
    async logApiCall({
        apiName,
        endpoint,
        method = 'GET',
        statusCode = null,
        responseTimeMs = null,
        error = null
    }) {
        const level = error || (statusCode && statusCode >= 400) ? 'ERROR' : 'INFO';
        const eventName = `api.${apiName}`;
        const message = error 
            ? `API call to ${apiName} failed`
            : `API call to ${apiName} completed`;

        return this.log({
            category: 'API',
            level,
            eventName,
            message,
            executionTimeMs: responseTimeMs,
            error,
            details: { endpoint, method, statusCode }
        });
    }

    /**
     * Extract Discord context from event data
     */
    extractDiscordContext(eventType, eventData) {
        const context = {};

        if (eventData) {
            // Common properties
            if (eventData.guildId) context.guildId = eventData.guildId;
            if (eventData.channelId) context.channelId = eventData.channelId;
            if (eventData.messageId) context.messageId = eventData.messageId;
            if (eventData.id) context.messageId = eventData.id;

            // User context - extract from multiple possible locations
            if (eventData.userId) context.userId = eventData.userId;
            if (eventData.author?.id) context.userId = eventData.author.id;
            if (eventData.user?.id) context.userId = eventData.user.id;
            if (eventData.member?.user?.id) context.userId = eventData.member.user.id;

            // Interaction context
            if (eventData.interactionId) context.interactionId = eventData.interactionId;
            if (eventData.interaction?.id) context.interactionId = eventData.interaction.id;

            // Command context
            if (eventData.commandName) context.commandName = eventData.commandName;
            if (eventData.command?.name) context.commandName = eventData.command.name;
        }

        return context;
    }

    /**
     * Sanitize event data for logging (remove sensitive information)
     */
    sanitizeEventData(data) {
        if (!data || typeof data !== 'object') return data;

        const sanitized = { ...data };
        
        // Remove sensitive fields
        delete sanitized.token;
        delete sanitized.password;
        delete sanitized.secret;
        
        // Limit content length
        if (sanitized.content && typeof sanitized.content === 'string') {
            sanitized.content = sanitized.content.substring(0, 500);
        }

        return sanitized;
    }

    /**
     * Get recent logs for analysis
     */
    async getRecentLogs(hours = 24, level = null, category = null) {
        let query = sql`
            SELECT 
                el.id, el.created_at, ec.name as category, ll.name as level,
                el.event_name, el.event_type, el.guild_id, el.user_id,
                el.command_name, el.message, el.execution_time_ms,
                el.error_message
            FROM event_logs el
            JOIN event_categories ec ON el.category_id = ec.id
            JOIN log_levels ll ON el.level_id = ll.id
            WHERE el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
        `;

        if (level) {
            query = sql`${query} AND ll.name = ${level}`;
        }
        if (category) {
            query = sql`${query} AND ec.name = ${category}`;
        }

        query = sql`${query} ORDER BY el.created_at DESC LIMIT 100`;

        return await query;
    }

    /**
     * Get error statistics
     */
    async getErrorStats(hours = 24) {
        return await sql`
            SELECT 
                ec.name as category,
                el.event_type,
                COUNT(*) as error_count,
                COUNT(DISTINCT el.guild_id) as affected_guilds,
                COUNT(DISTINCT el.user_id) as affected_users,
                AVG(el.execution_time_ms) as avg_execution_time
            FROM event_logs el
            JOIN event_categories ec ON el.category_id = ec.id
            JOIN log_levels ll ON el.level_id = ll.id
            WHERE ll.name IN ('ERROR', 'FATAL')
            AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
            GROUP BY ec.name, el.event_type
            ORDER BY error_count DESC
        `;
    }
}

// Create and export singleton instance
const logger = new EventLogger();

export default logger;
export { EventLogger };
