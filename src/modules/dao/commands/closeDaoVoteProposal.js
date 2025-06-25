const {
  MINIMUM_REQUIRED_VOTES,
  MINIMUM_APPROVAL_PERCENTAGE,
} = require("../../../constants/constants");

async function closeDaoVoteProposal(bot, chatId, threadId, pollId) {
  const closedPoll = await bot.stopPoll(chatId, pollId, {
    message_thread_id: threadId,
  });

  const { options, total_voter_count } = closedPoll;
  if (total_voter_count < MINIMUM_REQUIRED_VOTES) {
    bot.sendMessage(chatId, "Proposal has not been approved", {
      message_thread_id: threadId,
    });
  }
  const approvalPercentage = calculateApprovalPercentage(
    options,
    total_voter_count
  );

  if (
    isAboveApprovalPercentage(approvalPercentage, MINIMUM_APPROVAL_PERCENTAGE)
  ) {
    bot.sendMessage(chatId, "Proposal has been approved", {
      message_thread_id: threadId,
    });
  } else {
    bot.sendMessage(chatId, "Proposal has not been approved", {
      message_thread_id: threadId,
    });
  }
}

function calculateApprovalPercentage(options, total_voter_count) {
  const approvalVoteAmount = options[0].voter_count;
  if (Number(approvalVoteAmount) == 0 || Number(total_voter_count) == 0)
    return 0;

  return Number(approvalVoteAmount) / Number(total_voter_count);
}

function isAboveApprovalPercentage(
  approvalPercentage,
  approvalPercentageNeeded
) {
  return approvalPercentage >= approvalPercentageNeeded;
}

module.exports = {
  closeDaoVoteProposal,
};
