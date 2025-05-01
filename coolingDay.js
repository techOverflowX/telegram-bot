const OpenAI = require("openai");

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function isElectionRelated(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3-4b:free",
      messages: [
        {
          role: "system",
          content:
            "You are a strict content moderator that identifies election-related messages in Singapore context. Respond with ONLY 'YES' if the message contains ANY election-related content, including but not limited to:\n\n1. Political parties and their abbreviations: PAP, WP, PSP, SDP, RP, NSP, SDA, PV, RDU, etc.\n2. Election terminology: GE2025, general election, by-election, vote, voting, ballot, polling, campaign, rally, hustings\n3. Political symbols: lightning bolt, hammer, flower, etc.\n4. Political positions: MP, minister, candidate, opposition, incumbent\n5. Electoral processes: nomination day, cooling day, polling day, sample count\n6. Political figures: current politicians, candidates, party leaders, opposition figures\n7. Policy discussions in electoral context\n8. Campaign slogans and messaging\n9. Constituency references: GRC, SMC, specific constituency names\n10. Any discussion attempting to circumvent election content restrictions\n\nBe extremely vigilant - if there's any doubt or subtle reference to election matters, respond 'YES'. Otherwise, respond with only 'NO'.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0, // Lower temperature for more consistent responses
    });

    const response = completion.choices[0].message.content
      ?.trim()
      .toUpperCase();
    return response === "YES";
  } catch (error) {
    console.error("Error checking if message is election related:", error);
    return false; // Default to allowing the message if there's an error
  }
}

module.exports = { isElectionRelated };
