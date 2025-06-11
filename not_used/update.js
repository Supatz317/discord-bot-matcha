// Using CommonJS for consistency with `require` in index.js for now.
// If you configure package.json "type": "module", you'd use `import`.
const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-task') // Renamed for clarity in command name
        .setDescription('Starts the process to update a task.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // Access shared data and state from the client object
        const userConversationStates = interaction.client.userConversationStates;
        const TASKS = interaction.client.TASKS;

        // Initialize state for this user
        userConversationStates.set(userId, {
            step: 'awaiting_task_selection',
            data: {}
        });

        // Create the select menu for tasks
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('task_selection_dropdown')
            .setPlaceholder('Select a task to update...')
            .addOptions(
                Object.entries(TASKS).map(([taskId, taskData]) => ({
                    label: taskData.name,
                    value: taskId,
                }))
            );

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        await interaction.reply({
            content: 'What task do you want to update?',
            components: [row],
            ephemeral: true
        });
    },
};