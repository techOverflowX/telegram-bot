/**
 * Get name from the msg for addressing the user in reply
 *
 * @param {msTelegramBot.Messageg} msg
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

module.exports = {
  getNameForReply,
};
