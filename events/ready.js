import { Events } from 'discord.js';
import { setCache, getChannel, getCache, getRegisteredChannels } from '../database/db.js';
import cron from 'node-cron';
import { getStandupInfo } from '../services/standup.js';

const channel_list = getRegisteredChannels();
// console.log(`1.Loaded ${channel_list.length} registered channels from database.`);

export const name = Events.ClientReady;
export const once = true;
export function execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    const channels = getChannel(); // or await queryChannel() if that's your function
    setCache('channels', channels);
    console.log('Channel list cached on startup.');

    cron.schedule('30 9 * * *', async () => {
        for (const channelId of channel_list) {
            try {
                // Fetch the target channel
                const channel = await client.channels.fetch(channelId);

                // Check if the channel exists and is a text-based channel where messages can be sent
                if (channel && channel.isTextBased()) {
                    // Call the dedicated function that contains the /team command's logic
                    await getStandupInfo(channel);
                } else {
                    console.error(`Could not find a text channel with ID: ${channelId} or it's not a text channel.`);
                }
            } catch (error) {
                console.error(`Error fetching or sending message to channel ${channelId}:`, error);
            }
        }
    }, {
        timezone: 'Asia/Bangkok' // Example: Set to Bangkok timezone (GMT+7)
    });

}