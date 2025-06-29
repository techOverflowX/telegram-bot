const { isElectionRelated } = require("../../coolingDay");
const { getNameForReply, checkAdmin } = require("../utils/helpers");
const { ADMINS } = require("../utils/constants");

// State management
let chatIdCensorshipStatusMap = {};
let defaultCensorshipActive = false;
const translationBlackListThreadIds = new Set();

/**
 * Initialize admin commands module
 * @param {TelegramBot} bot 
 */
function initAdmin(bot) {
  setupCommands(bot);
  setupEventHandlers(bot);
}

/**
 * Setup admin commands
 * @param {TelegramBot} bot 
 */
function setupCommands(bot) {
  // Start election content censorship
  bot.onText(/\/startCensorship/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;

    chatIdCensorshipStatusMap[chatId] = true;
    const reply = `Election content filter activated for this chat.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });

    console.log(`Election content filter activated for chatId: ${chatId}`);
  });

  // Stop election content censorship
  bot.onText(/\/stopCensorship/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;

    chatIdCensorshipStatusMap[chatId] = false;
    const reply = `Election content filter deactivated for this chat.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });

    console.log(`Election content filter deactivated for chatId: ${chatId}`);
  });

  // Check censorship status
  bot.onText(/\/checkCensorship/i, async (msg) => {
    if (!checkAdmin(msg, bot, ADMINS)) {
      return;
    }
    
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;

    const status =
      chatIdCensorshipStatusMap[chatId] === true
        ? "active"
        : chatIdCensorshipStatusMap[chatId] === false
        ? "inactive"
        : "not set";

    const reply = `Election content filter status for this chat: ${status}`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
  });

  // Stop translation for thread (public command)
  bot.onText(/\/stopTranslation/i, async (msg) => {
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;
    
    translationBlackListThreadIds.add(msgThreadId);
    const reply = `Translation stopped for this thread.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
  });

  // Start translation for thread (public command)
  bot.onText(/\/startTranslation/i, async (msg) => {
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const messageId = msg.message_id;
    
    translationBlackListThreadIds.delete(msgThreadId);
    const reply = `Translation started for this thread.`;
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
  });
}

/**
 * Setup event handlers for content filtering
 * @param {TelegramBot} bot 
 */
function setupEventHandlers(bot) {
  // Election content filter for new messages
  bot.on("message", async (msg) => {
    const messageId = msg.message_id;
    const messageContent = msg.text || msg.caption;
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const namePart = getNameForReply(msg);

    if (!messageContent) {
      return;
    }

    // Determine if censorship is active for the current chat
    const censorshipActive =
      chatIdCensorshipStatusMap[chatId] ?? defaultCensorshipActive;

    // Skip election check if censorship is not active for this chat
    if (!censorshipActive) {
      return;
    }

    try {
      // Check if the message is election-related
      const isElectionContent = await isElectionRelated(messageContent);

      if (isElectionContent) {
        console.log(`Election-related message detected: ${messageContent}`);

        // Delete the message
        bot
          .deleteMessage(chatId, messageId)
          .then(() => {
            console.log(`Deleted election-related message: ${messageId}`);

            // Send a notification about the deletion with the user tag
            bot.sendMessage(
              chatId,
              `${namePart}, your message was deleted as it contained election-related content.`,
              {
                message_thread_id: msgThreadId,
              }
            );
          })
          .catch((error) => {
            console.error(`Error deleting election-related message: ${error}`);
          });
      }
    } catch (error) {
      console.error("Error checking election content:", error);
    }
  });

  // Election content filter for edited messages
  bot.on("edited_message", async (msg) => {
    console.log("Message edited:", msg);
    const messageId = msg.message_id;
    const messageContent = msg.text || msg.caption;
    const chatId = msg.chat.id;
    const msgThreadId = msg.message_thread_id;
    const namePart = getNameForReply(msg);

    if (!messageContent) {
      return;
    }

    // Determine if censorship is active for the current chat
    const censorshipActive =
      chatIdCensorshipStatusMap[chatId] ?? defaultCensorshipActive;

    // Skip election check if censorship is not active for this chat
    if (!censorshipActive) {
      return;
    }

    try {
      // Check if the edited message is election-related
      const isElectionContent = await isElectionRelated(messageContent);

      if (isElectionContent) {
        console.log(
          `Election-related content detected in edited message: ${messageContent}`
        );

        // Delete the message
        bot
          .deleteMessage(chatId, messageId)
          .then(() => {
            console.log(`Deleted election-related edited message: ${messageId}`);

            // Send a notification about the deletion with the user tag
            bot.sendMessage(
              chatId,
              `${namePart}, your edited message was deleted as it contained election-related content.`,
              {
                message_thread_id: msgThreadId,
              }
            );
          })
          .catch((error) => {
            console.error(
              `Error deleting election-related edited message: ${error}`
            );
          });
      }
    } catch (error) {
      console.error("Error checking election content in edited message:", error);
    }
  });
}

/**
 * Check if translation is enabled for a thread
 * @param {string} threadId 
 * @returns {boolean}
 */
function isTranslationEnabled(threadId) {
  return !translationBlackListThreadIds.has(threadId);
}

/**
 * Get censorship status for a chat
 * @param {string} chatId 
 * @returns {boolean}
 */
function isCensorshipActive(chatId) {
  return chatIdCensorshipStatusMap[chatId] ?? defaultCensorshipActive;
}

module.exports = {
  initAdmin,
  isTranslationEnabled,
  isCensorshipActive
};