import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { sql } from '../../database/db.js';

export const data = new SlashCommandBuilder()
    .setName('remove')
    .setDescription('remove a member from your team!')
    .addUserOption(option => option.setName('user')
        .setDescription('The user to remove to your team')
        .setRequired(true)
    );

export async function execute(interaction) {
    const user = interaction.options.getUser('user');

    const channel = interaction.channel;
    const channelId = channel.id;

    // Check if the user is already a member of the team
    const existingMember = await sql`SELECT * FROM member_team WHERE author_id = ${user.id} AND channel_id = ${channelId}`;
    
    if (existingMember.length === 0) {
        return await interaction.reply({ content: `${user.username} is not a member of this team!`, flags: MessageFlags.Ephemeral });
    }

    // Remove the user from the team
    await sql`DELETE FROM member_team WHERE author_id = ${user.id} AND channel_id = ${channelId}`.then(() => {
        console.log(`User ${user.username} removed from team in channel ${channelId}`);
        return interaction.reply({ content: `✅ **${user.username}** has been removed from your team!`, flags: MessageFlags.Ephemeral });
    }).catch(err => {
        console.error(`Error removing user ${user.username} from team:`, err);
        return interaction.reply({ content: `❌ Failed to remove **${user.username}** from your team. Please try again later.`, flags: MessageFlags.Ephemeral });
    });

}