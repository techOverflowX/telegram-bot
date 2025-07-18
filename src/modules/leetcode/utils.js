const axios = require("axios");
const cacheService = require("../../services/cache");

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

  console.log("requesting");
  let response;
  try {
    response = await axios({
      url: "https://khbvwaqoymhdhgoiwtlf.supabase.co/functions/v1/lc-query",
      method: "post",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + process.env.SUPABASE_ANON_KEY,
      },
      data: {},
    });
  } catch (error) {
    console.log("an error occured");
  }
  console.log(response.status);


  console.log(response.data);
  const data = response.data.dailyChallenge;
  const date = data.date;
  const question = data.question;
  const title = question.title;
  const link = "https://leetcode.com" + data.link;
  const difficulty = question.difficulty;
  
  let diffIndicator = "";
  if (difficulty === "Easy") {
    diffIndicator = "🟩";
  } else if (difficulty === "Medium") {
    diffIndicator = "🟨";
  } else if (difficulty === "Hard") {
    diffIndicator = "🟥";
  }
  
  const msg = `*👨‍💻LC Daily Question👩‍💻*\r\n*Date:* ${date}\r\n*Title: *${title}\r\n*Difficulty:* ${difficulty} ${diffIndicator}\r\n${link}`;

  await cacheService.set("daily-lcq", msg, 86400);
  return msg;
}

module.exports = {
    getLCQuestion,
}