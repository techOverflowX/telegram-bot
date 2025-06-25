const { getNameForReply } = require("../../../common/getNameForReply");
const {
  MINIMUM_APPROVAL_PERCENTAGE,
  MINIMUM_REQUIRED_VOTES,
  TWENTY_FOUR_HOURS,
} = require("../../../constants/constants");
const { closeDaoVoteProposal } = require("./closeDaoVoteProposal");

async function createDaoVoteProposal(bot, message, match) {
  const messageId = message.message_id;
  const messageThreadId = message.message_thread_id;
  const chatId = message.chat.id;
  const usernameOfProposer = getNameForReply(message);

  const proposedPollTitle = match[1];

  const messageToSend = generateDaoVoteProposalMessage(
    proposedPollTitle,
    usernameOfProposer
  );

  const { poll } = await bot.sendPoll(
    chatId,
    messageToSend,
    ["Approve", "Deny"],
    {
      message_thread_id: messageThreadId,
      reply_to_message_id: messageId,
    }
  );

  setTimeout(() => {
    closeDaoVoteProposal(bot, chatId, messageThreadId, poll.id);
  }, TWENTY_FOUR_HOURS);
}

function generateDaoVoteProposalMessage(proposedPollTitle, usernameOfProposer) {
  const message = `
${usernameOfProposer} is currently proposing to create a DAO Vote with:

${proposedPollTitle}

A minimum of ${MINIMUM_REQUIRED_VOTES} votes and an approval rate of ${
    MINIMUM_APPROVAL_PERCENTAGE * 100
  }% is required for the proposal to pass.
The poll will be open for 24 hours.
    `;

  return message;
}

module.exports = {
  createDaoVoteProposal,
};
