const axios = require("axios");
const { Pool } = require("pg"); // Changed from Client to Pool
const dotenv = require("dotenv");
dotenv.config();
const TelegramBot = require("node-telegram-bot-api");
const dayjs = require("dayjs");
let isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);
const cron = require("node-cron");
console.log(process.env);

const { getTbillsMessage, getTBiilsErrorMessage } = require("./masApiService");
const { isElectionRelated } = require("./coolingDay");

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD, // Change to your password

  // You can configure your pool settings here, if needed.
  // max: 20, // max number of clients in the pool
  // idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
});

pool
  .connect()
  .then(() => console.log("connected"))
  .catch((err) => console.error("connection error", err.stack));

// Initialize dictionary from remote json

let definitionMap = {};
const termsUrl = "https://paradite.github.io/16x-bot/terms.json";

let trollQuotes = [];
const trollConfuciusQuoteUrl =
  "https://raw.githubusercontent.com/techOverflowX/telegram-bot/be46e746899dcd85792494d5df238c49680f812f/docs/troll_confucius.json";

const RECURSIVE_MARKER = "Auto-translation";
const IGNORE_WORDS = ["haha", "ha ha", "lmao", "@"];
const LANGUAGE_CONFIDENCE_THRESHOLD = 0.85;

axios
  .get(termsUrl)
  .then((response) => {
    console.log(
      "got remote dictionary of size",
      Object.keys(response.data).length
    );
    definitionMap = response.data;
  })
  .catch((error) => {
    console.error("init dictionary fail");
    console.error(error);
  });

axios
  .get(trollConfuciusQuoteUrl)
  .then((response) => {
    console.log("got remote array of size", response.data.length);
    trollQuotes = response.data;
  })
  .catch((error) => {
    console.error("init troll fail");
    console.error(error);
  });

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

/**
 * Get name from the msg for addressing the user in reply
 *
 * @param {msTelegramBot.Messageg} msg
 */
function getNameForReply(msg) {
  let namePart = "Anonymous user";
  if (msg.from.username) {
    namePart = `@${msg.from.username}`;
  } else if (msg.from.first_name) {
    namePart = msg.from.first_name;
  }
  return namePart;
}

// Check if admin
function checkAdmin(msg) {
  // Usernames are case sensitive
  const admins = [
    "Hahaashton",
    "Mr_Marcia_Ong",
    "n1ds4n",
    "zdeykid",
    "Ngelean",
    "chingchonglingling",
  ];
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  if (!admins.includes(msg.from.username)) {
    bot.sendMessage(chatId, "You are not an admin to execute this command", {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    });
    return false;
  }
  return true;
}

// async function getLanguageResponse(query, chatId) {
//   console.log(`Sending to Din Language Detection from chatId ${chatId}:`);
//   console.log(query);
//   const languageDetectionUrl =
//     'https://language-detection-zd63nwo7na-as.a.run.app';
//   const languageDetectionToken = process.env.DIN_TOKEN;
//   try {
//     const response = await axios.post(
//       languageDetectionUrl,
//       {
//         message: query,
//         key: languageDetectionToken,
//         chatId,
//       },
//       {
//         headers: {},
//       }
//     );
//     const data = response.data;
//     return data;
//   } catch (error) {
//     console.log('language detection model error');
//     console.log(error);
//     return undefined;
//   }
// }

async function getDinBotResponse(query, namePart, chatId) {
  console.log(`Sending to Din bot from chatId ${chatId}:`);
  console.log(query);
  const dinBotUrl =
    "https://asia-southeast1-free-jobs-253208.cloudfunctions.net/din";

  const dinToken = process.env.DIN_TOKEN;

  try {
    const response = await axios.post(
      dinBotUrl,
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
      // walkaround for code formatting
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

// summarize feature
bot.onText(/(?:!summarize|!summarise)(?: *)(.*)/, async (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const messageId = msg.message_id;
  const chatId = msg.chat.id;
  const namePart = getNameForReply(msg);

  const replyToMessage = msg.reply_to_message;
  if (!replyToMessage) {
    console.log("Summarize: No replyToMessage");

    return;
  }

  const replyToMessageId = replyToMessage.message_id;
  let resp = replyToMessage.text;

  // handle caption for other types
  if (!resp) {
    resp = replyToMessage.caption;
  }

  console.log(`Received Original: ${resp}`);

  if (!resp) {
    console.log("Summarize: No resp");
    return;
  }

  let reply = `Failed to summarize.`;
  // redirect to Din bot
  const dinBotResponseText = await getDinBotResponse(
    `summarise ${match[1] ? match[1] : "this"}\r\n${resp}`,
    namePart,
    chatId
  );
  if (dinBotResponseText) {
    reply = `${dinBotResponseText}`;
  }

  console.log(`Reply Summary: ${reply}`);
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, reply, {
    reply_to_message_id: replyToMessageId,
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
});

// term definition
bot.onText(/!bot ((?:.|\n|\r)+)/, async (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const messageId = msg.message_id;
  const chatId = msg.chat.id;
  const namePart = getNameForReply(msg);
  const resp = match[1]; // the captured "whatever"

  console.log(`Received: ${resp}`);

  let reply = `Hi ${namePart}. I have not learnt about ${resp} yet.\r\nOpen a PR [here](https://github.com/paradite/16x-bot) to add it.`;
  if (definitionMap[resp.toLowerCase()]) {
    const [description, link] = definitionMap[resp.toLowerCase()];
    if (link) {
      reply = `${description}\r\nRead more [here](${link}).`;
    } else {
      reply = `${description}`;
    }
  } else {
    // redirect to Din bot
    const dinBotResponseText = await getDinBotResponse(resp, namePart, chatId);
    if (dinBotResponseText) {
      reply = `${dinBotResponseText}`;
    }
  }

  console.log(`Reply: ${reply}`);
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, reply, {
    reply_to_message_id: messageId,
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
});

async function translateToEnglish(messageContent) {
  try {
    const detectLanguageRequest = await axios.get(
      `https://winstxnhdw-nllb-api.hf.space/api/v4/language?text=${encodeURIComponent(
        messageContent.slice(0, 512).replace(/\n/g, " ")
      )}`
    );
    const detectedLanguage = detectLanguageRequest.data.language;
    const translateLanguageRequest = await axios.get(
      `https://winstxnhdw-nllb-api.hf.space/api/v4/translator?text=${encodeURIComponent(
        messageContent
      )}&source=${detectedLanguage}&target=eng_Latn`
    );

    return [translateLanguageRequest.data.result, detectedLanguage];
  } catch {
    return [undefined, undefined];
  }
}

async function handleNonEnglish(namePart, messageContent, messageId, chatId) {
  console.log(`Handle Non-English Content: ${messageContent}`);
  let reply = `${RECURSIVE_MARKER} failed. \nHi, ${namePart}. This is an automated reminder to use English in this group so that everyone can understand. 😊`;
  // let reply = `Non-English message detected. ${RECURSIVE_MARKER} failed.`;

  const [translatedText, detectedLanguage] = await translateToEnglish(
    messageContent
  );

  if (translatedText) {
    reply = `${detectedLanguage} message detected. ${RECURSIVE_MARKER}:\n${translatedText}`;
  }

  console.log(`Reply: ${reply}`);

  bot.sendMessage(chatId, reply, {
    reply_to_message_id: messageId,
    disable_web_page_preview: true,
    parse_mode: "Markdown",
  });
}

// language detection and auto translation
// bot.on('message', async (msg) => {
//   const messageId = msg.message_id;
//   const messageContent = msg.text || msg.caption;
//   const chatId = msg.chat.id;
//   if (!messageContent) {
//     return;
//   }

//   if (messageContent.length <= 3) {
//     console.log('ignore short message:', messageContent);
//     return;
//   }

//   if (messageContent.includes(RECURSIVE_MARKER)) {
//     console.log('recursive detected:', messageContent);
//     return;
//   }

//   for (let i = 0; i < IGNORE_WORDS.length; i++) {
//     const word = IGNORE_WORDS[i];
//     if (messageContent.toLowerCase().includes(word)) {
//       console.log('ignore word detected:', messageContent);
//       return;
//     }
//   }

//   console.log('detecting:', messageContent);
//   const detectResponse = await getLanguageResponse(messageContent, chatId);
//   if (!detectResponse) {
//     return;
//   }
//   console.log('detectResponse:', detectResponse);
//   if (
//     detectResponse.predicted &&
//     detectResponse.predicted !== 'ENGLISH' &&
//     detectResponse.confidence > LANGUAGE_CONFIDENCE_THRESHOLD
//   ) {
//     console.log('exec detectResponse.confidence:', detectResponse.confidence);
//     console.log('exec detectResponse.predicted:', detectResponse.predicted);
//     const namePart = getNameForReply(msg);
//     handleNonEnglish(namePart, messageContent, messageId, chatId);
//   }
// });
const translationBlackListThreadIds = new Set();
//function to stop translation for message_thread_id
bot.onText(/\/stopTranslation/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.add(msgThreadId);
  const reply = `Translation stopped for this thread.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

//remove thread from translation blacklist
bot.onText(/\/startTranslation/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.delete(msgThreadId);
  const reply = `Translation started for this thread.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

// Chinese detection and translation
bot.onText(
  /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f])/,
  async (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message
    const messageId = msg.message_id;
    const messageContent = msg.text || msg.caption;
    const chatId = msg.chat.id;
    const namePart = getNameForReply(msg);
    const resp = match[1]; // the captured "whatever"

    console.log(`Chinese matched: ${resp}`);
    console.log(`Message content: ${messageContent}`);
    if (!translationBlackListThreadIds.has(msg.message_thread_id)) {
      handleNonEnglish(namePart, messageContent, messageId, chatId);
    } else {
      console.log("Translation stopped for this thread");
    }
  }
);

// motivational reply to encourage ppl to carry on joining the LC party
bot.on("message", async (msg) => {
  // console.log(msg)
  const messageId = msg.message_id;
  if (msg.photo && msg.caption) {
    const match = msg.caption.match(/#LC(20\d{2})(\d{2})(\d{2})/g);
    const matchTT = msg.caption.match(/#LCTT(20\d{2})(\d{2})(\d{2})/g); // #LCTT (time travel) for submission of past LCs. Note that this will accept any date

    const useTrollQuote =
      msg.caption.match(/#LC(20\d{2})(\d{2})(\d{2})_trollme/g) &&
      match &&
      trollQuotes.length > 0;

    if (!match && !matchTT) {
      return;
    }
    let resp;
    if (match) {
      resp = match[0].substring(3, 11); // find the YYYYMMDD
    } else if (matchTT) {
      resp = matchTT[0].substring(5, 13); // find the YYYYMMDD
    }
    console.log(`Received YYYYMMDD: ${resp}`);
    const chatId = msg.chat.id;
    const namePart = getNameForReply(msg);

    let reply = `Sorry ${namePart}, the date you submitted is not valid. Please use current date with format #LCYYYYMMDD. 😊\n\n Note that LC submission acceptance for a date starts only after 8am. If you are submitting before 8am, use yesterday's date. If you are using a time travel token, use the date of the problem with format #LCTTYYYYMMDD.`;
    const submissionHour = dayjs().hour();
    let leftBound = undefined;
    let rightBound = undefined;
    if (submissionHour < 8) {
      // If the time of submission is before 8am, the submission must be for yesterday's date
      // prettier-ignore
      leftBound = dayjs().hour(8).minute(0).second(0).millisecond(0).subtract(1, 'day');
      // prettier-ignore
      rightBound = dayjs().hour(8).minute(0).second(0).millisecond(0);
    } else {
      // If the time of submission is after 8am, submission must be for today's date
      leftBound = dayjs().hour(8).minute(0).second(0).millisecond(0);
      rightBound = dayjs()
        .hour(8)
        .minute(0)
        .second(0)
        .millisecond(0)
        .add(1, "day");
    }
    const submissionDate = dayjs(resp, "YYYYMMDD").hour(8);

    if (
      match &&
      !submissionDate.isBetween(leftBound, rightBound, "hour", "[]")
    ) {
      bot.sendMessage(chatId, reply, {
        reply_to_message_id: messageId,
      });
      return;
    }

    // if matchTT or match within correct time:
    const dateStr = submissionDate.format("DD/MM/YYYY");
    const response = await axios.get(`https://api.github.com/zen`);

    let statsStr = "";
    try {
      const res = await pool.query(
        `SELECT COUNT(*) FROM ( SELECT DISTINCT a.username FROM lc_records as a WHERE a.qn_date = $1 and a.username != $2 ) as temp `,
        [dateStr, namePart]
      );
      const existingCount = Number(res.rows[0].count);
      console.log("existingCount", existingCount);
      if (existingCount >= 0) {
        statsStr = `\r\nYou are the ${getCountStr(
          existingCount + 1
        )} person to submit for ${dateStr}.`;
      }

      console.log("dateStr", dateStr);
      console.log("statsStr", statsStr);

      const trollQuoteChoice = Math.floor(Math.random() * trollQuotes.length);
      const quote = useTrollQuote
        ? trollQuotes[trollQuoteChoice]
        : response.data;

      reply = `Good job doing ${dateStr} LC question! 🚀 ${namePart}${statsStr}\r\n${quote}`;
      bot.sendMessage(chatId, reply, {
        reply_to_message_id: messageId,
      });
    } catch (error) {
      console.error("pg count query fail");
      console.error("send fail");
      console.error(error);
    }

    try {
      console.log("executing query");
      await pool.query(
        `INSERT INTO lc_records (username, qn_date, has_image, msg_text, timestamp) VALUES ($1, $2, $3, $4, $5)`,
        [namePart, dateStr, true, msg.caption, new Date()]
      );
      console.log("insert success");
    } catch (error) {
      console.error("pg write fail");
      console.error(error);
    }
  }
});

function getCountStr(count) {
  if (count === 1) {
    return "first";
  } else if (count === 2) {
    return "second";
  } else if (count === 3) {
    return "third";
  } else {
    return `${count}th`;
  }
}

// GraphQL query for LC daily question
const dailyLCQuery = `
query questionOfToday {
  activeDailyCodingChallengeQuestion {
  date
  userStatus
  link
  question {
    acRate
    difficulty
    freqBar
    frontendQuestionId: questionFrontendId
    isFavor
    paidOnly: isPaidOnly
    status
    title
    titleSlug
    hasVideoSolution
    hasSolution
    topicTags {
      name
      id
      slug
    }
  }
  }
  }
`;
// `
// query questionOfToday {
// activeDailyCodingChallengeQuestion {
// date
// userStatus
// link
// question {
//   acRate
//   difficulty
//   freqBar
//   frontendQuestionId: questionFrontendId
//   isFavor
//   paidOnly: isPaidOnly
//   status
//   title
//   titleSlug
//   hasVideoSolution
//   hasSolution
//   topicTags {
//     name
//     id
//     slug
//   }
// }
// }
// }
// `;
// POST request to get LC daily question
const getLCQuestion = async () => {
  //check if exist in cache first
  const cachedLCQ = await redis.get("daily-lcq");
  if (cachedLCQ) {
    console.log("Using cached LCQ");
    return cachedLCQ;
  }
  const response = await axios({
    url: "https://khbvwaqoymhdhgoiwtlf.supabase.co/functions/v1/lc-query",
    method: "post",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + process.env.SUPABASE_ANON_KEY,
    },
    data: {
      // query: dailyLCQuery,
    },
  });

  //save to cache for 24 hours
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

  await redis.set("daily-lcq", msg, "EX", 86400);
  return msg;
};

// Store thread IDs for each chat
const chatThreadMap = {};
let chatIdCronStatusMap = {};
let lcQuestionCronJob;
let cacheClearCronJob;

// Command to start cron job
bot.onText(/\/startLC/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;

  // Store the thread ID for this chat
  chatThreadMap[chatId] = msgThreadId;

  if (chatIdCronStatusMap[chatId]) {
    bot.sendMessage(chatId, `Daily LC schedule already started.`, {
      message_thread_id: msgThreadId,
    });
    return;
  }

  chatIdCronStatusMap[chatId] = true;
  const reply = `Starting daily LC schedule.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });

  console.log(`LC schedule activated for chatId: ${chatId}`);

  // Start the cron job if it's not already running
  if (!lcQuestionCronJob) {
    lcQuestionCronJob = cron.schedule(
      "01 8 * * *",
      async () => {
        try {
          await redis.del("daily-lcq");
          const lcQuestion = await getLCQuestion();
          console.log("Fetched LC question, sending to active chats");

          // Send to all chats with active status
          for (const [chatId, isActive] of Object.entries(
            chatIdCronStatusMap
          )) {
            if (isActive) {
              const threadId = chatThreadMap[chatId];
              console.log(
                `Sending LC question to chatId: ${chatId}, threadId: ${threadId}`
              );
              bot.sendMessage(chatId, lcQuestion, {
                message_thread_id: threadId,
                parse_mode: "Markdown",
              });
            }
          }
        } catch (error) {
          console.error("Error in LC question cron job:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Singapore",
      }
    );
    console.log("LC question cron job started");
  }
});

// Initialize the cache clear cron job separately
if (!cacheClearCronJob) {
  cacheClearCronJob = cron.schedule(
    "0 8 * * *",
    async () => {
      await redis.del("daily-lcq");
    },
    {
      scheduled: true,
      timezone: "Asia/Singapore",
    }
  );
}

// Command to end cron job
bot.onText(/\/stopLC/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;

  chatIdCronStatusMap[chatId] = false;
  const reply = `Stopping daily LC schedule for this chat.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });

  console.log(`Deactivated LC schedule for chatId: ${chatId}`);

  // Check if any chats are still active
  const anyActive = Object.values(chatIdCronStatusMap).some((status) => status);

  // If none are active, stop the job entirely
  if (!anyActive && lcQuestionCronJob) {
    lcQuestionCronJob.stop();
    lcQuestionCronJob = null;
    console.log("All chats inactive - stopped LC question cron job");
  }
});

// Check cron job schedule
bot.onText(/\/checkLC/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const reply = `Cron job status for ${chatId}: ${chatIdCronStatusMap[chatId]}`;
  console.log(reply);

  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });
});

// Command for public user to trigger daily LC question reply
bot.onText(/!lc/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);

  getLCQuestion()
    .then((result) => {
      console.log(result);
      const reply = `Hello ${namePart}! Here's today's question:\r\n\r\n${result}`;
      bot.sendMessage(chatId, reply, {
        message_thread_id: msgThreadId,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      });
    })
    .catch((error) => {
      console.error(error);
    });
});

// Help command to list available commands
bot.onText(/^[!/](cmd|help)\b/i, (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const msgThreadId = msg.message_thread_id;

  console.log("Help command triggered");

  bot.sendMessage(
    chatId,
    `Here are the available commands:

*General Commands:*
/bot <term> - Get definition or explanation for a term
/summarise or /summarize - Reply to a message to summarize its content
/lc - Get today's LeetCode daily question
/cmd or /cmd - Show this help message

*LeetCode Submission:*
#LCYYYYMMDD - Submit your LeetCode solution for the daily question (e.g., #LC20231027)
/LCTTYYYYMMDD - Submit a past LeetCode solution using a time travel token (e.g., #LCTT20231026)
/LCYYYYMMDD_trollme - Submit your LeetCode solution and get a troll quote (e.g., #LC20231027_trollme)

*Translation Control:*
/startTranslation - Enable automatic translation of non-English messages in this thread
/stopTranslation - Disable automatic translation of non-English messages in this thread

*Admin Commands (Restricted):*
/startLC - Start the daily LeetCode question posting schedule
/stopLC - Stop the daily LeetCode question posting schedule
/checkLC - Check the status of the daily LeetCode posting schedule
/startCensorship - Activate election content filter
/stopCensorship - Deactivate election content filter
/checkCensorship - Check status of election content filter`,
    {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
    }
  );
});

bot.on("message", (msg) => {
  // Check if the message is a new chat member or left chat member notification
  if (msg.new_chat_members || msg.left_chat_member) {
    bot.deleteMessage(msg.chat.id, msg.message_id).catch((err) => {
      console.error("Error deleting message:", err);
    });
  }
});

//function to stop translation for message_thread_id
bot.onText(/\/stopTranslation/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.add(msgThreadId);
  const reply = `Translation stopped for this thread.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

//remove thread from translation blacklist
bot.onText(/\/startTranslation/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.delete(msgThreadId);
  const reply = `Translation started for this thread.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

// hello function to test the bot
bot.onText(/\/hello/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.delete(msgThreadId);
  const reply = `Hello ${namePart}! 😊`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

// get t-bills info
bot.onText(/\/tbills/i, async (msg) => {
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;
  const namePart = getNameForReply(msg);
  translationBlackListThreadIds.delete(msgThreadId);

  try {
    const reply = await getTbillsMessage();
    console.log("[index.tbills] got tbills message:", reply);
    bot.sendMessage(chatId, reply, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.log("[index.tbills] error getting tbills", error);
    const tBiilsErrorMessage = getTBiilsErrorMessage();
    bot.sendMessage(chatId, tBiilsErrorMessage, {
      message_thread_id: msgThreadId,
      reply_to_message_id: messageId,
      parse_mode: "Markdown",
    });
  }
});
let chatIdTBillsCronStatusMap = [];
// Command to start cron job for T-Bills reminder
bot.onText(/\/startTbills/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  if (chatIdTBillsCronStatusMap[chatId]) {
    bot.sendMessage(chatId, `Daily T-Bills schedule already started.`, {
      message_thread_id: msgThreadId,
    });
    return;
  }
  const reply = `Starting daily T-Bills schedule.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });
  chatIdTBillsCronStatusMap[chatId] = true;
  console.log("Cron job has started");
  // Just for testing every 1 minute
  // cronJob = cron.schedule('* * * * *', () => {
  // Posts a daily T-Bills message at 8:00AM
  cronJob = cron.schedule(
    "0 8 * * *",
    // '* * * * *',
    () => {
      getTbillsMessage()
        .then((result) => {
          console.log(result);
          bot.sendMessage(chatId, result, {
            message_thread_id: msgThreadId,
            parse_mode: "Markdown",
          });
        })
        .catch((error) => {
          console.error(error);
        });
    },
    {
      scheduled: true,
      timezone: "Asia/Singapore",
    }
  );
});

// Check cron job schedule
bot.onText(/\/checkTbills/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const reply = `Cron job status for ${chatId}: ${chatIdTBillsCronStatusMap[chatId]}`;
  console.log(reply);

  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });
});

// Command to end cron job
bot.onText(/\/stopTbills/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const reply = `Stopping daily T-Bills schedule.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
  });
  chatIdTBillsCronStatusMap[chatId] = false;
  console.log("Cron job has been stopped");
  cronJob.stop();
});

// Election-related content filter
let chatIdCensorshipStatusMap = {};
let defaultCensorshipActive = false;
// Command to toggle election content filter
bot.onText(/\/startCensorship/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;

  chatIdCensorshipStatusMap[chatId] = true;
  const reply = `Election content filter activated for this chat.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });

  console.log(`Election content filter activated for chatId: ${chatId}`);
});

// Command to turn off election content filter
bot.onText(/\/stopCensorship/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;

  chatIdCensorshipStatusMap[chatId] = false;
  const reply = `Election content filter deactivated for this chat.`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });

  console.log(`Election content filter deactivated for chatId: ${chatId}`);
});

// Check censorship status
bot.onText(/\/checkCensorship/i, async (msg) => {
  if (!checkAdmin(msg)) {
    return;
  }
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const messageId = msg.message_id;

  const status =
    chatIdCensorshipStatusMap[chatId] === true
      ? "active"
      : chatIdCensorshipStatusMap[chatId] === false
      ? "inactive"
      : "not set";

  const reply = `Election content filter status for this chat: ${status}`;
  bot.sendMessage(chatId, reply, {
    message_thread_id: msgThreadId,
    reply_to_message_id: messageId,
  });
});

bot.on("message", async (msg) => {
  const messageId = msg.message_id;
  const messageContent = msg.text || msg.caption;
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const namePart = getNameForReply(msg);

  if (!messageContent) {
    return;
  }

  // Skip election check if censorship is explicitly disabled for this chat
  if (
    defaultCensorshipActive === false ||
    chatIdCensorshipStatusMap[chatId] === false
  ) {
    return;
  }

  // Check if the message is election-related
  const isElectionContent = await isElectionRelated(messageContent);

  if (isElectionContent) {
    console.log(`Election-related message detected: ${messageContent}`);

    // Delete the message
    bot
      .deleteMessage(chatId, messageId)
      .then(() => {
        console.log(`Deleted election-related message: ${messageId}`);

        // Send a notification about the deletion with the user tag
        bot.sendMessage(
          chatId,
          `${namePart}, your message was deleted as it contained election-related content.`,
          {
            message_thread_id: msgThreadId,
          }
        );
      })
      .catch((error) => {
        console.error(`Error deleting election-related message: ${error}`);
      });
  }
});

// Event listener for edited messages
bot.on("edited_message", async (msg) => {
  console.log("Message edited:", msg);
  const messageId = msg.message_id;
  const messageContent = msg.text || msg.caption;
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  const namePart = getNameForReply(msg);

  if (!messageContent) {
    return;
  }

  // Skip election check if censorship is explicitly disabled for this chat
  if (
    defaultCensorshipActive === false ||
    chatIdCensorshipStatusMap[chatId] === false
  ) {
    return;
  }

  // Check if the edited message is election-related
  const isElectionContent = await isElectionRelated(messageContent);

  if (isElectionContent) {
    console.log(
      `Election-related content detected in edited message: ${messageContent}`
    );

    // Delete the message
    bot
      .deleteMessage(chatId, messageId)
      .then(() => {
        console.log(`Deleted election-related edited message: ${messageId}`);

        // Send a notification about the deletion with the user tag
        bot.sendMessage(
          chatId,
          `${namePart}, your edited message was deleted as it contained election-related content.`,
          {
            message_thread_id: msgThreadId,
          }
        );
      })
      .catch((error) => {
        console.error(
          `Error deleting election-related edited message: ${error}`
        );
      });
  }
});

console.log("Bot started");
