import { sql, getAllMembers, getTeamInfo, getLeavePerson, getUpdateMessage, getDatetimeNow } from '../database/db.js';
import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';


export async function getStandupInfo(channel) {
    const channelId = channel.id;


    const leaveType = {
        'sick_leave' : 'ลาป่วย',
        'personal_leave' : 'ลากิจ',
        'annual_leave' : 'ลาพักร้อน'
    }


    const update = await getUpdateMessage(channelId);

    const leave = await getLeavePerson(channelId);
    const leaveMentions = leave.map(member => `- <@${member.author_id}>  ${member.content.replace(/<@\d+>/g, "")}`).join('\n');

    const members = await getAllMembers(channelId);
    // let memberMentions = members.map(member => `- <@${member.author_id}>`).join('\n');
    // Split members into batches of 15
    function splitIntoBatches(arr, batchSize) {
        const batches = [];
        for (let i = 0; i < arr.length; i += batchSize) {
            batches.push(arr.slice(i, i + batchSize));
        }
        return batches;
    }

    const memberBatches = splitIntoBatches(members, 25);
    const memberMentionsBatches = memberBatches.map(batch =>
        batch.map(member => {
            if (update.some(u => u.author_id === member.author_id)) {
                return `- <@${member.author_id}> ✅`;
            } 
            else if (leave.some(l => l.author_id === member.author_id)) {
                return `- <@${member.author_id}> ${leaveType[leave.find(l => l.author_id === member.author_id).leave_type.replace(/<@\\d+>/g, "")]}`;
            } 
            else {
                return `- <@${member.author_id}> ❌`;
            }
        }).join('\n')
    );

    // console.log('Member Mentions Batches:', memberMentionsBatches);

    const teamInfo = await getTeamInfo(channelId);
    const teamName = teamInfo[0].team_name || 'Unknown Team';
    const teamDescription = teamInfo[0].description || 'No description provided';

    const memberMentions = []
    for (const batch of memberMentionsBatches) {
        // console.log('Batch:', batch);
        memberMentions.push({
            name: 'สมาชิกทีม',
            value: batch,
            inline: true
        })
    }


    const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`รายละเอียดทีม 📋 <#${channelId}> ประจำวันที่ ${getDatetimeNow()}`)
    
        .setFields([
            // {
            //     name: 'ชื่อทีม',
            //     value: `> ${teamName}`,
            //     inline: false
            // },
            // add member mentions in batches
            ...memberMentions,
            {
                name: 'สถานะการลาวันนี้',
                value: leaveMentions || 'ไม่มีสมาชิกที่ลาในวันนี้',
                inline: false
            }
        ])
        .setTimestamp() // Adds a timestamp at the bottom of the embed
        .setFooter({ text: 'Automated by Matcha bot & N8N' }); // Adds a footer

    // create a button for delete message
    const deleteButton = new ButtonBuilder()
        .setCustomId('delete_message')
        .setLabel('ลบข้อความ')
        .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder()
        .addComponents(deleteButton);

    // if hidden is true, set the flags to ephemeral
    // if (hidden) {
    //     // embed.setFooter({ text: 'This message is hidden.' });
    //     await channel.send({ 
    //         embeds: [embed],
    //         components: [row], 
    //         flags: MessageFlags.Ephemeral 
    //     });
    //     return;
    // }
    await channel.send({ 
        embeds: [embed],
        components: [row], 
        flags: MessageFlags.Ephemeral 
    });
}

// export 