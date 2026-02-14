const cacheService = require("../../services/cache");
const { scrapeDailyLCQuestion } = require("../../services/leetcodeScraper");

/**
 * Get LeetCode daily question
 * @returns {Promise<string>}
 */
async function getLCQuestion() {
  // Check if exist in cache first
  const cachedLCQ = await cacheService.get("daily-lcq");
  if (cachedLCQ) {
    console.log("Using cached LCQ");
    return cachedLCQ;
  }

  const msg = await scrapeDailyLCQuestion();
  await cacheService.set("daily-lcq", msg, 86400);
  return msg;
}

module.exports = {
    getLCQuestion,
}
