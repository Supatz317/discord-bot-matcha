import { getChannel, setCache } from '../../database/db.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your team and choice in one command!')
    .addStringOption(option => option.setName('teamname')
        .setDescription('Your team name')
        .setRequired(true)
    )
    .addStringOption(option => option.setName('description')
        .setDescription('tell us about your team, for help us understand your team better')
        .setRequired(false)
    );
export async function execute(interaction) {
    const teamName = interaction.options.getString('teamname');
    const description = interaction.options.getString('description') || 'No description provided'; // Default if no description is given


    const channel = interaction.channel;
    const channelId = channel.id;

    const payload = {
        service: 'register',
        timestamp: new Date().toISOString(),
        data: {
            id: channelId,
            teamName: teamName,
            description: description,
            user: {
                id: interaction.user.id,
                username: interaction.user.username,
            },
            guild: {
                id: interaction.guild.id,
                name: interaction.guild.name
            }
        }
    };

    console.log(new Date().toISOString());
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        console.log("1");
        // Send the data to n8n
        const response = await fetch(process.env.N8N_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        console.log(`status: ${response.status} ${response.statusText}`);
        console.log("2");

        if (response.ok) {
            // await interaction.editReply('Data successfully sent to n8n!');
            await interaction.editReply({
                content: `✅ **Registration Complete!**\n- Team: **${teamName}**\n- description: **${description}**`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            console.error('Failed to send data to n8n:', response.statusText);
            await interaction.editReply({
                content: '[register] Failed to send data to n8n.',
                flags: MessageFlags.Ephemeral 
            });
        }


        const channels = getChannel(); // or await queryChannel() if that's your function
        setCache('channels', channels);


    } catch (error) {
        console.error('Error:', error);
        await interaction.editReply({
            content: `There was an error processing your request. ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }

}