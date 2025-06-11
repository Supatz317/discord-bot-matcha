// import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { getGuide } from '../../services/guide.js';

export const data = new SlashCommandBuilder()
    .setName('guide')
    .setDescription('แสดงคำแนะนำการใช้งาน Stand-up Message');
export async function execute(interaction) {
    const guideMessage = getGuide();

    const standupGuideEmbed = new EmbedBuilder()
                .setColor(0x34A853) // A different color for the guide (e.g., green for helpful info)
                .setTitle('Stand-up Message Guide 📝')
                .setDescription('ส่ง Stand-up ประจำวันของคุณได้ง่าย ๆ แค่ทำตามแพทเทิร์นนี้เลย! แต่ละ Task ขึ้นบรรทัดใหม่ แล้วใส่ขีด `-` นำหน้าด้วยนะ!')
                .addFields(
                    { name: 'Pattern:', value: '`dd/mm/yyyy`\n`- Your Task 1`\n`- Your Task 2`\n`- Your Task 3`', inline: true },
                    { name: 'Example:', value: '`12/06/2025`\n`- Refactored authentication module`\n`- Began testing API endpoints`\n`- Prepared presentation slides`', inline: true },
                )
                .setFooter({ text: 'โปรดเน้นความชัดเจนของข้อมูล' });
    
    
        const deleteButton = new ButtonBuilder()
                .setCustomId('delete_message')
                .setLabel('ลบข้อความ')
                .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder()
                .addComponents(deleteButton);

    await interaction.reply({ 
            embeds: [standupGuideEmbed],
            components: [row], 
            // flags: MessageFlags.Ephemeral 
    });
}