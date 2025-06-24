export async function closeDaoVoteProposal(bot, chatId, threadId, pollId) {
    const closedPoll = await bot.closePoll(chatId, pollId, {
        message_thread_id: threadId
    });

    const { options, total_voter_count } = closedPoll;
    const approvalPercentage = calculateApprovalPercentage(options, total_voter_count);

    if (isAboveApprovalPercentage(approvalPercentage, 0.75)) {
        bot.sendMesssage(chatId, "Proposal has been approved", {
            message_thread_id: threadId,
        });
    } else {
        bot.sendMesssage(chatId, "Proposal has not been approved", {
            message_thread_id: threadId,
        });
    }
}

function calculateApprovalPercentage(options, total_voter_count) {
    const approvalVoteAmount = options[0].voter_count;
    return Number(approvalVoteAmount) / Number(total_voter_count);
}

function isAboveApprovalPercentage(approvalPercentage, approvalPercentageNeeded) {
    return approvalPercentage >= approvalPercentageNeeded;
}