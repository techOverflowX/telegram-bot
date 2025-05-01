const OpenAI = require("openai");

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    process.env.OPENROUTER_API_KEY ,
});

async function isElectionRelated(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3-4b:free",
      messages: [
        {
          role: "system",
          content:
            "You are a content moderator that detects election-related messages. Respond with only 'YES' if the message contains election-related content (including candidates, voting, campaigns, political parties, election processes, or policy debates related to elections). Singapore election key words are GE2025,PAP,WP,PSP,party ,vote, lighting, hammer. Otherwise, respond with only 'NO'.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1, // Lower temperature for more consistent responses
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
