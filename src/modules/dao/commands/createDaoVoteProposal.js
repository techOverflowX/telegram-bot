const { getNameForReply } = require("../../../common/getNameForReply");
const {
  MINIMUM_APPROVAL_PERCENTAGE,
  MINIMUM_REQUIRED_VOTES,
  DAO_VOTE_POLL_DURATION,
  TOPIC_CHANNEL,
} = require("../../../constants/constants");
const { closeDaoVoteProposal } = require("./closeDaoVoteProposal");

async function createDaoVoteProposal(bot, message, match) {
  const chatId = message.chat.id;
  const { 
      message_thread_id: messageThreadId,
      message_id: messageId
  } = message;
  const usernameOfProposer = getNameForReply(message);
  const args = match[1].split("|");
  const proposedPollTitle = args[0];
  const pollOptions = args.length > 1 ? args.slice(1) : ["Approve", "Deny"];

  const messageToSend = generateDaoVoteProposalMessage(
    proposedPollTitle,
    usernameOfProposer
  );

  const {
    chat,
    message_id: createdPollMessageId,
  } = await bot.sendPoll(
    chatId,
    messageToSend,
    pollOptions,
    {
      // message_thread_id: messageThreadId,
      message_thread_id: TOPIC_CHANNEL.DAO_VOTE,
      reply_to_message_id: messageId,
      question_parse_mode: "HTML",
    }
  );

  setTimeout(() => {
    closeDaoVoteProposal(bot, chat.id, TOPIC_CHANNEL.DAO_VOTE, createdPollMessageId);
  }, DAO_VOTE_POLL_DURATION);
}

function generateDaoVoteProposalMessage(proposedPollTitle, usernameOfProposer) {
  const message = `${usernameOfProposer} is currently proposing to create a DAO Vote. The poll will be open for 24 hours

${proposedPollTitle}
`;
  return message;
}

module.exports = {
  createDaoVoteProposal,
};
