import postgres from 'postgres'
import NodeCache from 'node-cache';

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

sql`SELECT 1`
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });
  
// export default sql

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

function queryChannel() {
    return sql`SELECT channel_id FROM team`;
}


function setCache(key, value, ttl = 3600) {
  cache.set(key, value, ttl);
}


function getCache(key) {
  return cache.get(key);
}

// Cached query function
async function cachedQuery(key, query, params = [], ttl = 3600) {

  // Try to get from cache first
  let data = cache.get(key);
  
  if (data === undefined) {
    console.log(`Cache miss for ${key}, querying database...`);
    data = await sql`SELECT channel_id FROM team`;
    // console.log(`Data retrieved: ${JSON.stringify(data)}`);

    cache.set(key, data, ttl);
  } else {
    // console.log(`Cache hit for ${key}`);
  }
  
  return data;
}



async function getChannel() {
  return cachedQuery(
    'channel',                // cache key
    'SELECT channel_id FROM team',      // SQL query
    [],                        // query parameters
    60                         // TTL in seconds (optional)
  );
}


// get all member
async function getAllMembers(channel_id) {
  try {
    const rows = await sql`SELECT author_id FROM member_team WHERE channel_id = ${channel_id} ORDER BY server_name`;
    console.log('Members retrieved:', rows);
    return rows;
  } catch (error) {
    console.error('Error retrieving members:', error);
    throw error;
  }
}


// get info team
async function getTeamInfo(channel_id) {
  try {
    const rows = await sql`SELECT * FROM team WHERE channel_id = ${channel_id}`;
    console.log('Team info retrieved:', rows);
    return rows;
  } catch (error) {
    console.error('Error retrieving team info:', error);
    throw error;
  }
}

function getDatetimeNow() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1; // Months are 0-indexed
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Pad single-digit numbers with a leading zero
  const formattedMonth = month < 10 ? '0' + month : month;
  const formattedDay = day < 10 ? '0' + day : day;
  const formattedHours = hours < 10 ? '0' + hours : hours;
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;

  return `${year}-${formattedMonth}-${formattedDay}`;
}

// get leave person
async function getLeavePerson(channel_id) {
  const today_date = getDatetimeNow(); // Get today's date in YYYY-MM-DD format
  // const today_date = '2025-06-09'; // For testing, use a fixed date
  console.log('Today date:', today_date, 'Channel ID:', channel_id);
  
  try {
    const rows = await sql`select * from attendance 
    inner join member_team
    on member_team.author_id=attendance.author_id 
    where member_team.channel_id=${channel_id}
    and absent_date=${today_date};`;
    // console.log('Leave person retrieved:', rows);
    return rows;
  } catch (error) {
    console.error('Error retrieving leave person:', error);
    throw error;
  }
}

// get update message
async function getUpdateMessage(channel_id) {
  // const now = new Date();
  const today_date = getDatetimeNow(); // Get today's date in YYYY-MM-DD format
  // const today_date = '2025-06-09'; // For testing, use a fixed date
  console.log('[✅GET UPDATE MESSAGE] Today date:', today_date, 'Channel ID:', channel_id);
  try {
    const rows = await sql`select distinct(author_id) 
from message 
where channel_id=${channel_id}
AND DATE_TRUNC('day', message.timestamp) = ${today_date}::timestamp;`;
    // console.log('Update message retrieved:', rows);
    return rows;
  } catch (error) {
    console.error('Error retrieving update message:', error);
    throw error;
  }
}

// get registered channels
async function getRegisteredChannels() {
  try {
    const rows = await sql`SELECT channel_id FROM team`;
    // console.log('Registered channels retrieved:', rows);
    return rows.map(c => ({ channel_id: c.channel_id }));
  } catch (error) {
    console.error('Error retrieving registered channels:', error);
    throw error;
  }
}

export { getRegisteredChannels, sql, queryChannel, setCache, getCache, cachedQuery, getChannel, getAllMembers, getTeamInfo, getLeavePerson, getUpdateMessage };