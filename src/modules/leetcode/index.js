const { getTodaysLeetcodeQuestion } = require("./commands/getTodaysLeetcodeQuestion");

function initLeetcode(bot) {
    setupCommands(bot);
}

function setupCommands(bot) {
    bot.onText(/\/lc$/i, async (msg) => {
        try {
            getTodaysLeetcodeQuestion(bot, msg);
        } catch (error) {
            console.error("Error getting LC question:", error);
            bot.sendMessage(msg.chat.id, "Sorry, failed to get today's LeetCode question.", {
                message_thread_id: msg.message_thread_id,
                reply_to_message_id: msg.message_id,
            })
        }
    })
}

module.exports = {
    initLeetcode,
}