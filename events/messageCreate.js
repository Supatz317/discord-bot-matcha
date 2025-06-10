const { getChannel, setCache, getCache } = require('../database/db.js');
const { sql } = require('../database/db');

const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');


dotenv.config(); 

const attendance = [process.env.ATTENDANCE_TRAINEE_CHANNEL_ID, process.env.ATTENDANCE_EMPLOYEE_CHANNEL_ID, process.env.ATTENDANCE_DEMO];


function channelExists(list, channelId) {
    return list.some(c => c.channel_id === channelId);
}




async function sendToN8n(data) {
  try {
    const response = await axios.post(process.env.N8N_WEBHOOK, data, { timeout: 5000 });
    console.log(`Successfully sent message ${data.id} to n8n`);
    return true;
  } catch (error) {
    console.log(`Failed to send to n8n: ${error.message}`); 
    return false;
  }
}


module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let messageData = {};
        // Load channel list from database
        const channelList = await getCache('channels') ;
        // console.log(`2.Loaded ${channelList.length} registered channels from database.`);
        
        if (!channelList || channelList.length === 0) {
            console.log('channelList is empty or not loaded.');
            const channels = getChannel(); // or await queryChannel() if that's your function
            setCache('channels', channels);
            return;
        }

        if (message.author.bot) return;

        // if the message is from a DM, ignore it
        if (!message.guild) return;
        
        if (attendance.includes(message.channel.id)) {
            console.log(`[attendance] Processing message from ${message.author.username}: ${message.content.substring(0, 50)}...`);
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
            console.log(`[MESSAGE] Processing message from ${message.author.username}: ${message.content.substring(0, 50)}...`);
    
            // Prepare data for n8n
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

        } else if (!channelExists(channelList, message.channel.id)) {
            // console.log(`Channel [${message.channel.name}] is not registered. Skipping message processing.`);
            return;
        } 




        // Send to n8n
        if (!await sendToN8n(messageData)) { 
            console.log(`[] Failed to process message ${message.id}`);
        }


    }
};