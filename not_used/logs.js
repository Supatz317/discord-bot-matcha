import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import analytics from '../database/analytics.js';
import logger from '../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('logs')
    .setDescription('View bot event logs and analytics')
    .addSubcommand(subcommand =>
        subcommand
            .setName('overview')
            .setDescription('Get a quick overview of bot activity')
            .addIntegerOption(option =>
                option
                    .setName('hours')
                    .setDescription('Number of hours to look back (default: 24)')
                    .setMinValue(1)
                    .setMaxValue(168) // 1 week
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('commands')
            .setDescription('View command usage statistics')
            .addIntegerOption(option =>
                option
                    .setName('hours')
                    .setDescription('Number of hours to look back (default: 24)')
                    .setMinValue(1)
                    .setMaxValue(168)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('errors')
            .setDescription('View recent errors and issues')
            .addIntegerOption(option =>
                option
                    .setName('hours')
                    .setDescription('Number of hours to look back (default: 24)')
                    .setMinValue(1)
                    .setMaxValue(168)
                    .setRequired(false)
            )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const hours = interaction.options.getInteger('hours') ?? 24;

    await interaction.deferReply({ ephemeral: true });

    try {
        switch (subcommand) {
            case 'overview':
                await handleOverview(interaction, hours);
                break;
            case 'commands':
                await handleCommands(interaction, hours);
                break;
            case 'errors':
                await handleErrors(interaction, hours);
                break;
            default:
                await interaction.editReply('Unknown subcommand.');
        }
    } catch (error) {
        await logger.error('logs_command.execution_failed', `Failed to execute logs command: ${subcommand}`, error, {
            category: 'COMMAND',
            guildId: interaction.guildId,
            userId: interaction.user.id,
            commandName: 'logs',
            details: { subcommand, hours }
        });

        await interaction.editReply({
            content: '❌ An error occurred while retrieving log data. Please try again later.'
        });
    }
}

async function handleOverview(interaction, hours) {
    const overview = await analytics.getDashboardOverview(hours);
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 Bot Activity Overview (${hours}h)`)
        .setColor('#3498db')
        .setTimestamp()
        .addFields(
            {
                name: '📈 Activity',
                value: [
                    `**Total Events:** ${overview.total_events?.toLocaleString() || 0}`,
                    `**Active Guilds:** ${overview.active_guilds || 0}`,
                    `**Active Users:** ${overview.active_users || 0}`,
                    `**Commands:** ${overview.command_executions || 0}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⚡ Performance',
                value: [
                    `**Avg Response:** ${overview.avg_execution_time?.toFixed(1) || 0}ms`,
                    `**Max Response:** ${overview.max_execution_time || 0}ms`,
                    `**Avg Memory:** ${overview.avg_memory_usage?.toFixed(1) || 0}MB`,
                    `**Peak Memory:** ${overview.peak_memory_usage?.toFixed(1) || 0}MB`
                ].join('\n'),
                inline: true
            },
            {
                name: '🚨 Issues',
                value: [
                    `**Errors:** ${overview.error_count || 0}`,
                    `**Critical:** ${overview.fatal_count || 0}`,
                    `**Success Rate:** ${calculateSuccessRate(overview)}%`
                ].join('\n'),
                inline: true
            }
        );

    // Add health status indicator
    const healthColor = getHealthColor(overview);
    embed.setColor(healthColor);

    await interaction.editReply({ embeds: [embed] });
}

async function handleCommands(interaction, hours) {
    const commands = await analytics.getCommandStats(hours, 10);
    
    const embed = new EmbedBuilder()
        .setTitle(`🚀 Command Usage Statistics (${hours}h)`)
        .setColor('#2ecc71')
        .setTimestamp();

    if (commands.length === 0) {
        embed.setDescription('No command executions found in the specified time period.');
    } else {
        const commandList = commands.map((cmd, index) => {
            const successRate = ((cmd.execution_count - cmd.error_count) / cmd.execution_count * 100).toFixed(1);
            return [
                `**${index + 1}. /${cmd.command_name}**`,
                `Uses: ${cmd.execution_count} | Errors: ${cmd.error_count}`,
                `Success: ${successRate}% | Avg: ${cmd.avg_execution_time?.toFixed(1) || 0}ms`,
                `Users: ${cmd.unique_users} | Guilds: ${cmd.unique_guilds}`
            ].join('\n');
        }).join('\n\n');

        embed.setDescription(commandList);
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleErrors(interaction, hours) {
    const errors = await analytics.getErrorAnalysis(hours);
    
    const embed = new EmbedBuilder()
        .setTitle(`❌ Error Analysis (${hours}h)`)
        .setColor('#e74c3c')
        .setTimestamp();

    if (errors.length === 0) {
        embed.setDescription('✅ No errors found in the specified time period! 🎉');
        embed.setColor('#2ecc71');
    } else {
        const errorList = errors.slice(0, 8).map((err, index) => {
            const commandInfo = err.command_name ? ` (/${err.command_name})` : '';
            return [
                `**${index + 1}. ${err.category}${commandInfo}**`,
                `Count: ${err.error_count} | Guilds: ${err.affected_guilds} | Users: ${err.affected_users}`,
                `Error: \`${err.error_message?.substring(0, 100) || 'Unknown error'}${err.error_message?.length > 100 ? '...' : ''}\``,
                `Last: <t:${Math.floor(new Date(err.last_occurrence).getTime() / 1000)}:R>`
            ].join('\n');
        }).join('\n\n');

        embed.setDescription(errorList);
        
        if (errors.length > 8) {
            embed.setFooter({ text: `Showing top 8 of ${errors.length} error types` });
        }
    }

    await interaction.editReply({ embeds: [embed] });
}

function calculateSuccessRate(overview) {
    if (!overview.total_events || overview.total_events === 0) return 100;
    const errorRate = (overview.error_count + overview.fatal_count) / overview.total_events;
    return Math.max(0, (100 * (1 - errorRate)).toFixed(1));
}

function getHealthColor(overview) {
    const successRate = calculateSuccessRate(overview);
    if (successRate >= 95) return '#2ecc71'; // Green
    if (successRate >= 85) return '#f39c12'; // Yellow
    return '#e74c3c'; // Red
}
