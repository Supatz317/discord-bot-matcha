import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getLeaveMessage } from '../../database/db.js';

export const data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('เช็คสถานะการลา')
    .addBooleanOption(option =>
        option.setName('hidden')
            .setDescription('ต้องการซ่อนข้อความนี้หรือไม่')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('date')
            .setDescription('วันที่ต้องการดูข้อมูลทีม (YYYY-MM-DD)')
            .setRequired(false)
    )
export async function execute(interaction) {
    const hidden = interaction.options.getBoolean('hidden');
    const date = interaction.options.getString('date');

    const leaveMessages = await getLeaveMessage(date);

    const leaveType = {
        'sick_leave': 'ลาป่วย',
        'personal_leave': 'ลากิจ',
        'annual_leave': 'ลาพักร้อน'
    }

    const partial = {
        'morning': 'ครึ่งเช้า',
        'afternoon': 'ครึ่งบ่าย'
    }

    const uniqueChannel = new Map();
    // group message by team
    for (const m of leaveMessages) {
        const channelId = m.team_name;
        const messageLeaveType = m.leave_type;
        var messagePartial = partial[m.partial_leave];
        if (messagePartial == undefined) {
            messagePartial = '';
        }

        const content = `- <@${m.author_id}> : ${leaveType[messageLeaveType]} ${messagePartial}\n`
        if (!uniqueChannel.has(m.team_name)) {
            uniqueChannel.set(channelId, content);
        } else {
            // Concatenate the new content to the existing content
            uniqueChannel.set(channelId, uniqueChannel.get(channelId) + " " + content);
        }
    }

    const groupedData = Array.from(uniqueChannel.entries()).map(([channel_id, content]) => ({
        channel_id,
        content: content.trim() // Trim any extra whitespace
    }));


    // Process and format the leave messages as needed
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📢แจ้งเตือน: พนักงานลาประจำวันที่ ${date}`)
        .addFields(
            ...groupedData.map(item => ({
                name: item.channel_id.endsWith("trainee") ?  "👶 " + item.channel_id : "🏢 "+item.channel_id,
                value: item.content,
                inline: false
            }))
        );

    await interaction.reply({ embeds: [embed], ephemeral: hidden });
}