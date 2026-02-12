const OpenAI = require("openai");
const { AI_MODEL } = require("../utils/constants");

/**
 * AI Service using GLM 4.7 via Z.AI
 * Uses OpenAI SDK with Z.AI's OpenAI-compatible endpoint
 */

// Initialize OpenAI client with Z.AI endpoint
const openai = new OpenAI({
  baseURL: "https://api.z.ai/api/paas/v4",
  apiKey: process.env.ZAI_API_KEY,
});

/**
 * Get technical term definition using AI
 * @param {string} term - The term to define
 * @param {string} userName - User name for personalization
 * @returns {Promise<{response: string|undefined, tokensUsed: number}>}
 */
async function getDefinition(term, userName) {
  console.log(`[AIService] Getting definition for term: "${term}" requested by ${userName}`);

  const systemPrompt = `You are a helpful technical assistant specializing in software engineering, computer science, and technology topics.
Your task is to provide clear, concise definitions of technical terms with practical examples when appropriate.

Guidelines:
- Keep definitions concise (2-4 sentences)
- Include practical context or examples when helpful
- Use simple language but maintain technical accuracy
- If the term has multiple meanings in tech, mention the most common one
- If you're unsure, say so honestly`;

  const userPrompt = `Define the term: ${term}`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    // Extract response and token usage
    const response = completion.choices?.[0]?.message?.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!response) {
      console.error("[AIService] No response content from AI");
      return { response: undefined, tokensUsed: 0 };
    }

    console.log(`[AIService] Definition generated successfully. Tokens used: ${tokensUsed}`);
    return { response, tokensUsed };
  } catch (error) {
    console.error("[AIService] Error getting definition:", error);
    console.error("[AIService] Error details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
    });
    return { response: undefined, tokensUsed: 0 };
  }
}

/**
 * Summarize text using AI
 * @param {string} text - The text to summarize
 * @param {string} userName - User name for personalization
 * @returns {Promise<{response: string|undefined, tokensUsed: number}>}
 */
async function summarizeText(text, userName) {
  console.log(`[AIService] Summarizing text for ${userName}. Text length: ${text.length} chars`);

  const systemPrompt = `You are a helpful assistant that creates concise summaries of messages and conversations.

Guidelines:
- Keep summaries brief (2-4 sentences)
- Focus on key points and main ideas
- Use clear, simple language
- Maintain the original context and tone
- If the text is already very short, provide a brief paraphrase`;

  const userPrompt = `Summarize the following text:\n\n${text}`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    // Extract response and token usage
    const response = completion.choices?.[0]?.message?.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!response) {
      console.error("[AIService] No response content from AI");
      return { response: undefined, tokensUsed: 0 };
    }

    console.log(`[AIService] Summary generated successfully. Tokens used: ${tokensUsed}`);
    return { response, tokensUsed };
  } catch (error) {
    console.error("[AIService] Error summarizing text:", error);
    console.error("[AIService] Error details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
    });
    return { response: undefined, tokensUsed: 0 };
  }
}

module.exports = {
  getDefinition,
  summarizeText,
};
