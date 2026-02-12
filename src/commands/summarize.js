const aiService = require("../services/aiService");
const tokenLimiter = require("../services/tokenLimiter");
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
      // Check if AI is enabled and quota is available
      const quota = await tokenLimiter.checkQuota(chatId);

      if (!quota.enabled) {
        reply = "AI features not enabled for this chat. Ask admin to run /start-ai";
      } else if (!quota.allowed) {
        const resetTime = tokenLimiter.formatTimeRemaining(quota.resetIn);
        reply = `AI token quota exceeded. Quota resets in ${resetTime}.`;
      } else {
        // Call AI service for summarization
        const aiResult = await aiService.summarizeText(resp, namePart);
        if (aiResult.response) {
          // Consume tokens
          await tokenLimiter.consumeTokens(chatId, aiResult.tokensUsed);
          reply = aiResult.response;
        }
        // else: keep default "Failed to summarize" message
      }
    } catch (error) {
      console.error("Error getting AI response for summarization:", error);
      // Keep default "Failed to summarize" message on error
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