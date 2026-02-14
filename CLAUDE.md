# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm test` - Run tests with mock database (NODE_ENV=test)
- `npm start` - Start the bot with node
- `npm run start:bun` - Start the bot with bun runtime
- `node index.js` - Direct execution (requires environment variables)

## Architecture Overview

This is a Telegram bot (TechOF Bot/16x Engineer Bot) designed for tech Telegram groups with multiple integrated features.

### Core Application Structure

- **Main Entry Point**: `index.js` - Contains all bot logic, command handlers, and cron jobs
- **Database Layer**: Uses both PostgreSQL (user submissions) and Redis (caching), with SQLite for election content filtering
- **External Integrations**: MAS API (T-Bills), Din Bot (AI responses), LeetCode (Puppeteer scraper), OpenAI/OpenRouter (content moderation)

### Key Components

1. **Message Handlers** (`index.js`):
   - `!bot <term>` - Technical term definitions with fallback to Din Bot
   - `!lc` - LeetCode daily question retrieval  
   - `!summarize` - Message summarization via Din Bot
   - Photo submissions with `#LCYYYYMMDD` - LeetCode submission tracking

2. **Cron Jobs** (`index.js`):
   - Daily LeetCode questions (8:01 AM SGT)
   - Daily T-Bills updates (8:00 AM SGT)
   - Cache cleanup for LeetCode questions

3. **Admin Commands** (restricted to hardcoded usernames):
   - `/startLC`, `/stopLC`, `/checkLC` - LeetCode scheduling
   - `/startTbills`, `/stopTbills`, `/checkTbills` - T-Bills scheduling
   - `/startCensorship`, `/stopCensorship` - Election content filtering

4. **MAS API Service** (`masApiService.js`):
   - Fetches Singapore T-Bills data from MAS API
   - Handles issuance calendar and auction history
   - Includes data type definitions in `masDataTypes.js`

5. **Election Content Filter** (`coolingDay.js`):
   - AI-powered detection of election-related content
   - Local SQLite caching for performance
   - Keyword-based regex detection + OpenAI fallback
   - Handles ASCII art, sequential character patterns, and acrostic messages

6. **DAO Voting System** (`src/modules/dao/`):
   - Create proposal: `/createProposal <title>`
   - Auto-closes after 24 hours with approval threshold checks
   - Constants defined in `src/constants/constants.js`

### Database Schemas

- **PostgreSQL**: `lc_records` table for LeetCode submissions (see `sql/table.sql`)
- **SQLite**: `election_messages` table for content filter caching
- **Redis**: Caching layer for LeetCode questions and other temporary data

### Environment Variables Required

- `TELEGRAM_TOKEN` - Bot token from @BotFather
- `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD` - PostgreSQL connection
- `REDIS_URL` - Redis connection string
- `DIN_TOKEN` - Din Bot API access
- `OPENROUTER_API_KEY` - Election content filtering

### Testing Approach

- `NODE_ENV=test` enables mock Redis and PostgreSQL via `mockRedis.js` and `mockPostgres.js`
- Run tests with `npm test`
- Test files in `scripts/` directory for individual feature testing

### Key Features

1. **Multi-language Translation**: Automatic detection and translation of non-English messages
2. **LeetCode Integration**: Daily questions, submission tracking with statistics, time-based validation
3. **T-Bills Information**: Singapore Treasury Bills data via MAS API
4. **Election Content Moderation**: AI-powered filtering with local caching
5. **Technical Term Dictionary**: Remote JSON dictionary with Din Bot fallback
6. **DAO Voting**: Proposal creation and automated resolution

### Code Patterns

- All bot commands use regex patterns with `bot.onText()`
- Error handling with try-catch and fallback responses
- Thread-aware messaging with `message_thread_id` support
- Admin checking via hardcoded username list in `checkAdmin()`
- Timezone-aware cron jobs (Asia/Singapore)
- Database connection pooling for PostgreSQL
- External API rate limiting and response validation