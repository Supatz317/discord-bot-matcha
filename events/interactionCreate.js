import { ButtonStyle, Events } from 'discord.js';
import { StringSelectMenuBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder } from 'discord.js'; // Import here if not already imported

export const name = Events.InteractionCreate;
export async function execute(interaction) {

	if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                // Execute the command's logic
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral  });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral  });
                }
            }
        }

		// handle delete message button 
		if (interaction.isButton() && interaction.customId === 'delete_message') {
        
        try {
            // Delete the message the button is attached to
            await interaction.message.delete();

            // Optionally, send an ephemeral follow-up message to the user who clicked the button
            // This confirms the action but doesn't clutter the channel.
            // await interaction.reply({ content: 'ข้อความถูกลบเรียบร้อยแล้วค่ะ', flags: MessageFlags.Ephemeral  });

        } catch (error) {
            console.error('Failed to delete message:', error);
            // Inform the user if deletion fails (e.g., due to missing permissions)
            await interaction.reply({ content: 'ไม่สามารถลบข้อความได้ กรุณาตรวจสอบสิทธิ์ของบอทค่ะ', flags: MessageFlags.Ephemeral });
        }
    }

		// Handle Select Menu Interactions (Task Selection)
        if (interaction.isStringSelectMenu() && interaction.customId === 'task_selection_dropdown') {
            const userId = interaction.user.id;
            const selectedTaskId = interaction.values[0];

            // Access shared data and state from client object
            const userConversationStates = interaction.client.userConversationStates;
            const TASKS = interaction.client.TASKS;
            const STATUS_OPTIONS = interaction.client.STATUS_OPTIONS;

            if (!userConversationStates.has(userId) || userConversationStates.get(userId).step !== 'awaiting_task_selection') {
                await interaction.reply({ content: 'Please start by using `/update-task` first.', flags: MessageFlags.Ephemeral  });
                return;
            }

            userConversationStates.get(userId).step = 'awaiting_status_selection';
            userConversationStates.get(userId).data.selectedTaskId = selectedTaskId;

            const statusButtonsRow = new ActionRowBuilder();
            STATUS_OPTIONS.forEach(status => {
                const button = new ButtonBuilder()
                    .setCustomId(`status_button_${status.replace(/\s/g, '_').toLowerCase()}`)
                    .setLabel(status)
                    .setStyle(ButtonStyle.Primary);
                statusButtonsRow.addComponents(button);
            });

            await interaction.update({
                content: `You selected **${TASKS[selectedTaskId].name}**. What's the new status?`,
                components: [statusButtonsRow],
                flags: MessageFlags.Ephemeral 
            });
        }

        // Handle Button Interactions (Status Selection)
        if (interaction.isButton() && interaction.customId.startsWith('status_button_')) {
            const userId = interaction.user.id;
            const selectedStatus = interaction.component.label;

            // Access shared data and state from client object
            const userConversationStates = interaction.client.userConversationStates;
            const TASKS = interaction.client.TASKS;

            if (!userConversationStates.has(userId) || userConversationStates.get(userId).step !== 'awaiting_status_selection') {
                await interaction.reply({ content: 'Please start by using `/update-task` first.', flags: MessageFlags.Ephemeral });
                return;
            }

            const selectedTaskId = userConversationStates.get(userId).data.selectedTaskId;

            // --- Simulate updating the task (replace with database logic) ---
            TASKS[selectedTaskId].status = selectedStatus;
            // --- End Simulation ---

            userConversationStates.delete(userId); // Clear user state

            const updateAnotherRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('update_another_task_button')
                        .setLabel('Update another task')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.update({
                content: `✅ Successfully updated **${TASKS[selectedTaskId].name}** to **${selectedStatus}**.`,
                components: [updateAnotherRow],
                flags: MessageFlags.Ephemeral 
            });

			console.log(`Task ${selectedTaskId} updated to status: ${selectedStatus}`);
        }

        // Handle "Update another task" button click
        if (interaction.isButton() && interaction.customId === 'update_another_task_button') {
            const userId = interaction.user.id;

            // Access shared data and state from client object
            const userConversationStates = interaction.client.userConversationStates;
            const TASKS = interaction.client.TASKS;

            userConversationStates.set(userId, {
                step: 'awaiting_task_selection',
                data: {}
            });

            // Recreate the task selection menu
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

            await interaction.update({
                content: 'What task do you want to update next?',
                components: [row],
                flags: MessageFlags.Ephemeral 
            });
        }

		
	

}