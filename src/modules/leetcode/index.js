const { TOPIC_CHANNEL, CHAT_ID } = require("../../constants/constants");
const { getTodaysLeetcodeQuestion } = require("./commands/getTodaysLeetcodeQuestion");
const cron = require("node-cron");
const cacheService = require("../../services/cache");
const { getLCQuestion } = require("./utils");
const { SGT_TIMEZONE } = require("../../utils/constants");

const threadIdCronStatusMap = {
    [TOPIC_CHANNEL.LEETCODE]: true,
}

function initLeetcode(bot) {
    setupCommands(bot);

    cron.schedule(
        "01 8 * * *",
        async () => {
            try {
                await cacheService.del("daily-lcq");
                const lcQuestion = await getLCQuestion();

                for (const [threadId, isActive] of Object.entries(threadIdCronStatusMap)) {
                    if (isActive) {
                        bot.sendMessage(CHAT_ID, lcQuestion, {
                            message_thread_id: threadId,
                            parse_mode: "Markdown",
                        });
                    }
                }
            } catch (error) {
                console.error("Error in LC Question cron job: ", error);
            }
        },
        {
            scheduled: true,
            timezone: SGT_TIMEZONE,
        }
    );
    bot.sendMessage(CHAT_ID, "Successfully configured daily leetcode question");
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
    });
}

module.exports = {
    initLeetcode,
}