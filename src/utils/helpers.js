/**
 * Get name from the msg for addressing the user in reply
 *
 * @param {TelegramBot.Message} msg
 */
function getNameForReply(msg) {
  let namePart = "Anonymous user";
  if (msg.from.username) {
    namePart = `@${msg.from.username}`;
  } else if (msg.from.first_name) {
    namePart = msg.from.first_name;
  }
  return namePart;
}

/**
 * Check if user is admin and send error message if not
 * @param {TelegramBot.Message} msg 
 * @param {TelegramBot} bot 
 * @param {string[]} admins 
 * @returns {boolean}
 */
function checkAdmin(msg, bot, admins) {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  
  if (!admins.includes(msg.from.username)) {
    bot.sendMessage(chatId, "You are not an admin to execute this command", {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
    return false;
  }
  return true;
}

module.exports = {
  getNameForReply,
  checkAdmin
};