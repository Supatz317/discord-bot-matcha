const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (oldMessage.author.bot) return;

    // Check if content has actually changed
    if (oldMessage.content === newMessage.content) return;

    // console.log(`Message edited in #${oldMessage.channel.name}`);
    // console.log(`Old: ${oldMessage.content}`);
    // console.log(`New: ${newMessage.content}`);
        
        console.log(`[Message Update] : ${newMessage.content} | ${oldMessage.content}`);
        const payload = {
            service: 'messageUpdate',
            timestamp: new Date().toISOString(),
            // data: {
                id: newMessage.id,
                content: newMessage.content,
                channel_id: newMessage.channel.id,
                guild_id: newMessage.guild.id,
                author_id: newMessage.author.id,

            // }

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
        
        // Send to n8n
        if (!await sendToN8n(payload)) { 
            console.log(`[] Failed to process message `);
        }
    }
}




async function sendToN8n(payload) {
    try {
      const response = await axios.post(process.env.N8N_WEBHOOK, payload, { timeout: 5000 });
      console.log(`Successfully sent message ${payload.id} to n8n`);
      return true;
    } catch (error) {
      console.log(`Failed to send to n8n: ${error}`); 
      return false;
    }
  }