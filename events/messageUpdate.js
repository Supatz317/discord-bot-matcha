const { Client, GatewayIntentBits, Events } = require('discord.js');


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
            data: {
                id: newMessage.id,
                content: newMessage.content,
                channelId: newMessage.channel.id,
                guildId: newMessage.guild.id,
                authorId: newMessage.author.id,
            }
        }
        
        // Send to n8n
        if (!await sendToN8n(payload)) { 
            logger.warn(`[] Failed to process message ${message.id}`);
        }
    }
}




async function sendToN8n(data) {
    try {
      const response = await axios.post(process.env.N8N_WEBHOOK, data, { timeout: 5000 });
      logger.info(`Successfully sent message ${data.id} to n8n`);
      return true;
    } catch (error) {
      logger.error(`Failed to send to n8n: ${error.message}`); 
      return false;
    }
  }