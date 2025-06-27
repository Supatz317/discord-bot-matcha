-- Event Logs Database Schema for Discord Bot
-- This schema captures comprehensive event logging for Discord bot activities

-- 1. Event Categories Table
CREATE TABLE IF NOT EXISTS event_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code for UI display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO event_categories (name, description, color) VALUES
('COMMAND', 'Slash command executions', '#3498db'),
('EVENT', 'Discord.js client events', '#2ecc71'),
('ERROR', 'Error events and exceptions', '#e74c3c'),
('USER_ACTION', 'User interactions and activities', '#f39c12'),
('SYSTEM', 'Bot system events and lifecycle', '#9b59b6'),
('DATABASE', 'Database operations and queries', '#1abc9c'),
('API', 'External API calls and webhooks', '#34495e'),
('MODERATION', 'Moderation actions and auto-moderation', '#e67e22')
ON CONFLICT (name) DO NOTHING;

-- 2. Log Levels Table
CREATE TABLE IF NOT EXISTS log_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    severity INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert log levels (ordered by severity: 0=DEBUG, 100=FATAL)
INSERT INTO log_levels (name, severity, description) VALUES
('DEBUG', 0, 'Detailed information for debugging'),
('INFO', 20, 'General information about bot operations'),
('WARN', 30, 'Warning conditions that should be monitored'),
('ERROR', 40, 'Error conditions that affect functionality'),
('FATAL', 50, 'Critical errors that may cause bot shutdown')
ON CONFLICT (name) DO NOTHING;

-- 3. Main Event Logs Table
CREATE TABLE IF NOT EXISTS event_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Event Classification
    category_id INTEGER REFERENCES event_categories(id),
    level_id INTEGER REFERENCES log_levels(id),
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50), -- e.g., 'interactionCreate', 'messageCreate', 'guildMemberAdd'
    
    -- Discord Context
    guild_id VARCHAR(20), -- Discord Guild/Server ID
    channel_id VARCHAR(20), -- Discord Channel ID
    user_id VARCHAR(20), -- Discord User ID who triggered the event
    message_id VARCHAR(20), -- Related Discord Message ID
    interaction_id VARCHAR(100), -- Discord Interaction ID for commands
    
    -- Event Details
    command_name VARCHAR(100), -- For command events
    message TEXT, -- Human-readable log message
    details JSONB, -- Additional structured data
    
    -- Error Information (for error events)
    error_message TEXT,
    error_stack TEXT,
    error_code VARCHAR(50),
    
    -- Performance & Context
    execution_time_ms INTEGER, -- How long the operation took
    memory_usage_mb NUMERIC(10,2), -- Memory usage at time of log
    cpu_usage_percent NUMERIC(5,2), -- CPU usage percentage
    
    -- Request/Response Data
    request_data JSONB, -- Input data (command options, message content, etc.)
    response_data JSONB, -- Output data (bot responses, API responses, etc.)
    
    -- Metadata
    session_id VARCHAR(100), -- Bot session identifier
    correlation_id VARCHAR(100), -- For tracking related events
    user_agent TEXT, -- If applicable for API calls
    ip_address INET, -- If applicable
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE -- When the event was processed
);

-- 4. Event Performance Metrics Table
CREATE TABLE IF NOT EXISTS event_metrics (
    id BIGSERIAL PRIMARY KEY,
    event_log_id BIGINT REFERENCES event_logs(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Resource Usage
    memory_before_mb NUMERIC(10,2),
    memory_after_mb NUMERIC(10,2),
    memory_peak_mb NUMERIC(10,2),
    
    -- Database Metrics
    db_queries_count INTEGER DEFAULT 0,
    db_query_time_ms INTEGER DEFAULT 0,
    
    -- API Metrics
    api_calls_count INTEGER DEFAULT 0,
    api_response_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Event Context Table (for storing additional context)
CREATE TABLE IF NOT EXISTS event_context (
    id BIGSERIAL PRIMARY KEY,
    event_log_id BIGINT REFERENCES event_logs(id) ON DELETE CASCADE,
    
    context_key VARCHAR(100) NOT NULL,
    context_value TEXT,
    context_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Event Aggregations Table (for analytics)
CREATE TABLE IF NOT EXISTS event_aggregations (
    id BIGSERIAL PRIMARY KEY,
    
    -- Aggregation Period
    period_type VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week', 'month'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Aggregation Dimensions
    category_id INTEGER REFERENCES event_categories(id),
    level_id INTEGER REFERENCES log_levels(id),
    guild_id VARCHAR(20),
    
    -- Aggregated Metrics
    event_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    unique_users_count INTEGER DEFAULT 0,
    avg_execution_time_ms NUMERIC(10,2),
    max_execution_time_ms INTEGER,
    total_execution_time_ms BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique aggregations per period
    UNIQUE(period_type, period_start, category_id, level_id, guild_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_guild_id ON event_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_category_level ON event_logs(category_id, level_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_command_name ON event_logs(command_name);
CREATE INDEX IF NOT EXISTS idx_event_logs_correlation_id ON event_logs(correlation_id);

-- Indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_event_logs_details_gin ON event_logs USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_event_logs_request_data_gin ON event_logs USING GIN (request_data);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_logs_guild_created ON event_logs(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_created ON event_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_category_created ON event_logs(category_id, created_at);

-- Partial indexes for errors
CREATE INDEX IF NOT EXISTS idx_event_logs_errors ON event_logs(created_at) 
WHERE error_message IS NOT NULL;

-- Function to clean old logs (optional)
CREATE OR REPLACE FUNCTION clean_old_event_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM event_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep
    AND level_id = (SELECT id FROM log_levels WHERE name = 'DEBUG');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW v_recent_events AS
SELECT 
    el.id,
    el.created_at,
    ec.name as category,
    ll.name as level,
    el.event_name,
    el.event_type,
    el.guild_id,
    el.user_id,
    el.command_name,
    el.message,
    el.execution_time_ms,
    CASE WHEN el.error_message IS NOT NULL THEN true ELSE false END as has_error
FROM event_logs el
JOIN event_categories ec ON el.category_id = ec.id
JOIN log_levels ll ON el.level_id = ll.id
WHERE el.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY el.created_at DESC;

CREATE OR REPLACE VIEW v_error_summary AS
SELECT 
    DATE_TRUNC('hour', el.created_at) as hour,
    ec.name as category,
    el.event_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT el.guild_id) as affected_guilds,
    COUNT(DISTINCT el.user_id) as affected_users
FROM event_logs el
JOIN event_categories ec ON el.category_id = ec.id
JOIN log_levels ll ON el.level_id = ll.id
WHERE ll.name IN ('ERROR', 'FATAL')
AND el.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', el.created_at), ec.name, el.event_type
ORDER BY hour DESC, error_count DESC;

-- Comments for documentation
COMMENT ON TABLE event_logs IS 'Main table for storing all Discord bot event logs with comprehensive context and metadata';
COMMENT ON TABLE event_categories IS 'Categories for organizing different types of events (commands, errors, user actions, etc.)';
COMMENT ON TABLE log_levels IS 'Log severity levels (DEBUG, INFO, WARN, ERROR, FATAL)';
COMMENT ON TABLE event_metrics IS 'Performance metrics and resource usage for events';
COMMENT ON TABLE event_context IS 'Additional context data for events in key-value format';
COMMENT ON TABLE event_aggregations IS 'Pre-computed aggregations for analytics and reporting';
