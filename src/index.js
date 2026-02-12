const axios = require("axios");
const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();

// Import services and config
const { pool, redis } = require("./config/database");

// Import command modules
const { initLeetcode: initLeetcodeNew } = require("./modules/leetcode/index");
const { initLeetCode } = require("./commands/leetcode");
// const { initDefinitions } = require("./commands/definitions");  // AI features disabled for now
// const { initSummarize } = require("./commands/summarize");      // AI features disabled for now
const { initTBills } = require("./commands/tbills");
const { initAdmin } = require("./commands/admin");
const { initUtils } = require("./commands/utils");
const { initDao } = require("./modules/dao/index")

// Import utilities and constants
const { 
  TROLL_CONFUCIUS_QUOTE_URL,
  RECURSIVE_MARKER,
  IGNORE_WORDS,
  LANGUAGE_CONFIDENCE_THRESHOLD 
} = require("./utils/constants");

// Initialize external data
let trollQuotes = [];

// Load troll quotes from remote source
axios
  .get(TROLL_CONFUCIUS_QUOTE_URL)
  .then((response) => {
    console.log("got remote troll quotes array of size", response.data.length);
    trollQuotes = response.data;
  })
  .catch((error) => {
    console.error("init troll quotes fail");
    console.error(error);
  });

// Create bot instance
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {
  polling: true,
  request: {
    agentOptions :{
      keepAlive: true,
      family: 4,
    }
  },
  url: "https://api.telegram.org",
});

bot.on("polling_error", (msg) => console.log(msg));

// Initialize all command modules
initUtils(bot);
initLeetCode(bot, trollQuotes);
initLeetcodeNew(bot, trollQuotes);
// initDefinitions(bot);  // AI features disabled for now
// initSummarize(bot);    // AI features disabled for now
initTBills(bot);
initAdmin(bot);
initDao(bot);

bot.setMyCommands([
  {command: "lc", description: "Gets the daily question of the day"},
]);

console.log("Bot initialized with all modules");

// Export bot instance for potential external use
module.exports = { bot };
