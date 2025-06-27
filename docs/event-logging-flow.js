/**
 * EVENT LOGGING FLOW DEMONSTRATION
 * 
 * This document explains how Discord events are automatically stored in the database
 * when they are triggered in your bot.
 */

// ====================================================================
// 1. EVENT TRIGGER FLOW
// ====================================================================

/*
When a Discord event occurs (like a message being sent), here's what happens:

1. Discord.js client receives the event
2. Your event handler (in /events/) processes it
3. The logger automatically stores event data to database
4. Analytics can then query this data for insights

FLOW DIAGRAM:
Discord API → Discord.js Client → Event Handler → Logger → PostgreSQL Database
*/

// ====================================================================
// 2. DATABASE STORAGE STRUCTURE
// ====================================================================

/*
When an event is logged, it creates a record in the `event_logs` table:

┌─────────────────┬─────────────────┬──────────────────────────────────┐
│ Field           │ Example Value   │ Description                      │
├─────────────────┼─────────────────┼──────────────────────────────────┤
│ id              │ 12345          │ Unique log entry ID              │
│ category_id     │ 2              │ EVENT (from event_categories)    │
│ level_id        │ 2              │ INFO (from log_levels)           │
│ event_name      │ "event.messageCreate" │ Structured event name    │
│ event_type      │ "messageCreate" │ Discord.js event type           │
│ guild_id        │ "123456789"    │ Discord server ID                │
│ channel_id      │ "987654321"    │ Discord channel ID               │
│ user_id         │ "456789123"    │ Discord user ID                  │
│ message         │ "Message processing completed" │ Human readable  │
│ details         │ {"contentLength": 50} │ JSON with extra data    │
│ execution_time_ms│ 15            │ How long it took to process      │
│ memory_usage_mb │ 45.2          │ Memory usage at time of event    │
│ created_at      │ 2025-06-27... │ When the event occurred          │
│ correlation_id  │ "uuid-string" │ Links related events together    │
└─────────────────┴─────────────────┴──────────────────────────────────┘
*/

// ====================================================================
// 3. PRACTICAL EXAMPLES
// ====================================================================

// Example 1: When a user sends a message
// This happens automatically when messageCreate event fires:

import logger from '../utils/logger.js';

async function onMessageCreate(message) {
    // This gets stored in database automatically:
    await logger.logEvent({
        eventType: 'messageCreate',
        eventData: {
            guildId: message.guild?.id,        // → guild_id column
            channelId: message.channel.id,     // → channel_id column
            author: {
                id: message.author.id,         // → user_id column
                username: message.author.username,
                bot: message.author.bot
            },
            contentLength: message.content.length,
            hasAttachments: message.attachments.size > 0
        }
        // → All this gets stored as JSON in details column
    });
}

// Example 2: When a command is executed
// This happens automatically in interactionCreate event:

async function onSlashCommand(interaction) {
    // This gets stored in database automatically:
    await logger.logCommand({
        commandName: interaction.commandName,  // → command_name column
        interaction,                          // → extracts guild_id, user_id, etc.
        executionTimeMs: 234,                // → execution_time_ms column
        success: true,                       // → determines level (INFO vs ERROR)
        responseData: { success: true }      // → response_data column (JSON)
    });
}

// Example 3: When an error occurs
// This happens automatically when any error is caught:

async function onError(error, context) {
    // This gets stored in database automatically:
    await logger.error('system.error', 'An error occurred', error, {
        category: 'ERROR',
        guildId: context.guildId,           // → guild_id column
        userId: context.userId,             // → user_id column
        details: { operation: 'fetchUser' } // → details column (JSON)
        // error.message → error_message column
        // error.stack → error_stack column
    });
}

// ====================================================================
// 4. QUERYING THE DATA
// ====================================================================

// You can query the logged events using the analytics system:

import analytics from '../database/analytics.js';

// Get overview of last 24 hours
const overview = await analytics.getDashboardOverview(24);
/*
Returns:
{
  total_events: 1250,
  active_guilds: 5,
  active_users: 45,
  error_count: 3,
  command_executions: 890,
  avg_execution_time: 145.5,
  avg_memory_usage: 67.2
}
*/

// Get command statistics
const commandStats = await analytics.getCommandStats(24);
/*
Returns array:
[
  {
    command_name: "ping",
    execution_count: 234,
    error_count: 0,
    avg_execution_time: 45.2,
    unique_users: 12,
    unique_guilds: 3
  },
  // ... more commands
]
*/

// Get recent errors
const errors = await analytics.getErrorAnalysis(24);
/*
Returns array:
[
  {
    category: "COMMAND",
    event_type: "interactionCreate",
    command_name: "team",
    error_count: 3,
    affected_guilds: 2,
    error_message: "Database connection failed",
    last_occurrence: "2025-06-27T10:30:00Z"
  },
  // ... more errors
]
*/

// ====================================================================
// 5. AUTOMATIC STORAGE TRIGGERS
// ====================================================================

/*
Events are stored automatically in these scenarios:

1. BOT STARTUP (ready.js)
   ✓ Bot initialization
   ✓ Cache loading
   ✓ Cron job setup

2. COMMANDS (interactionCreate.js)
   ✓ Command execution start
   ✓ Command success/failure
   ✓ Performance metrics

3. MESSAGES (messageCreate.js)
   ✓ Message received
   ✓ Attendance processing
   ✓ API calls to N8N

4. ERRORS (all files)
   ✓ Database errors
   ✓ API failures
   ✓ Command exceptions

5. SYSTEM EVENTS
   ✓ Memory usage spikes
   ✓ Performance degradation
   ✓ Connection issues
*/

// ====================================================================
// 6. DATA RETENTION & CLEANUP
// ====================================================================

/*
The database includes automatic cleanup functions:

// Clean old DEBUG logs (keeps ERROR/WARN longer)
SELECT clean_old_event_logs(30); -- keeps last 30 days

// View aggregated data (for analytics)
SELECT * FROM event_aggregations 
WHERE period_type = 'day' 
AND period_start >= CURRENT_DATE - INTERVAL '7 days';

// Get recent critical events
SELECT * FROM v_recent_events 
WHERE level IN ('ERROR', 'FATAL')
ORDER BY created_at DESC;
*/

// ====================================================================
// 7. REAL-TIME MONITORING
// ====================================================================

/*
You can monitor events in real-time through:

1. CONSOLE OUTPUT (colored logs)
   [2025-06-27T10:30:15.123Z] [INFO] [COMMAND] command.ping: Command executed successfully | guildId=123 userId=456

2. DISCORD COMMANDS
   /logs overview - Quick stats
   /logs commands - Command usage
   /logs errors - Recent problems

3. ANALYTICS REPORTS
   bun run analytics - Terminal dashboard

4. DATABASE QUERIES
   SELECT * FROM v_recent_events WHERE created_at >= NOW() - INTERVAL '1 hour';
*/

export default {
    message: "This file explains how events are automatically stored in the database when triggered."
};
