# Discord Bot Matcha

A Discord bot for team management and standup tracking with automated features.

## Prerequisites

Before setting up this project, ensure you have the following requirements:

### 1. Node.js and Package Manager
- **Node.js** (v18 or higher)
- **Bun** package manager (recommended) or **npm**
  ```powershell
  # Install Bun on Windows
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```

### 2. Discord Bot Setup
1. **Create a Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" section
   - Click "Add Bot"
   - Copy the **Bot Token** (keep this secure)

2. **Get Application IDs:**
   - In your Discord application, go to "General Information"
   - Copy the **Application ID** (Client ID)
   - Copy the **Guild ID** from your Discord server (right-click server → Copy Server ID)

3. **Bot Permissions:**
   Your bot needs the following permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Embed Links
   - Manage Messages (for delete functionality)

4. **Invite Bot to Server:**
   - Go to OAuth2 → URL Generator
   - Select "bot" and "applications.commands" scopes
   - Select required permissions
   - Use generated URL to invite bot to your server

### 3. Supabase Database Setup
1. **Create Supabase Project:**
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Note down your project URL and API keys

2. **Get Database Connection String:**
   - In your Supabase project, go to Settings → Database
   - Copy the **Connection string** (URI format)
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Required Database Tables:**
   The bot requires the following tables (will be created automatically or via migrations):
   - `team` - Store team information
   - `member_team` - Store team members
   - `message` - Store message tracking
   - `attendance` - Store leave requests

### 4. N8N Workflow Automation
1. **N8N Instance:**
   - Set up an N8N instance (cloud or self-hosted)
   - Create webhook endpoints for bot integration

2. **Webhook Configuration:**
   - Create webhooks in N8N for handling bot events
   - Note the webhook URLs for configuration

### 5. Environment Variables
Create a `.env` file in the project root with the following variables:

```env
# Discord Bot Configuration
TOKEN=your_discord_bot_token
CLIENTID=your_discord_client_id
GUILDID=your_discord_guild_id

# N8N Webhook
N8N_WEBHOOK=your_n8n_webhook_url

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Channel IDs (configure based on your server)
ATTENDANCE_TRAINEE_CHANNEL_ID=your_trainee_channel_id
ATTENDANCE_EMPLOYEE_CHANNEL_ID=your_employee_channel_id

```

### 6. Docker (Optional)
If using Docker for deployment:
- **Docker Desktop** (for Windows)
- **Docker Compose** (included with Docker Desktop)

### 7. Development Tools (Recommended)
- **VS Code** with Discord.js extension
- **Git** for version control
- **PostgreSQL client** (for database management)

## Verification Checklist

Before proceeding with installation:

- [ ] Node.js (v18+) installed
- [ ] Bun or npm available
- [ ] Discord bot created and token obtained
- [ ] Bot invited to Discord server with proper permissions
- [ ] Supabase project created and database URL obtained
- [ ] N8N instance set up with webhook URLs
- [ ] `.env` file created with all required variables
- [ ] All channel IDs configured correctly

## Installation

1. **Clone the repository:**
   ```powershell
   git clone <repository-url>
   cd discord-bot-matcha
   ```

2. **Install dependencies:**
   ```powershell
   bun install
   # or
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in all required values

4. **Deploy slash commands:**
   ```powershell
   bun run deploy-commands.js
   # or
   node deploy-commands.js
   ```

5. **Start the bot:**
   ```powershell
   bun start index.js
   # or
   npm start index.js
   ```

## Docker Deployment

For production deployment using Docker:

1. **Build and run with Docker Compose:**
   ```powershell
   docker-compose up -d --build
   ```

2. **View logs:**
   ```powershell
   docker-compose logs <container_id>
   ```

## Available Commands

- `/team` - Display team information and member status (ใช้เรียกสรุปstandup ตอนเช้า, มี option ซ่อนข้อความ(สำหรับเทส) กับเลือกวันแสดงข้อมูล)  
- `/register` - Register your team in the system (ดึงประวัติแชท เก็บข้อมูลห้องที่ใช้อัพเดทสแตนด์อัพ เป็น hook ต่อที่n8n)
- `/add` - Add a member to your team
- `/remove` - Remove a member from your team
- `/ping` - Test bot connectivity
- `/guide` - Show bot usage guide
- `/track` - Track attendance and updates (case บอทไม่ดึงmessage หรือดึงแต่ดึงผิด เรียกอีกรอบ ใส่message id ตามเข้าไป)

## Features

- **Automated Standup Reminders**: Daily standup notifications at 9:30 AM (Bangkok time)
- **Team Management**: Register teams and manage members
- **Leave Tracking**: Track member leave status and types
- **Message Monitoring**: Track team member activity
- **N8N Integration**: Webhook integration for external workflows
- **Database Persistence**: All data stored in Supabase PostgreSQL

## Support

For issues and questions:
1. Check the verification checklist above
2. Ensure all environment variables are correctly set
3. Verify bot permissions in Discord
4. Check database connectivity

## License

This project is licensed under the MIT License.
