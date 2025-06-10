import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { sql } from '../../database/db.js';

export const data = new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a member to your team!')
    .addUserOption(option => option.setName('user')
        .setDescription('The user to add to your team')
        .setRequired(true)
    );

export async function execute(interaction) {
    const user = interaction.options.getUser('user');

    const channel = interaction.channel;
    const channelId = channel.id;

    // Check if the user is already a member of the team
    const existingMember = await sql`SELECT * FROM member_team WHERE author_id = ${user.id} AND channel_id = ${channelId}`;
    
    if (existingMember.length > 0) {
        return await interaction.reply({ content: `${user.username} is already a member of this team!`, flags: MessageFlags.Ephemeral });
    }

    // // Add the user to the team
    await sql`INSERT INTO member_team (author_id, channel_id) VALUES (${user.id}, ${channelId})`.then(() => {
        console.log(`User ${user.username} added to team in channel ${channelId}`);
    }).catch(err => {
        console.error(`Error adding user ${user.username} to team:`, err);
        return interaction.reply({ content: `❌ Failed to add **${user.username}** to your team. Please try again later.`, flags: MessageFlags.Ephemeral });
    });

    await interaction.reply({ content: `✅ **${user.username}** has been added to your team!`, flags: MessageFlags.Ephemeral });

}