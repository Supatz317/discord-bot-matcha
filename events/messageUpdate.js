const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');
const { getChannel, setCache, getCache } = require('../database/db.js');
const logger = require('../utils/logger.js').default;
dotenv.config();

const attendance = [process.env.ATTENDANCE_TRAINEE_CHANNEL_ID, process.env.ATTENDANCE_EMPLOYEE_CHANNEL_ID, process.env.ATTENDANCE_DEMO];

function channelExists(list, channelId) {
    return list.some(c => c.channel_id === channelId);
}

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        try {
            // Only log if it's not a bot and content actually changed
            if (oldMessage.author.bot) return;
            if (oldMessage.content === newMessage.content) return;

            // Log the core message update event
            await logger.logEvent({
                eventType: 'messageUpdate',
                eventData: {
                    messageId: newMessage.id,
                    guildId: newMessage.guild?.id,
                    channelId: newMessage.channel.id,
                    userId: newMessage.author.id,
                    username: newMessage.author.username,
                    oldContentLength: oldMessage.content.length,
                    newContentLength: newMessage.content.length,
                    hasAttachments: newMessage.attachments.size > 0
                }
            });

            const channelList = await getCache('channels');

            if (!channelList || channelList.length === 0) {
                const channels = getChannel();
                setCache('channels', channels);
                return;
            }

            if (!newMessage.guild) return;

            

            // standup 
            if (channelExists(channelList, newMessage.channel.id)) {
                // console.log(`[${new Date().toISOString()}] [MESSAGE-UPDATE] ${newMessage.author.username}-${newMessage.author.id}: ${newMessage.content.substring(0, 50)}...`);
                
                const payload = {
                    service: 'messageUpdate',
                    timestamp: new Date().toISOString(),
                    id: newMessage.id,
                    content: newMessage.content,
                    channel_id: newMessage.channel.id,
                    guild_id: newMessage.guild.id,
                    author_id: newMessage.author.id,
                    author: {
                        id: newMessage.author.id,
                        username: newMessage.author.username,
                        global_name: newMessage.author.globalName,
                        server_name: newMessage.author.displayName,
                        discriminator: newMessage.author.discriminator,
                        bot: newMessage.author.bot,
                        avatar: newMessage.author.avatarURL() || null
                    },
                    channel: {
                        id: newMessage.channel.id,
                        name: newMessage.channel.name,
                        category: newMessage.channel.parent?.name || null
                    }
                };

                // Send to n8n
                await sendToN8n(payload);
            }

            // leave message | attendance message
            if (attendance.includes(newMessage.channel.id)) {
            
                payload = {
                    service: 'attendance',
                    id: newMessage.id,
                    author: {
                        id: newMessage.author.id,
                        username: newMessage.author.username,
                        global_name: newMessage.author.globalName,
                        server_name: newMessage.author.displayName,
                        discriminator: newMessage.author.discriminator,
                        bot: newMessage.author.bot,
                        avatar: newMessage.author.avatarURL() || null
                    },
                    channel: {
                        id: newMessage.channel.id,
                        name: newMessage.channel.name,
                        category: newMessage.channel.parent?.name || null
                    },
                    content: newMessage.content,
                    timestamp: newMessage.createdAt.toISOString(),

                }

                await sendToN8n(payload);
            }

        } catch (error) {
            // Log any errors during message update processing
            await logger.error('messageUpdate.processing_failed', 'Message update processing failed', error, {
                category: 'EVENT',
                guildId: newMessage.guild?.id,
                channelId: newMessage.channel.id,
                userId: newMessage.author.id,
                details: { messageId: newMessage.id }
            });
        }
    }
};




async function sendToN8n(payload) {
    try {
        const response = await axios.post(process.env.N8N_WEBHOOK, payload, { timeout: 5000 });
        // console.log(`[${new Date().toISOString()}] [N8N-SUCCESS] Successfully sent message ${payload.id} to n8n`);
        return true;
    } catch (error) {
        // console.log(`[${new Date().toISOString()}] [N8N-ERROR] Failed to send to n8n: ${error}`);
        return false;
    }
}