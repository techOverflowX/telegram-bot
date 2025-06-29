const axios = require("axios");
const { getDinBotResponse } = require("../services/dinBot");
const { getNameForReply } = require("../utils/helpers"); 
const { TERMS_URL } = require("../utils/constants");

// Dictionary for term definitions
let definitionMap = {};

/**
 * Initialize definitions module
 * @param {TelegramBot} bot 
 */
function initDefinitions(bot) {
  loadDefinitions();
  setupCommands(bot);
}

/**
 * Load definitions from remote JSON
 */
async function loadDefinitions() {
  try {
    const response = await axios.get(TERMS_URL);
    console.log(
      "got remote dictionary of size",
      Object.keys(response.data).length
    );
    definitionMap = response.data;
  } catch (error) {
    console.error("init dictionary fail");
    console.error(error);
  }
}

/**
 * Setup bot commands for definitions
 * @param {TelegramBot} bot 
 */
function setupCommands(bot) {
  // !bot command handler for term definitions
  bot.onText(/!bot ((?:.|\n|\r)+)/, async (msg, match) => {
    const messageId = msg.message_id;
    const chatId = msg.chat.id;
    const namePart = getNameForReply(msg);
    const resp = match[1]; // the captured term

    console.log(`Received definition request: ${resp}`);

    let reply = `Hi ${namePart}. I have not learnt about ${resp} yet.\r\nOpen a PR [here](https://github.com/paradite/16x-bot) to add it.`;
    
    // Check local definitions first
    if (definitionMap[resp.toLowerCase()]) {
      const [description, link] = definitionMap[resp.toLowerCase()];
      if (link) {
        reply = `${description}\r\nRead more [here](${link}).`;
      } else {
        reply = `${description}`;
      }
    } else {
      // Fallback to Din bot
      try {
        const dinBotResponseText = await getDinBotResponse(resp, namePart, chatId);
        if (dinBotResponseText) {
          reply = `${dinBotResponseText}`;
        }
      } catch (error) {
        console.error("Error getting Din bot response for definition:", error);
      }
    }

    console.log(`Definition reply: ${reply}`);
    
    bot.sendMessage(chatId, reply, {
      reply_to_message_id: messageId,
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
  });
}

/**
 * Get definition for a term
 * @param {string} term 
 * @returns {string|null}
 */
function getDefinition(term) {
  const definition = definitionMap[term.toLowerCase()];
  if (definition) {
    const [description, link] = definition;
    if (link) {
      return `${description}\r\nRead more [here](${link}).`;
    } else {
      return description;
    }
  }
  return null;
}

/**
 * Reload definitions from remote source
 */
async function reloadDefinitions() {
  await loadDefinitions();
}

module.exports = {
  initDefinitions,
  getDefinition,
  reloadDefinitions
};