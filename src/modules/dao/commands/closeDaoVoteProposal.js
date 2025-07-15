const {
  MINIMUM_REQUIRED_VOTES,
  MINIMUM_APPROVAL_PERCENTAGE,
} = require("../../../constants/constants");

async function closeDaoVoteProposal(bot, chatId, threadId, messageId) {
  const closedPoll = await bot.stopPoll(chatId, messageId, {
    message_thread_id: threadId,
  });

  const { options, total_voter_count } = closedPoll;
  if (total_voter_count < MINIMUM_REQUIRED_VOTES) {
    bot.sendMessage(chatId, "Proposal is rejected due to not reaching the required votes", {
      message_thread_id: threadId,
    });
    return;
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
      reply_to_message_id: messageId,
    });

    await bot.pinChatMessage(chatId, messageId, {
      disable_notification: true,
    })

  } else {
    bot.sendMessage(chatId, "Proposal has been rejected", {
      message_thread_id: threadId,
      reply_to_message_id: messageId,
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
