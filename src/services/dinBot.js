const axios = require("axios");
const { DIN_BOT_URL } = require("../utils/constants");

/**
 * Get response from Din Bot API
 * @param {string} query - The query to send to Din Bot
 * @param {string} namePart - User name for addressing
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<string|undefined>} - Din Bot response or undefined if error
 */
async function getDinBotResponse(query, namePart, chatId) {
  console.log(`Sending to Din bot from chatId ${chatId}:`);
  console.log(query);

  const dinToken = process.env.DIN_TOKEN;

  try {
    const response = await axios.post(
      DIN_BOT_URL,
      {
        message: query,
        key: dinToken,
        user: namePart,
        chatId,
      },
      {
        headers: {},
      }
    );

    const data = response.data;

    // validate data
    if (!data || data.length > 600) {
      console.log("Received invalid Din bot response");
      if (data && data.length > 600) {
        console.log(data.slice(600));
      }
      return undefined;
    }
    
    console.log("Received Din bot response:");
    console.log(data);
    
    if (
      query.toLowerCase().includes("code") &&
      query.toLowerCase().includes("in")
    ) {
      // workaround for code formatting
      return `\`\`\`
${data}
\`\`\``;
    }
    return data;
  } catch (error) {
    console.log("Din bot error");
    console.log(error);
    return undefined;
  }
}

module.exports = {
  getDinBotResponse
};