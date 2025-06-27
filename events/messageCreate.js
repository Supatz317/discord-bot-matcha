const { getChannel, setCache, getCache } = require('../database/db.js');
const { sql } = require('../database/db');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');

// Import the logger (convert to require since this file uses CommonJS)
const logger = require('../utils/logger.js').default;

dotenv.config();

const attendance = [process.env.ATTENDANCE_TRAINEE_CHANNEL_ID, process.env.ATTENDANCE_EMPLOYEE_CHANNEL_ID, process.env.ATTENDANCE_DEMO];


function channelExists(list, channelId) {
    return list.some(c => c.channel_id === channelId);
}




async function sendToN8n(data) {
    try {
        const response = await axios.post(process.env.N8N_WEBHOOK, data, { timeout: 5000 });
        // console.log(`Successfully sent message ${data.id} to n8n`);
        return true;
    } catch (error) {
        // console.log(`Failed to send to n8n: ${error.message}`);
        return false;
    }
}


module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const startTime = performance.now();
        let messageData = {};

        try {
            // Log only the core message creation event
            await logger.logEvent({
                eventType: 'messageCreate',
                eventData: {
                    messageId: message.id,
                    guildId: message.guild?.id,
                    channelId: message.channel.id,
                    userId: message.author.id,
                    username: message.author.username,
                    bot: message.author.bot,
                    contentLength: message.content.length,
                    hasAttachments: message.attachments.size > 0
                }
            });

            // Load channel list from database
            const channelList = await getCache('channels');

            if (!channelList || channelList.length === 0) {
                const channels = getChannel();
                setCache('channels', channels);
                return;
            }

            // if the message is from a DM, ignore it
            if (!message.guild) {
                return;
            }

            // leave message | attendance message
            if (attendance.includes(message.channel.id)) {
                console.log(`[${new Date().toISOString()}] [ATTENDANCE] ${message.author.username}-${message.author.id}: ${message.content.substring(0, 50)}...`);
            
            // Prepare data for n8n 
            messageData = {
                service: 'attendance',
                id: message.id,
                author: {
                    id: message.author.id,
                    username: message.author.username,
                    global_name: message.author.globalName,
                    server_name: message.author.displayName,
                    discriminator: message.author.discriminator,
                    bot: message.author.bot,
                    avatar: message.author.avatarURL() || null
                },
                channel: {
                    id: message.channel.id,
                    name: message.channel.name,
                    category: message.channel.parent?.name || null
                },
                content: message.content,
                timestamp: message.createdAt.toISOString(),

            }
        }
        else if (channelExists(channelList, message.channel.id)) {
            // console.log(`[MESSAGE] Processing message from ${message.author.username}: ${message.content.substring(0, 50)}...`);
            
            if (message.author.bot) {
                if (message.author.id != '1365964985871630447') { // ignore matcha bot
                    // regex match author id by <@123456789012345678>
                    const author_id = message.content.match(/<@!?(\d+)>/);
                    console.log(`[${new Date().toISOString()}] [MESSAGE-CREATE] ${message.author.username}-${author_id}: ${message.content.substring(0, 50).replaceAll('\n', '')}...`);

                    messageData = {
                        service: 'botMessage',
                        id: message.id,
                        author: {
                            id: author_id
                        },
                        channel: {
                            id: message.channel.id,
                            name: message.channel.name,
                            category: message.channel.parent?.name || null
                        },
                        content: message.content,
                        timestamp: message.createdAt.toISOString(),
                    }
                }
            }
            // Prepare data for n8n
            else {
            console.log(`[${new Date().toISOString()}] [MESSAGE-CREATE] ${message.author.username}-${message.author.id}: ${message.content.substring(0, 50).replaceAll('\n', '')}...`);
                messageData = {
                service: 'messageCreate',
                id: message.id,
                content: message.content,
                author: {
                    id: message.author.id,
                    username: message.author.username,
                    global_name: message.author.globalName,
                    server_name: message.author.displayName,
                    discriminator: message.author.discriminator,
                    bot: message.author.bot,
                    avatar: message.author.avatarURL() || null
                },
                channel: {
                    id: message.channel.id,
                    name: message.channel.name,
                    category: message.channel.parent?.name || null
                },
                guild: message.guild ? {
                    id: message.guild.id,
                    name: message.guild.name
                } : null,
                // timestamp only date part
                timestamp: message.createdAt.toISOString(),
                edited: message.editedAt ? message.editedAt : null,
                attachments: message.attachments.map(a => ({
                    filename: a.name,
                    url: a.url,
                    size: a.size
                })),
                embeds: message.embeds.length > 0,
                mention_count: message.mentions.users.size,
                reference: message.reference ? {
                    message_id: message.reference.messageId,
                    channel_id: message.reference.channelId,
                    guild_id: message.reference.guildId
                } : null
            };
            }
            

        } else if (!channelExists(channelList, message.channel.id)) {
            return;
        }

        // Send to n8n
        if (Object.keys(messageData).length > 0) {
            await sendToN8n(messageData);
        }

    } catch (error) {
        // Log any errors during message processing
        await logger.error('message.processing_failed', 'Message processing failed', error, {
            category: 'EVENT',
            guildId: message.guild?.id,
            channelId: message.channel.id,
            userId: message.author.id,
            details: { messageId: message.id }
        });
    }
}
};