# TechOF Bot (16x Engineer Bot)

A comprehensive Telegram bot designed for tech Telegram groups with multiple integrated features including LeetCode tracking, T-Bills information, technical term definitions, and content moderation.

## Features

### 🤖 Technical Term Dictionary
Send a message with `!bot` prefix to get technical term definitions.
```
!bot TC
!bot API
!bot Docker
```

### 💬 AI-Powered Chat Integration
Use `!summarize` to get AI-generated summaries of conversations via Din Bot integration.

### 📚 LeetCode Integration
- **Daily Questions**: Automatic daily LeetCode question posting at 8:01 AM SGT
- **Submission Tracking**: Submit screenshots with `#LCYYYYMMDD` format (e.g., `#LC20241107`)
- **Statistics**: Track and display user submission statistics
- **Manual Commands**: `!lc` to fetch current daily question

### 💰 Singapore T-Bills Information
- **Daily Updates**: Automatic T-Bills information at 8:00 AM SGT
- **Manual Command**: `/tbills` to get next 6 months and recent 6 months T-Bills data
- **MAS API Integration**: Real-time data from Monetary Authority of Singapore

### 🗳️ DAO Voting System
- **Create Proposals**: `/createProposal <title>` to create community votes
- **Auto-Resolution**: Proposals automatically close after 24 hours with approval threshold checks

### 🔒 Election Content Moderation
AI-powered detection and filtering of election-related content during cooling-off periods.

### 🌐 Multi-language Support
Automatic detection and translation of non-English messages to encourage English usage in tech groups.

## Usage Commands

### User Commands
- `!bot <term>` - Get technical term definitions
- `!lc` - Get current LeetCode daily question
- `!summarize` - Summarize recent messages
- `/tbills` - Get Singapore T-Bills information
- `/hello` - Health check for bot status
- `/createProposal <title>` - Create a DAO proposal

### Admin Commands (Restricted Access)
- `/startLC`, `/stopLC`, `/checkLC` - Manage LeetCode scheduling
- `/startTbills`, `/stopTbills`, `/checkTbills` - Manage T-Bills scheduling
- `/startCensorship`, `/stopCensorship` - Manage election content filtering

### Submission Format
- LeetCode submissions: Upload screenshot with caption `#LCYYYYMMDD` (e.g., `#LC20241107`)

## Setup Instructions

### Prerequisites
- Node.js or Bun runtime
- PostgreSQL database
- Redis instance
- Telegram Bot Token from @BotFather

### Environment Variables
```bash
# Required
TELEGRAM_TOKEN=your_telegram_bot_token
PGUSER=your_postgres_user
PGHOST=your_postgres_host
PGDATABASE=your_database_name
PGPASSWORD=your_postgres_password
REDIS_URL=your_redis_connection_string

# Optional (for advanced features)
DIN_TOKEN=din_bot_api_token
SUPABASE_ANON_KEY=leetcode_api_access
OPENROUTER_API_KEY=content_moderation_api
```

### Installation & Running

#### Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Start with Node.js
npm start

# Start with Bun runtime
npm run start:bun

# Direct execution
node index.js
```

#### Production with PM2
```bash
# Basic setup
TELEGRAM_TOKEN=XXX pm2 start index.js --name "techof-bot"

# With full database configuration
PGUSER=dbuser \
PGHOST=database.server.com \
PGPASSWORD=secretpassword \
PGDATABASE=mydb \
TELEGRAM_TOKEN=XXX \
REDIS_URL=redis://localhost:6379 \
pm2 start index.js --name "techof-bot"
```

## Using the Bot

### In Group Chats
1. Add [@TechOF_bot](https://t.me/TechOF_bot) to your group chat
2. Make the bot an administrator (no special permissions required)
3. Test functionality with `!bot TC` or `/hello`

### Direct Chat
Search for "TechOF Bot" on Telegram to chat privately.

## Contributing

We welcome contributions! Here's how you can help:

- **Add new terms**: Update the technical dictionary
- **Bug fixes**: Submit pull requests with fixes
- **New features**: Implement additional bot capabilities
- **Documentation**: Improve setup and usage instructions

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Test your changes with `npm test`
4. Submit a pull request

## Contributors

This project is made possible by the following contributors:

### Core Contributors
- **[Zhu Liang](https://github.com/paradite)** - Original 16x Engineer Bot creator and primary maintainer
- **[Marcia Ong](https://github.com/MrMarciaOng)** - TechOF Bot fork maintainer and LeetCode features
- **[Nicholas Ong](https://github.com/onebignick)** - Major feature contributions

### Feature Contributors
- **[hahaashton1](https://github.com/hahaashton1)** - LeetCode Daily Challenge Reminder (15 commits)
- **[tyqiangz](https://github.com/tyqiangz)** - T-Bills feature and MAS API integration (5 commits)
- **Joules** - Core functionality improvements (7 commits)
- **[Winston H.](https://github.com/winstxnhdw)** - Various enhancements (3 commits)

### Additional Contributors
- **Nasrudin Bin Salim** (2 commits)
- **Yong Qiang Tay** (2 commits) 
- **kk-min** (2 commits)
- **Elean Ng** (1 commit)
- **Leonard Liu** (1 commit)
- **Pang** (1 commit)

## Architecture

### Core Components
- **Main Entry**: `index.js` - All bot logic, command handlers, and cron jobs
- **Database**: PostgreSQL (submissions), Redis (caching), SQLite (content filtering)
- **External APIs**: MAS API, Din Bot, LeetCode API, OpenAI/OpenRouter

### Key Services
- **MAS API Service**: `masApiService.js` - Singapore T-Bills data
- **Election Filter**: `coolingDay.js` - AI-powered content moderation
- **DAO System**: `src/modules/dao/` - Community voting functionality

## License

This project is open source. See the repository for licensing details.

## Support

For issues and feature requests, please create an issue in the GitHub repository.

---

*Originally based on [16x Engineer Bot](https://github.com/paradite/16x-bot) by [16x.engineer](https://16x.engineer/)*