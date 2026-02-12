const axios = require("axios");
const dayjs = require("dayjs");
let isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);
const cron = require("node-cron");

const { pool } = require("../config/database");
const cacheService = require("../services/cache");
const { getNameForReply, checkAdmin } = require("../utils/helpers");
const { ADMINS, SGT_TIMEZONE } = require("../utils/constants");
const { TOPIC_CHANNEL } = require("../constants/constants");
const { scrapeDailyLCQuestion } = require("../services/leetcodeScraper");

// Store thread IDs for each chat
const chatThreadMap = {};
chatThreadMap[-1001509355730] = TOPIC_CHANNEL.LEETCODE;

let chatIdCronStatusMap = {};
chatIdCronStatusMap[-1001509355730] = true;

let lcQuestionCronJob;
let cacheClearCronJob;

// External data
let trollQuotes = [];

/**
 * Initialize LeetCode module with external dependencies
 * @param {TelegramBot} bot
 * @param {Array} quotes
 */
function initLeetCode(bot, quotes = []) {
  trollQuotes = quotes;
  setupCommands(bot);
  setupCronJobs(bot);
}

/**
 * Get LeetCode daily question
 * @returns {Promise<string>}
 */
async function getLCQuestion() {
  // Check if exist in cache first
  const cachedLCQ = await cacheService.get("daily-lcq");
  if (cachedLCQ) {
    console.log("Using cached LCQ");
    return cachedLCQ;
  }

  const msg = await scrapeDailyLCQuestion();
  await cacheService.set("daily-lcq", msg, 86400);
  return msg;
}

/**
 * Get ordinal string for count
 * @param {number} count 
 * @returns {string}
 */
function getCountStr(count) {
  if (count === 1) {
    return "first";
  } else if (count === 2) {
    return "second";
  } else if (count === 3) {
    return "third";
  } else {
    return `${count}th`;
  }
}

/**
 * Setup bot commands
 * @param {TelegramBot} bot 
 */
function setupCommands(bot) {
  // !lc command handler
  bot.onText(/!lc/i, async (msg) => {
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;
    const namePart = getNameForReply(msg);

    try {
      const result = await getLCQuestion();
      console.log(result);
      const reply = `Hello ${namePart}! Here's today's question:\r\n\r\n${result}`;
      bot.sendMessage(chatId, reply, {
        message_thread_id: msgThreadId,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Error getting LC question:", error);
      bot.sendMessage(chatId, "Sorry, failed to get today's LeetCode question.", {
        message_thread_id: msgThreadId,
        reply_to_message_id: messageId,
      });
    }
  });

  // Photo submission handler with #LCYYYYMMDD hashtag
  bot.on("message", async (msg) => {
    const messageId = msg.message_id;
    if (msg.photo && msg.caption) {
      const match = msg.caption.match(/#LC(20\d{2})(\d{2})(\d{2})/g);
      const matchTT = msg.caption.match(/#LCTT(20\d{2})(\d{2})(\d{2})/g);
      const useTrollQuote =
        msg.caption.match(/#LC(20\d{2})(\d{2})(\d{2})_trollme/g) &&
        match &&
        trollQuotes.length > 0;

      if (!match && !matchTT) {
        return;
      }

      let resp;
      if (match) {
        resp = match[0].substring(3, 11); // find the YYYYMMDD
      } else if (matchTT) {
        resp = matchTT[0].substring(5, 13); // find the YYYYMMDD
      }

      console.log(`Received YYYYMMDD: ${resp}`);
      const chatId = msg.chat.id;
      const namePart = getNameForReply(msg);

      let reply = `Sorry ${namePart}, the date you submitted is not valid. Please use current date with format #LCYYYYMMDD. 😊\n\n Note that LC submission acceptance for a date starts only after 8am. If you are submitting before 8am, use yesterday's date. If you are using a time travel token, use the date of the problem with format #LCTTYYYYMMDD.`;
      
      const submissionHour = dayjs().hour();
      let leftBound, rightBound;
      
      if (submissionHour < 8) {
        leftBound = dayjs().hour(8).minute(0).second(0).millisecond(0).subtract(1, 'day');
        rightBound = dayjs().hour(8).minute(0).second(0).millisecond(0);
      } else {
        leftBound = dayjs().hour(8).minute(0).second(0).millisecond(0);
        rightBound = dayjs()
          .hour(8)
          .minute(0)
          .second(0)
          .millisecond(0)
          .add(1, "day");
      }
      
      const submissionDate = dayjs(resp, "YYYYMMDD").hour(8);

      if (
        match &&
        !submissionDate.isBetween(leftBound, rightBound, "hour", "[]")
      ) {
        bot.sendMessage(chatId, reply, {
          reply_to_message_id: messageId,
        });
        return;
      }

      // Valid submission
      const dateStr = submissionDate.format("DD/MM/YYYY");
      const response = await axios.get(`https://api.github.com/zen`);

      let statsStr = "";
      try {
        const res = await pool.query(
          `SELECT COUNT(*) FROM ( SELECT DISTINCT a.username FROM lc_records as a WHERE a.qn_date = $1 and a.username != $2 ) as temp `,
          [dateStr, namePart]
        );
        const existingCount = Number(res.rows[0].count);
        console.log("existingCount", existingCount);
        
        if (existingCount >= 0) {
          statsStr = `\r\nYou are the ${getCountStr(
            existingCount + 1
          )} person to submit for ${dateStr}.`;
        }

        console.log("dateStr", dateStr);
        console.log("statsStr", statsStr);

        const trollQuoteChoice = Math.floor(Math.random() * trollQuotes.length);
        const quote = useTrollQuote
          ? trollQuotes[trollQuoteChoice]
          : response.data;

        reply = `Good job doing ${dateStr} LC question! 🚀 ${namePart}${statsStr}\r\n${quote}`;
        bot.sendMessage(chatId, reply, {
          reply_to_message_id: messageId,
        });
      } catch (error) {
        console.error("pg count query fail");
        console.error(error);
      }

      try {
        console.log("executing query");
        await pool.query(
          `INSERT INTO lc_records (username, qn_date, has_image, msg_text, timestamp) VALUES ($1, $2, $3, $4, $5)`,
          [namePart, dateStr, true, msg.caption, new Date()]
        );
        console.log("insert success");
      } catch (error) {
        console.error("pg write fail");
        console.error(error);
      }
    }
  });

  // Admin commands
  bot.onText(/\/startLC/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;

    chatThreadMap[chatId] = msgThreadId;

    if (chatIdCronStatusMap[chatId]) {
      bot.sendMessage(chatId, `Daily LC schedule already started.`, {
        message_thread_id: msgThreadId,
      });
      return;
    }

    chatIdCronStatusMap[chatId] = true;
    const reply = `Starting daily LC schedule.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });

    console.log(`LC schedule activated for chatId: ${chatId}`);

    if (!lcQuestionCronJob) {
      lcQuestionCronJob = cron.schedule(
        "01 8 * * *",
        async () => {
          try {
            await cacheService.del("daily-lcq");
            const lcQuestion = await getLCQuestion();
            console.log("Fetched LC question, sending to active chats");

            for (const [chatId, isActive] of Object.entries(
              chatIdCronStatusMap
            )) {
              if (isActive) {
                const threadId = chatThreadMap[chatId];
                console.log(
                  `Sending LC question to chatId: ${chatId}, threadId: ${threadId}`
                );
                bot.sendMessage(chatId, lcQuestion, {
                  message_thread_id: threadId,
                  parse_mode: "Markdown",
                });
              }
            }
          } catch (error) {
            console.error("Error in LC question cron job:", error);
          }
        },
        {
          scheduled: true,
          timezone: SGT_TIMEZONE,
        }
      );
      console.log("LC question cron job started");
    }
  });

  bot.onText(/\/stopLC/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;

    chatIdCronStatusMap[chatId] = false;
    const reply = `Stopping daily LC schedule for this chat.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });

    console.log(`Deactivated LC schedule for chatId: ${chatId}`);

    const anyActive = Object.values(chatIdCronStatusMap).some((status) => status);

    if (!anyActive && lcQuestionCronJob) {
      lcQuestionCronJob.stop();
      lcQuestionCronJob = null;
      console.log("All chats inactive - stopped LC question cron job");
    }
  });

  bot.onText(/\/checkLC/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const reply = `Cron job status for ${chatId}: ${chatIdCronStatusMap[chatId]}`;
    console.log(reply);

    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });
  });
}

/**
 * Setup cron jobs
 * @param {TelegramBot} bot 
 */
function setupCronJobs(bot) {
  if (!cacheClearCronJob) {
    cacheClearCronJob = cron.schedule(
      "0 8 * * *",
      async () => {
        await cacheService.del("daily-lcq");
      },
      {
        scheduled: true,
        timezone: SGT_TIMEZONE,
      }
    );
    console.log("LC cache clear cron job started");
  }
}

module.exports = {
  initLeetCode,
  getLCQuestion
};