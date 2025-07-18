const { getNameForReply, checkAdmin } = require("../utils/helpers");

function initUtils(bot) {
  setupCommands(bot);
}

function setupCommands(bot) {
  bot.onText(/\/hello$/i, async (msg) => {
    const chatId = msg.chat.id;
    const { 
      message_thread_id: messageThreadId,
      message_id: messageId
    }= msg;
    const nameToReply = getNameForReply(msg);

    const reply = `Hello ${nameToReply}`;

    bot.sendMessage(chatId, reply, {
      message_thread_id: messageThreadId,
      reply_to_message_id: messageId,
    })
  })

  bot.onText(/\/chat_id$/i, async (msg) => {
    const chatId = msg.chat.id;
    const { 
      message_thread_id: messageThreadId,
      message_id: messageId
    }= msg;

    const reply = `The current chat_id is ${chatId}`
    
    bot.sendMessage(chatId, reply, {
      message_thread_id: messageThreadId,
      reply_to_message_id: messageId,
    })
  })

  bot.onText(/\/message_thread_id$/i, async (msg) => {
    const chatId = msg.chat.id;
    const { 
      message_thread_id: messageThreadId,
      message_id: messageId
    }= msg;

    const reply = `The current message thread id is ${messageThreadId}`
    
    bot.sendMessage(chatId, reply, {
      message_thread_id: messageThreadId,
      reply_to_message_id: messageId,
    })
  })
}

module.exports = {
  initUtils,
}