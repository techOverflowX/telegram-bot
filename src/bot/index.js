const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const TelegramBot = require("node-telegram-bot-api");

// Import services and config
const { pool, redis } = require("../config/database");

// Import command modules
const { initLeetCode } = require("../commands/leetcode");
const { initDefinitions } = require("../commands/definitions");
const { initSummarize } = require("../commands/summarize");
const { initTBills } = require("../commands/tbills");
const { initAdmin } = require("../commands/admin");
const { createDaoVoteProposal } = require("../modules/dao/commands/createDaoVoteProposal");

// Import utilities and constants
const { getNameForReply } = require("../utils/helpers");
const { 
  TROLL_CONFUCIUS_QUOTE_URL,
  RECURSIVE_MARKER,
  IGNORE_WORDS,
  LANGUAGE_CONFIDENCE_THRESHOLD 
} = require("../utils/constants");

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
const bot = new TelegramBot(token, { polling: true });

// Initialize all command modules
initLeetCode(bot, trollQuotes);
initDefinitions(bot);
initSummarize(bot);
initTBills(bot);
initAdmin(bot);

// DAO voting system (existing module)
bot.onText(/\/createProposal (.+)/, async (msg, match) => {
  const proposalTitle = match[1];
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);

  try {
    await createDaoVoteProposal(bot, chatId, msgThreadId, messageId, proposalTitle, namePart);
  } catch (error) {
    console.error("Error creating DAO proposal:", error);
    bot.sendMessage(chatId, "Failed to create proposal. Please try again.", {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
  }
});

console.log("Bot initialized with all modules");

// Export bot instance for potential external use
module.exports = { bot };