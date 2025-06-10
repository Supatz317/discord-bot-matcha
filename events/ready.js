import { Events } from 'discord.js';
import { setCache, getChannel, getCache } from '../database/db.js';


export const name = Events.ClientReady;
export const once = true;
export function execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    const channels = getChannel(); // or await queryChannel() if that's your function
    setCache('channels', channels);
    console.log('Channel list cached on startup.');

}