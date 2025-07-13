const { getNameForReply } = require("../../../common/getNameForReply");
const {
  MINIMUM_APPROVAL_PERCENTAGE,
  MINIMUM_REQUIRED_VOTES,
  DAO_VOTE_POLL_DURATION,
} = require("../../../constants/constants");
const { closeDaoVoteProposal } = require("./closeDaoVoteProposal");

async function createDaoVoteProposal(bot, message, match) {
  const chatId = message.chat.id;
  const { 
      message_thread_id: messageThreadId,
      message_id: messageId
  } = message;
  const usernameOfProposer = getNameForReply(message);
  const proposedPollTitle = match[1];

  const messageToSend = generateDaoVoteProposalMessage(
    proposedPollTitle,
    usernameOfProposer
  );

  // const result = await bot.sendPoll(
  //   chatId,
  //   messageToSend,
  //   ["Approve", "Deny"],
  //   {
  //     message_thread_id: messageThreadId,
  //     reply_to_message_id: messageId,
  //   }
  // );
  // console.log(result);

  const {
    chat,
    message_id: createdPollMessageId,
    poll
  } = await bot.sendPoll(
    chatId,
    messageToSend,
    ["Approve", "Deny"],
    {
      message_thread_id: messageThreadId,
      reply_to_message_id: messageId,
    }
  );



  setTimeout(() => {
    closeDaoVoteProposal(bot, chat.id, messageThreadId, createdPollMessageId);
  }, DAO_VOTE_POLL_DURATION);
}

function generateDaoVoteProposalMessage(proposedPollTitle, usernameOfProposer) {
  const message = `
${usernameOfProposer} is currently proposing to create a DAO Vote titled:
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
