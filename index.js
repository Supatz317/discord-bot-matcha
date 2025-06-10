import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Client, Collection, GatewayIntentBits, Options } from 'discord.js';

import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv'; // This imports the dotenv module
dotenv.config(); 

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

		try {
            // Node.js dynamic import expects a URL-like path, not a file system path
            // So, convert the file path back to a file URL.
            const fileUrl = new URL(`file://${filePath}`).href; 
            
            const commandModule = await import(fileUrl);
            const command = commandModule.default || commandModule; // Handle default exports or named exports
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`[INFO] Loaded command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`[ERROR] Could not load command from ${filePath}:`, error);
        }
	}
}


const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));
// console.log(`Found ${eventFiles.length} event files. - eventFiles: ${eventFiles.join(', ')}`);
for (const file of eventFiles) {
	const filePath = join(eventsPath, file);
	try {
        // Convert the file path to a file URL for dynamic import()
        const fileUrl = new URL(`file://${filePath}`).href;
        
        const eventModule = await import(fileUrl);
        const event = eventModule.default || eventModule; // Handle default exports or named exports

        if (event.once) {
            console.log(`[INFO] Loaded event: ${event.name} (once)`);
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            console.log(`[INFO] Loaded event: ${event.name}`);
            client.on(event.name, (...args) => event.execute(...args));
        }
    } catch (error) {
        console.error(`[ERROR] Could not load event from ${filePath}:`, error);
    }
}

client.login(process.env.TOKEN);