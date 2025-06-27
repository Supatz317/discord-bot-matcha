import { Events } from 'discord.js';
import { setCache, getChannel, getRegisteredChannels } from '../database/db.js';
import cron from 'node-cron';
import { getStandupInfo } from '../services/standup.js';
import { performance } from 'perf_hooks';
import logger from '../utils/logger.js';

export const name = Events.ClientReady;
export const once = true;
export async function execute(client) {
    try {
        // Log bot ready event
        await logger.logEvent({
            eventType: 'ready',
            eventData: {
                botTag: client.user.tag,
                botId: client.user.id,
                guildCount: client.guilds.cache.size,
                userCount: client.users.cache.size
            }
        });

        console.log(`Ready! Logged in as ${client.user.tag}`);

        const channels = getChannel();
        setCache('channels', channels);
        console.log('Channel list cached on startup.');

        // Set up cron job
        cron.schedule('30 9 * * 1-5', async () => {
            try {
                const channelRows = await getRegisteredChannels();
                const channel_list = channelRows.map(c => c.channel_id);
                
                for (const channelId of channel_list) {
                    try {
                        const channel = await client.channels.fetch(channelId);
                        if (channel && channel.isTextBased()) {
                            await getStandupInfo(channel);
                        } else {
                            console.error(`Could not find a text channel with ID: ${channelId} or it's not a text channel.`);
                        }
                    } catch (error) {
                        console.error(`Error fetching or sending message to channel ${channelId}:`, error);
                    }
                }
            } catch (error) {
                console.error('Error fetching registered channels:', error);
            }
        }, {
            timezone: 'Asia/Bangkok'
        });

    } catch (error) {
        // Log initialization error
        await logger.error('bot.ready_failed', 'Bot initialization failed', error, {
            category: 'SYSTEM'
        });
        throw error;
    }
}