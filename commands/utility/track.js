import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();



export const data = new SlashCommandBuilder()
    .setName('track')
    .setDescription('เพิ่มการติดตาม Stand-up Message')
    .addStringOption(option =>
        option.setName('message_id')
            .setDescription('ID ของ Stand-up Message ที่ต้องการติดตาม โดยคลิกขวาที่ข้อความแล้วเลือก "Copy Message ID"')
            .setRequired(true)
    );
export async function execute(interaction) {
    const messageId = interaction.options.getString('message_id');

    // payload format
    const payload = {
        service: 'track',
        data: {
            id: messageId,
            channel_id: interaction.channel.id,
            guild_id: interaction.guild.id,
            author_id: interaction.user.id,
            author_name: interaction.user.username
        }
    };

    // send message_id to n8n
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        // Send the data to n8n
        const response = await fetch(process.env.N8N_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // await interaction.editReply('Data successfully sent to n8n!');
            await interaction.editReply({
                content: `✅ successfully track Stand-up Message`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            console.error('Failed to send data to n8n:', response.statusText);
            await interaction.editReply({
                content: '[register] Failed to send data to n8n.',
                flags: MessageFlags.Ephemeral 
            });
        }

    } catch (error) {
        console.error('Error:', error);
        await interaction.editReply({
            content: `There was an error processing your request. ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }


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