# TechOF Bot a forked version of 16x Engineer Bot

A telegram bot designed for tech telegram groups.

Co-developed by [16x.engineer](https://16x.engineer/), [Mrmarciaong](https://mrmarciaong.com/) and many others

## Features

**1. Define technical terms**

Send a message with `!bot` prefix, eg. `!bot TC`

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/define.png?raw=true" alt="Define technical terms" width="600"/>
</p>

**2. Reminder for using English**

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/language.png?raw=true" alt="Reminder for using English" width="600"/>
</p>

**3. Leetcode Daily Challenge Response** (by [MrMarciaOng](https://github.com/MrMarciaOng))

Send a screenshot with caption containing "#LCYYYYMMDD", eg. `#LC20221107`

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/leetcode.png?raw=true" alt="Leetcode Daily Challenge Response" width="600"/>
</p>

**4. Leetcode Daily Challenge Reminder** (by [Ashton](https://github.com/hahaashton1))

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/lcdaily.png?raw=true" alt="Leetcode Daily Challenge Reminder" width="600"/>
</p>

**5. Proxy for Din Bot**

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/din.png?raw=true" alt="Proxy for Din Bot" width="600"/>
</p>


**6. Get TBills feature** (by [tyqiangz](https://github.com/tyqiangz))

- Added `/hello` command so users can test if the bot is healthy
- Added `/tbills` command to get information about the next 6 months t-bills and most recent 6 months t-bills by pinging MAS API
- Added `/startTbills`, `/checkTbills`, and `/stopTbills` commands to start, check, and stop daily t-bills scheduling, similar to LC handlers
  - The same message as `/tbills` will be sent daily at 8am GMT+8

## Using the bot

**1. Use bot in a group chat**

1. Add [TechOF Bot](https://t.me/TechOF_bot) to your group chat.
2. Add the bot as an administrator (no special permissions needed).
3. Send a message in the chat, eg. `!bot TC` to verify it is working.

<p float="left">
  <img src="https://github.com/paradite/16x-bot/blob/main/screenshots/admin.jpg?raw=true" alt="Add the bot as an administrator" width="600"/>
</p>

**2. Chat with bot directly**

Search for `16x Engineer Bot` on Telegram and chat with it privately.

## Running the bot (Create your own bot)

node

```bash
$ TELEGRAM_TOKEN=XXX node index.js
```

pm2

```bash
$ TELEGRAM_TOKEN=XXX pm2 start index.js
```

with pgsql

```bash
$ PGUSER=dbuser \
  PGHOST=database.server.com \
  PGPASSWORD=secretpassword \
  PGDATABASE=mydb \
  TELEGRAM_TOKEN=XXX pm2 start index.js
```

## Contribute

PRs welcomed!

- Add new terms: Update [docs/terms.json](https://github.com/paradite/16x-bot/blob/main/docs/terms.json)
- Bug fixes and new features: Update [index.js](https://github.com/paradite/16x-bot/blob/main/index.js)


pm2 start npm --name "techOF-bot" -- run start:bun