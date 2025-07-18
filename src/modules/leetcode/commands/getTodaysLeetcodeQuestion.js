const { getNameForReply } = require("../../../utils/helpers");
const { getLCQuestion } = require("../utils")

async function getTodaysLeetcodeQuestion(bot, msg) {
    try {
        const dailyQuestion = await getLCQuestion();
        const nameToReply = getNameForReply(msg)
        const reply = `Hello ${nameToReply}! Here's today's question:\r\n\r\n${dailyQuestion}`;
        bot.sendMessage(msg.chat.id, reply, {
            message_thread_id: msg.message_thread_id,
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown",
        });
    } catch (error) {
        console.error("Error getting LC question:", error);
        bot.sendMessage(msg.chat.id, "Sorry, failed to get today's LeetCode question.", {
            message_thread_id: msg.message_thread_id,
            reply_to_message_id: msg.message_id,
        })
    }
}

module.exports = {
    getTodaysLeetcodeQuestion,
}