import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Client, Collection, GatewayIntentBits, Options } from 'discord.js';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
dotenv.config();

// Import the enhanced logger
import logger from './utils/logger.js'; 

const client = new Client({ 
	intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
], 
	makeCache: Options.cacheWithLimits({
		MessageManager: 200, // Cache up to 200 messages per channel
	}),
}); 

// Log bot initialization
logger.info('bot.startup', 'Discord bot starting up', {
    category: 'SYSTEM',
    details: { 
        nodeVersion: process.version,
        botVersion: '1.0.0',
        intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
    }
});

client.userConversationStates = new Map(); // {user_id: {step: '...', data: {...}}}

client.TASKS = {
    "task_1": { "name": "Fix Login Bug", "status": "To Do" },
    "task_2": { "name": "Implement New Feature", "status": "In Progress"},
    "task_3": { "name": "Write Documentation", "status": "Done" },
};

client.STATUS_OPTIONS = ["To Do", "In Progress", "Done", "Blocked"];
// --- End Shared Data ---


if (process.env.N8N_WEBHOOK.includes('test')) {
	console.log('TESTING MODE ENABLED=========================================');
} else {
	console.log('PRODUCTION MODE ENABLED==========================================');
}

client.commands = new Collection();
const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = join(foldersPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const startTime = performance.now();

		try {
            // Node.js dynamic import expects a URL-like path, not a file system path
            // So, convert the file path back to a file URL.
            const fileUrl = new URL(`file://${filePath}`).href; 
            
            const commandModule = await import(fileUrl);
            const command = commandModule.default || commandModule; // Handle default exports or named exports
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                const loadTime = Math.round(performance.now() - startTime);
                
                await logger.info('command.loaded', `Command loaded: ${command.data.name}`, {
                    category: 'SYSTEM',
                    commandName: command.data.name,
                    executionTimeMs: loadTime,
                    details: { filePath, folder }
                });
            } else {
                await logger.warn('command.invalid', `Command missing required properties`, {
                    category: 'SYSTEM',
                    details: { filePath, missingProperties: ['data', 'execute'] }
                });
            }
        } catch (error) {
            await logger.error('command.load_failed', `Failed to load command from ${filePath}`, error, {
                category: 'SYSTEM',
                details: { filePath, folder }
            });
        }
	}
}


const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = join(eventsPath, file);
	try {
        // Convert the file path to a file URL for dynamic import()
        const fileUrl = new URL(`file://${filePath}`).href;
        
        const eventModule = await import(fileUrl);
        const event = eventModule.default || eventModule; // Handle default exports or named exports

        if (event.once) {
            await logger.info('event.loaded', `Loaded one-time event: ${event.name}`, {
                category: 'SYSTEM',
                eventType: event.name,
                details: { filePath, once: true }
            });
            client.once(event.name, (...args) => {
                event.execute(...args);
            });
        } else {
            await logger.info('event.loaded', `Loaded recurring event: ${event.name}`, {
                category: 'SYSTEM',
                eventType: event.name,
                details: { filePath, once: false }
            });
            client.on(event.name, (...args) => {
                event.execute(...args);
            });
        }
    } catch (error) {
        await logger.error('event.load_failed', `Failed to load event from ${filePath}`, error, {
            category: 'SYSTEM',
            details: { filePath }
        });
    }
}

client.login(process.env.TOKEN);