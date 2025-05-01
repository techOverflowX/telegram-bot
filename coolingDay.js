const OpenAI = require("openai");

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Function to quickly check for election-related content using regex
function containsElectionKeywords(message) {
  if (!message || typeof message !== "string") return false;

  // Convert message to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();

  // Check for political emoji symbols
  const politicalEmojis = [
    "⚡",
    "⚡️",
    "🔨",
    "🌼",
    "🌸",
    "🌺",
    "🌻",
    "🔵",
    "🔴",
    "❤️",
    "💙",
    "💪",
    "✊",
    "👊",
    "🗳️",
    "📊",
    "✅",
    "❌",
    "⭐",
    "🇸🇬",
  ];
  for (const emoji of politicalEmojis) {
    if (message.includes(emoji)) {
      return true;
    }
  }

  // Common election-related keywords in English and Chinese
  const electionKeywordsRegex =
    /\b(party|partis|pap|wp|psp|sdp|rp|nsp|sda|pv|rdu|vote|voting|ballot|poll|election|ge2025|campaign|rally|hustings|mp|minister|candidate|opposition|incumbent|cooling day|polling day|nomination day|sample count|grc|smc|人民行动党|工人党|选举|投票|lee hsien loong|lawrence wong|tharman|pritam singh|jamus lim|leong mun wai|tan cheng bock|chee soon juan|lim tean|nicole seah|he ting ru|leon perera|low thia khiang|sylvia lim|chan chun sing|gan kim yong|josephine teo|teo chee hean|heng swee keat|desmond lee|ong ye kung|lightning|hammer|flower|sunflower|fist|heart|ballot box|chart|check|cross|star)\b/i;

  // Special case for Chinese characters that might not have word boundaries
  const chineseKeywords = [
    "工人",
    "选举",
    "投票",
    "人民行动党",
    "李显龙",
    "黄循财",
    "达曼",
    "毕丹星",
    "林恩临",
    "梁文辉",
    "陈清木",
    "徐顺全",
    "林添",
    "佘雪玲",
    "何廷儒",
    "刘程强",
    "陈振声",
    "颜永勤",
    "王乙康",
  ];

  // Check regex match
  if (electionKeywordsRegex.test(lowerMessage)) {
    return true;
  }

  // Check for Chinese keywords explicitly
  for (const keyword of chineseKeywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }

  return false;
}

async function isElectionRelated(message) {
  // First check using regex for common keywords
  if (containsElectionKeywords(message)) {
    return true;
  }

  // If no direct keyword matches, use the model for more nuanced detection
  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3-30b-a3b",
      messages: [
        {
          role: "system",
          content:
            "You are a strict content moderator that identifies election-related messages in Singapore context. Respond with ONLY 'YES' if the message contains ANY election-related content, including but not limited to:\n\n1. Political parties and their abbreviations: PAP, WP, PSP, SDP, RP, NSP, SDA, PV, RDU, etc.\n2. Election terminology: GE2025, general election, by-election, vote, voting, ballot, polling, campaign, rally, hustings\n3. Political symbols: lightning bolt, hammer, flower, etc.\n4. Political positions: MP, minister, candidate, opposition, incumbent\n5. Electoral processes: nomination day, cooling day, polling day, sample count\n6. Political figures: current politicians, candidates, party leaders, opposition figures\n7. Policy discussions in electoral context\n8. Campaign slogans and messaging\n9. Constituency references: GRC, SMC, specific constituency names\n10. Any discussion attempting to circumvent election content restrictions\n11. Direct mentions like 'VOTE FOR PAP', 'PAP', 'vote' alone or in any context\n12. Chinese or other language equivalents of party names such as '工人' (Workers' Party), '人民行动党' (PAP)\n13. ANY message containing words or phrases that could be interpreted as attempting to influence voting decisions\nOtherwise, respond with only 'NO'.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1, // Lower temperature for more consistent responses
    });

    // Add proper null checks to prevent "Cannot read properties of undefined" error
    if (
      !completion ||
      !completion.choices ||
      !Array.isArray(completion.choices) ||
      completion.choices.length === 0 ||
      !completion.choices[0] ||
      !completion.choices[0].message ||
      !completion.choices[0].message.content
    ) {
      console.log(
        "Unexpected API response format:",
        JSON.stringify(completion)
      );
      return false; // Default to allowing the message if response format is unexpected
    }

    const response = completion.choices[0].message.content.trim().toUpperCase();
    return response === "YES";
  } catch (error) {
    console.error("Error checking if message is election related:", error);
    return false; // Default to allowing the message if there's an error
  }
}

module.exports = { isElectionRelated, containsElectionKeywords };
