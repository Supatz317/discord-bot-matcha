// import { sql } from './db';


import sql from "./db";
const NodeCache = require('node-cache');


const myCache = new NodeCache();

// Function to get data with caching
export async function getCachedData(key, fetchFunction, ttl = 3600) {
    // Try to get data from cache
    let data = myCache.get(key);
    
    if (data == undefined) {
        // If not in cache, fetch from database
        data = await fetchFunction();
        
        // Store in cache with time-to-live (in seconds)
        myCache.set(key, data, ttl);
        console.log('Data fetched from database');
    } else {
        console.log('Data fetched from cache');
    }
    
    return data;
}

// Example usage with a database query
export async function getChannels() {
    // Replace this with your actual database query
    // return [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
    const channels = await sql`
            SELECT channel_id FROM team
        `;
        return channels.map(c => ({ channel_id: c.channel_id }));
}

// Get users - will cache for 1 hour (3600 seconds)
// const channel = await getCachedData('channel', getChannels);