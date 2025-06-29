const cron = require("node-cron");
const { getTbillsMessage, getTBiilsErrorMessage } = require("../../masApiService");
const { getNameForReply, checkAdmin } = require("../utils/helpers");
const { ADMINS, SGT_TIMEZONE } = require("../utils/constants");

// Store thread IDs for each chat
const chatThreadMap = {};
let chatIdTBillsCronStatusMap = {};
let tbillsCronJob;

/**
 * Initialize T-Bills module
 * @param {TelegramBot} bot 
 */
function initTBills(bot) {
  setupCommands(bot);
}

/**
 * Setup bot commands for T-Bills
 * @param {TelegramBot} bot 
 */
function setupCommands(bot) {
  // Manual T-Bills command
  bot.onText(/\/tbills/i, async (msg) => {
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;

    try {
      const reply = await getTbillsMessage();
      console.log("[tbills] got tbills message:", reply);
      bot.sendMessage(chatId, reply, {
        message_thread_id: msgThreadId,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.log("[tbills] error getting tbills", error);
      const tBillsErrorMessage = getTBiilsErrorMessage();
      bot.sendMessage(chatId, tBillsErrorMessage, {
        message_thread_id: msgThreadId,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      });
    }
  });

  // Start T-Bills cron job command
  bot.onText(/\/startTbills/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;

    // Store the thread ID for this chat
    chatThreadMap[chatId] = msgThreadId;

    if (chatIdTBillsCronStatusMap[chatId]) {
      bot.sendMessage(chatId, `Daily T-Bills schedule already started.`, {
        message_thread_id: msgThreadId,
      });
      return;
    }

    chatIdTBillsCronStatusMap[chatId] = true;
    const reply = `Starting daily T-Bills schedule.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });

    console.log(`T-Bills schedule activated for chatId: ${chatId}`);

    // Start the cron job if it's not already running
    if (!tbillsCronJob) {
      tbillsCronJob = cron.schedule(
        "0 8 * * *",
        async () => {
          try {
            const result = await getTbillsMessage();
            console.log("Fetched T-Bills message, sending to active chats");

            // Send to all chats with active status
            for (const [chatId, isActive] of Object.entries(
              chatIdTBillsCronStatusMap
            )) {
              if (isActive) {
                const threadId = chatThreadMap[chatId];
                console.log(
                  `Sending T-Bills message to chatId: ${chatId}, threadId: ${threadId}`
                );
                bot.sendMessage(chatId, result, {
                  message_thread_id: threadId,
                  parse_mode: "Markdown",
                });
              }
            }
          } catch (error) {
            console.error("Error in T-Bills cron job:", error);
            
            // Send error message to active chats
            const errorMessage = getTBiilsErrorMessage();
            for (const [chatId, isActive] of Object.entries(
              chatIdTBillsCronStatusMap
            )) {
              if (isActive) {
                const threadId = chatThreadMap[chatId];
                bot.sendMessage(chatId, errorMessage, {
                  message_thread_id: threadId,
                  parse_mode: "Markdown",
                });
              }
            }
          }
        },
        {
          scheduled: true,
          timezone: SGT_TIMEZONE,
        }
      );
      console.log("T-Bills cron job started");
    }
  });

  // Check T-Bills cron status
  bot.onText(/\/checkTbills/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const reply = `T-Bills cron job status for ${chatId}: ${chatIdTBillsCronStatusMap[chatId] || false}`;
    console.log(reply);

    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });
  });

  // Stop T-Bills cron job
  bot.onText(/\/stopTbills/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;

    chatIdTBillsCronStatusMap[chatId] = false;
    const reply = `Stopping daily T-Bills schedule for this chat.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
    });

    console.log(`Deactivated T-Bills schedule for chatId: ${chatId}`);

    // Check if any chats are still active
    const anyActive = Object.values(chatIdTBillsCronStatusMap).some((status) => status);

    // If none are active, stop the job entirely
    if (!anyActive && tbillsCronJob) {
      tbillsCronJob.stop();
      tbillsCronJob = null;
      console.log("All chats inactive - stopped T-Bills cron job");
    }
  });
}

module.exports = {
  initTBills
};