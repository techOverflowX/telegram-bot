const OpenAI = require("openai");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

// Initialize SQLite database
const db = new sqlite3.Database("./election_messages.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the election_messages database.");
    // Create table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS election_messages (
      message_hash TEXT PRIMARY KEY,
      flagged BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
        } else {
          // Clean up non-flagged messages on startup
          clearNonFlaggedMessages();
        }
      }
    );
  }
});

// Function to clear all non-flagged messages from the database
function clearNonFlaggedMessages() {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM election_messages WHERE flagged = 0", function (err) {
      if (err) {
        console.error("Error clearing non-flagged messages:", err.message);
        reject(err);
      } else {
        console.log(
          `Cleared ${this.changes} non-flagged messages from database.`
        );
        resolve(this.changes);
      }
    });
  });
}

// Function to hash a message for database storage
function hashMessage(message) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

// Function to check if a message is in the database
function checkMessageInDatabase(message) {
  return new Promise((resolve, reject) => {
    const messageHash = hashMessage(message);
    db.get(
      "SELECT flagged FROM election_messages WHERE message_hash = ?",
      [messageHash],
      (err, row) => {
        if (err) {
          console.error("Database lookup error:", err.message);
          resolve(null); // Return null on error, forcing fresh check
        } else {
          resolve(row); // Will be undefined if not found
        }
      }
    );
  });
}

// Function to add a message to the database
function addMessageToDatabase(message, isFlagged) {
  return new Promise((resolve, reject) => {
    const messageHash = hashMessage(message);
    db.run(
      "INSERT OR REPLACE INTO election_messages (message_hash, flagged) VALUES (?, ?)",
      [messageHash, isFlagged ? 1 : 0],
      function (err) {
        if (err) {
          console.error("Error saving to database:", err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Track recent messages to detect sequential character messages
const recentMessagesMap = new Map(); // userId -> { messages: string[], timestamp: number }

// Function to track and detect sequential character messages
function checkSequentialCharacters(userId, messageText) {
  const now = Date.now();

  // Initialize or get user data
  if (!recentMessagesMap.has(userId)) {
    recentMessagesMap.set(userId, { messages: [], timestamp: now });
  }

  const userData = recentMessagesMap.get(userId);

  // If more than 5 minutes passed since last message, reset the tracking
  // Using longer timeout to catch attempts with intentional delays
  if (now - userData.timestamp > 300000) {
    userData.messages = [];
  }

  // Update timestamp
  userData.timestamp = now;

  // If message is a short text (up to 3 characters), add to tracked messages
  if (messageText.trim().length <= 3) {
    userData.messages.push(messageText.trim().toLowerCase()); // Convert to lowercase for case-insensitive matching

    // Keep only last 30 messages to detect longer attempts
    if (userData.messages.length > 30) {
      userData.messages.shift();
    }

    // Combine the recent messages with and without spaces to check different patterns
    const combinedMessage = userData.messages.join("");
    const combinedWithSpaces = userData.messages.join(" ");

    // Check both versions
    if (
      containsElectionKeywords(combinedMessage) ||
      containsElectionKeywords(combinedWithSpaces)
    ) {
      return true;
    }

    // Also check for partial matches to catch incomplete attempts
    const politicalPhrases = [
      // Lowercase variants
      "vote",
      "pap",
      "wp",
      "psp",
      "sdp",
      "votefor",
      "votepap",
      "votewp",
      "election",
      "cooling",
      "polling",
      "nomination",
      "rally",
      "minister",
      "candidate",
      "campaign",
      "ballot",
      "party",
      // Uppercase variants
      "VOTE",
      "PAP",
      "WP",
      "PSP",
      "SDP",
      "VOTEFOR",
      "VOTEPAP",
      "VOTEWP",
      "ELECTION",
      "COOLING",
      "POLLING",
      "NOMINATION",
      "RALLY",
      "MINISTER",
      "CANDIDATE",
      "CAMPAIGN",
      "BALLOT",
      "PARTY",
      // Mixed case variants
      "Vote",
      "Pap",
      "VotePap",
      "VoteFor",
      "GE2025",
    ];
    for (const phrase of politicalPhrases) {
      // Check in the combined message without spaces
      if (combinedMessage.includes(phrase.toLowerCase())) {
        return true;
      }

      // Also check the original case version in the raw combined content
      const rawCombined = userData.messages.join("");
      if (rawCombined.includes(phrase)) {
        return true;
      }
    }
  } else {
    // For longer messages, check the current message but don't reset tracking
    // This allows detection even if some normal messages are interspersed
  }

  return false;
}

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

  // Check for acrostic messages (where first letters of lines spell out political messages)
  function checkForAcrosticMessages(text) {
    // Split the message into lines
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    // Need at least 3 lines to form a meaningful acrostic
    if (lines.length >= 3) {
      // Extract first letter of each line
      const firstLetters = lines
        .map((line) => {
          const trimmedLine = line.trim();
          return trimmedLine.length > 0 ? trimmedLine[0].toUpperCase() : "";
        })
        .join("");

      // Check against known political acrostics or partial matches
      const politicalAcrostics = [
        "VOTE",
        "PAP",
        "WP",
        "PSP",
        "SDP",
        "VOTEFOR",
        "VOTEPAP",
        "VOTEWP",
      ];

      for (const acrostic of politicalAcrostics) {
        if (firstLetters.includes(acrostic)) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if the message contains acrostic messages
  if (checkForAcrosticMessages(message)) {
    return true;
  }

  // Common election-related keywords in English and Chinese
  const electionKeywordsRegex =
    /\b(party|partis|pap|wp|psp|sdp|rp|nsp|sda|pv|rdu|vote|voting|ballot|poll|election|ge2025|campaign|rally|hustings|mp|minister|candidate|opposition|incumbent|cooling day|polling day|nomination day|sample count|grc|smc|人民行动党|工人党|选举|投票|lee hsien loong|lawrence wong|tharman|pritam singh|jamus lim|leong mun wai|tan cheng bock|chee soon juan|lim tean|nicole seah|he ting ru|leon perera|low thia khiang|sylvia lim|chan chun sing|gan kim yong|josephine teo|teo chee hean|heng swee keat|desmond lee|ong ye kung|lightning|hammer|flower|sunflower|fist|heart|ballot box|chart|check|cross|star|alternative voices?|real leaders?|working on the ground|confidence to govern|steering|ship|years of leadership|ruling party)\b/i;

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

// Check for common election messaging patterns without explicit keywords
function checkElectionMessagingPatterns(message) {
  if (!message || typeof message !== "string") return false;

  const lowerMessage = message.toLowerCase();

  // Check for phrases about "alternative voices" and their impact
  if (/what can alternative voices? do/.test(lowerMessage)) return true;

  // Check for phrases about "real leaders working on the ground"
  if (/real leaders|working on the ground/.test(lowerMessage)) return true;

  // Check for phrases about "giving confidence" to teams/governments
  if (/give.*strong confidence|confidence to govern/.test(lowerMessage))
    return true;

  // Check for references to long-term governance/leadership
  if (/team that has been steering|past \d+ years/.test(lowerMessage))
    return true;

  // Check for phrases about "ruling party" or implied references
  if (/ruling party|been governing|been leading/.test(lowerMessage))
    return true;

  // Check for stability rhetoric
  if (/stability|uncertain times|not experiments/.test(lowerMessage))
    return true;

  // Check for "winning formula" rhetoric
  if (/winning formula|proven track|proven record/.test(lowerMessage))
    return true;

  // Check for "checks and balances" rhetoric
  if (/checks and balances|accountability|more voices/.test(lowerMessage))
    return true;

  // Check for "fresh perspectives" rhetoric
  if (
    /fresh perspectives|new approach|new leadership|time for change/.test(
      lowerMessage
    )
  )
    return true;

  // Check for "our country needs" rhetoric
  if (
    /our country needs|singapore needs|we need|what we need is/.test(
      lowerMessage
    ) &&
    /leadership|governance|direction|future|progress|change|continuity/.test(
      lowerMessage
    )
  )
    return true;

  // Check for vague references to political entities
  if (
    /the other side|the blues|the reds|men in white|opposition|ruling|governing/.test(
      lowerMessage
    )
  )
    return true;

  return false;
}

// Function to detect ASCII art patterns
function containsASCIIArt(message) {
  if (!message || typeof message !== "string") return false;

  // Check for multi-line content with patterns typical of ASCII art
  const lines = message.split("\n");

  // If message has multiple lines and contains characters commonly used in ASCII art
  if (lines.length >= 3) {
    // Count lines with special characters used in ASCII art
    const asciiArtChars = /[\/\\|_\-+=<>^*()[\]{}]/;
    const linesWithArtChars = lines.filter((line) =>
      asciiArtChars.test(line)
    ).length;

    // If more than 50% of lines contain ASCII art characters, it's likely ASCII art
    if (linesWithArtChars >= lines.length * 0.5) {
      return true;
    }
  }

  // Check for patterns commonly used in single-line ASCII art
  const singleLineArtPatterns = [
    /\/---\//, // Lightning patterns
    /\/__ ?</, // Hammer patterns
    /[\/\\]{2,}[_\-=]{2,}/, // Common ASCII art segments
    /[<>]{2,}[_\-=]{2,}/, // Arrow-like patterns
    /\(\s*[_\-=]{2,}\s*\)/, // Parenthesis with lines
    /\[\s*[_\-=]{2,}\s*\]/, // Brackets with lines
    /\|\s*[_\-=]{2,}\s*\|/, // Vertical bars with lines
  ];

  for (const pattern of singleLineArtPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }

  return false;
}

async function isElectionRelated(message, userId = null) {
  // First check cache to avoid redundant processing
  const cachedResult = await checkMessageInDatabase(message);
  if (cachedResult !== null && cachedResult !== undefined) {
    console.log("Cache hit for message:", message);
    return cachedResult.flagged === 1;
  }

  // Check for ASCII art
  if (containsASCIIArt(message)) {
    // Cache the result and return
    await addMessageToDatabase(message, true);
    return true;
  }

  // Check for sequential character messages if userId is provided
  if (userId && checkSequentialCharacters(userId, message)) {
    // Cache the result and return
    await addMessageToDatabase(message, true);
    return true;
  }

  // First check using regex for common keywords
  if (
    containsElectionKeywords(message) ||
    checkElectionMessagingPatterns(message)
  ) {
    // Cache the result and return
    await addMessageToDatabase(message, true);
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
            "You are a strict content moderator that identifies election-related messages in Singapore context. Respond with ONLY 'YES' if the message contains ANY election-related content, including but not limited to:\n\n1. Political parties and their abbreviations: PAP, WP, PSP, SDP, RP, NSP, SDA, PV, RDU, etc.\n2. Election terminology: GE2025, 2025GE, GE, faction, general election, by-election, vote, voting, ballot, polling, campaign, rally, hustings\n3. Political symbols: lightning bolt, hammer, flower, etc.\n4. Political positions: MP, minister, candidate, opposition, incumbent\n5. Electoral processes: nomination day, cooling day, polling day, sample count\n6. Political figures: current politicians, candidates, party leaders, opposition figures\n7. Policy discussions in electoral context\n8. Campaign slogans and messaging\n9. Constituency references: GRC, SMC, specific constituency names\n10. Any discussion attempting to circumvent election content restrictions\n11. Direct mentions like 'VOTE FOR PAP', 'PAP', 'vote' alone or in any context\n12. Chinese or other language equivalents of party names such as '工人' (Workers' Party), '人民行动党' (PAP)\n13. ANY message containing words or phrases or acrostic messages that could be interpreted as attempting to influence voting decisions\n14. References to 'alternative voices' and their capabilities or limitations\n15. Messages about leaders 'working on the ground' or implying competence comparisons\n16. References to giving 'confidence' to teams/governments or mandates\n17. Mentions of teams that have been governing/steering the country for any number of years\n18. Rhetoric about stability, experience, or track records in a way that could influence voting\n19. Implied criticisms of opposition parties or ruling parties without naming them directly\n20. Suggestions about what voters 'need' to do or what the country 'needs' politically\nOtherwise, respond with only 'NO'.",
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
      // Don't cache failed checks
      return false; // Default to allowing the message if response format is unexpected
    }

    const response = completion.choices[0].message.content.trim().toUpperCase();
    const isFlagged = response === "YES";

    // Cache the result
    await addMessageToDatabase(message, isFlagged);

    return isFlagged;
  } catch (error) {
    console.error("Error checking if message is election related:", error);
    return false; // Default to allowing the message if there's an error
  }
}

// Add test function at the end of the file, before the module.exports
async function testSubtleElectionMessages() {
  const testMessages = [
    "what can alternative voices do? other than creating noises that detract the real leaders from working on the ground",
    "we need to give our best team a strong confidence to govern",
    "the team that has been steering our only ship for the past 60 years",
    "The country needs stability during uncertain times, not experiments",
    "Let's not change the winning formula now",
    "We need checks and balances in our system",
    "Time for some fresh perspectives in management",
  ];

  console.log("Testing subtle election messages detection...");
  for (const msg of testMessages) {
    console.log(`Message: "${msg}"`);
    console.log(
      `Regex detection: ${containsElectionKeywords(msg) ? "YES" : "NO"}`
    );
    console.log(
      `Pattern detection: ${checkElectionMessagingPatterns(msg) ? "YES" : "NO"}`
    );
    console.log(
      `AI detection: ${(await isElectionRelated(msg)) ? "YES" : "NO"}`
    );
    console.log("---");
  }
}

// Function to get database statistics
function getCacheStats() {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as total, SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) as flagged FROM election_messages",
      [],
      (err, row) => {
        if (err) {
          console.error("Error getting cache stats:", err.message);
          reject(err);
        } else {
          resolve({
            totalCached: row.total,
            flaggedMessages: row.flagged,
            notFlaggedMessages: row.total - row.flagged,
          });
        }
      }
    );
  });
}

// Clean up database connection when process exits
process.on("exit", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
});

// Add test function for cache system
async function testCacheSystem() {
  console.log("Testing election message caching system...");

  // Test messages that should be flagged
  const testMessages = [
    "Remember to vote for your favorite candidate!",
    "The upcoming election is important for our future",
    "PAP has been in power for decades",
  ];

  // First run - should use AI for detection and cache results
  console.log("\n=== First Run (No Cache) ===");
  for (const msg of testMessages) {
    console.time(`First check: "${msg.substring(0, 20)}..."`);
    const isElection = await isElectionRelated(msg);
    console.timeEnd(`First check: "${msg.substring(0, 20)}..."`);
    console.log(
      `Message "${msg.substring(0, 20)}..." - Flagged: ${
        isElection ? "YES" : "NO"
      }`
    );
  }

  // Cache stats after first run
  const statsAfterFirstRun = await getCacheStats();
  console.log("\nCache stats after first run:", statsAfterFirstRun);

  // Second run - should use cache
  console.log("\n=== Second Run (Using Cache) ===");
  for (const msg of testMessages) {
    console.time(`Second check: "${msg.substring(0, 20)}..."`);
    const isElection = await isElectionRelated(msg);
    console.timeEnd(`Second check: "${msg.substring(0, 20)}..."`);
    console.log(
      `Message "${msg.substring(0, 20)}..." - Flagged: ${
        isElection ? "YES" : "NO"
      }`
    );
  }

  console.log("\nCache demonstration complete!");
}

// Add test function for ASCII art detection
async function testASCIIArtDetection() {
  console.log("Testing ASCII art detection...");

  const testCases = [
    // Should detect as ASCII art
    {
      message: `/---/
  /   /
 /   /
/__ <
  /  /
 / /
//`,
      expected: true,
      description: "Lightning/hammer pattern",
    },
    {
      message: `   /\\
  /  \\
 /    \\
/______\\`,
      expected: true,
      description: "Triangle/house",
    },
    {
      message: `+-----+
|     |
+-----+`,
      expected: true,
      description: "Box",
    },
    {
      message: `>>------>`,
      expected: true,
      description: "Arrow",
    },
    // Should not detect as ASCII art
    {
      message: "This is a normal message without ASCII art.",
      expected: false,
      description: "Normal text",
    },
    {
      message: "I use / and \\ in regular text sometimes.",
      expected: false,
      description: "Text with some special chars",
    },
    {
      message: "Check out example.com/path/to/file.js",
      expected: false,
      description: "URL with slashes",
    },
  ];

  for (const testCase of testCases) {
    const result = containsASCIIArt(testCase.message);
    console.log(`Test: ${testCase.description}`);
    console.log(
      `Input: ${
        testCase.message.length > 50
          ? testCase.message.substring(0, 50) + "..."
          : testCase.message
      }`
    );
    console.log(`Expected: ${testCase.expected}, Actual: ${result}`);
    console.log(`Result: ${result === testCase.expected ? "PASS" : "FAIL"}`);
    console.log("---");
  }
}

// Uncomment to run tests
// testSubtleElectionMessages();
// testCacheSystem();
// testASCIIArtDetection();

module.exports = {
  isElectionRelated,
  containsElectionKeywords,
  checkSequentialCharacters,
  containsASCIIArt,
  // Export test functions
  testSubtleElectionMessages,
  testCacheSystem,
  testASCIIArtDetection,
  // Export cache functions
  getCacheStats,
  clearNonFlaggedMessages,
};
