const { getDinBotResponse } = require("../services/dinBot");
const { getNameForReply } = require("../utils/helpers");

/**
 * Initialize summarize module
 * @param {TelegramBot} bot 
 */
function initSummarize(bot) {
  setupCommands(bot);
}

/**
 * Setup bot commands for summarization
 * @param {TelegramBot} bot 
 */
function setupCommands(bot) {
  // !summarize command handler
  bot.onText(/(?:!summarize|!summarise)(?: *)(.*)/, async (msg, match) => {
    const messageId = msg.message_id;
    const chatId = msg.chat.id;
    const namePart = getNameForReply(msg);

    const replyToMessage = msg.reply_to_message;
    if (!replyToMessage) {
      console.log("Summarize: No replyToMessage");
      bot.sendMessage(chatId, "Please reply to a message to summarize it.", {
        reply_to_message_id: messageId,
      });
      return;
    }

    const replyToMessageId = replyToMessage.message_id;
    let resp = replyToMessage.text;

    // Handle caption for other message types (photos, videos, etc.)
    if (!resp) {
      resp = replyToMessage.caption;
    }

    console.log(`Received Original: ${resp}`);

    if (!resp) {
      console.log("Summarize: No content to summarize");
      bot.sendMessage(chatId, "No text content found in the replied message.", {
        reply_to_message_id: replyToMessageId,
      });
      return;
    }

    let reply = `Failed to summarize.`;
    
    try {
      // Send to Din bot for summarization
      const dinBotResponseText = await getDinBotResponse(
        `summarise ${match[1] ? match[1] : "this"}\r\n${resp}`,
        namePart,
        chatId
      );
      
      if (dinBotResponseText) {
        reply = `${dinBotResponseText}`;
      }
    } catch (error) {
      console.error("Error getting Din bot response for summarization:", error);
    }

    console.log(`Reply Summary: ${reply}`);
    
    bot.sendMessage(chatId, reply, {
      reply_to_message_id: replyToMessageId,
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
  });
}

module.exports = {
  initSummarize
};