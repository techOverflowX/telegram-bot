const { createDaoVoteProposal } = require("./commands/createDaoVoteProposal")

function setupCommands(bot) {
    bot.onText(/\/create_proposal (.+)/, async (msg, match) => {
        try {
            await createDaoVoteProposal(bot, msg, match);
        } catch (error) {
            console.error("Error creating DAO proposal:", error);
            bot.sendMessage(msg.chat.id, `Failed to create proposal with error: ${error}. Please try again.`, {
                message_thread_id: msg.message_thread_id,
                reply_to_message_id: msg.message_id,
            });
        }
    });
}

function initDao(bot) {
    setupCommands(bot);
}

module.exports = {
    initDao,
}