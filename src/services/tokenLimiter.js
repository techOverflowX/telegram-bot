const { redis } = require("../config/database");
const { AI_QUOTA_LIMIT, AI_QUOTA_TTL } = require("../utils/constants");

/**
 * Token Limiter Service
 * Manages AI token quotas per Telegram chat using Redis with local cache
 */

// Local cache for quota checks (reduces Redis calls)
const quotaCache = new Map();
const CACHE_TTL = 30000; // 30 seconds in milliseconds

/**
 * Clear expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [chatId, cacheEntry] of quotaCache.entries()) {
    if (now - cacheEntry.cachedAt > CACHE_TTL) {
      quotaCache.delete(chatId);
    }
  }
}

// Cleanup cache every minute
setInterval(cleanupCache, 60000);

/**
 * Enable AI features for a chat
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<boolean>} - Success status
 */
async function enableAI(chatId) {
  try {
    await redis.set(`ai:enabled:${chatId}`, "1");
    // Invalidate cache when enabling AI
    quotaCache.delete(chatId);
    console.log(`[TokenLimiter] AI enabled for chat ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[TokenLimiter] Error enabling AI for chat ${chatId}:`, error);
    return false;
  }
}

/**
 * Disable AI features for a chat
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<boolean>} - Success status
 */
async function disableAI(chatId) {
  try {
    await redis.del(`ai:enabled:${chatId}`);
    await redis.del(`ai:tokens:${chatId}`);
    // Invalidate cache when disabling AI
    quotaCache.delete(chatId);
    console.log(`[TokenLimiter] AI disabled for chat ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[TokenLimiter] Error disabling AI for chat ${chatId}:`, error);
    return false;
  }
}

/**
 * Check if chat has AI enabled and quota available (with local cache)
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<{enabled: boolean, allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkQuota(chatId) {
  try {
    // Check local cache first
    const cached = quotaCache.get(chatId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      console.log(`[TokenLimiter] Using cached quota for chat ${chatId}`);
      return {
        enabled: cached.enabled,
        allowed: cached.allowed,
        remaining: cached.remaining,
        resetIn: cached.resetIn,
      };
    }

    // Cache miss or expired - check Redis
    const enabled = await redis.get(`ai:enabled:${chatId}`);
    if (enabled !== "1") {
      console.log(`[TokenLimiter] AI not enabled for chat ${chatId}`);
      const result = {
        enabled: false,
        allowed: false,
        remaining: 0,
        resetIn: 0,
      };
      // Cache the result
      quotaCache.set(chatId, { ...result, cachedAt: Date.now() });
      return result;
    }

    // Get current token usage
    const tokensUsed = parseInt((await redis.get(`ai:tokens:${chatId}`)) || "0");
    const remaining = Math.max(0, AI_QUOTA_LIMIT - tokensUsed);
    const allowed = tokensUsed < AI_QUOTA_LIMIT;

    // Get TTL for reset time
    const ttl = await redis.ttl(`ai:tokens:${chatId}`);
    const resetIn = ttl > 0 ? ttl : 0;

    console.log(
      `[TokenLimiter] Quota check for chat ${chatId}: used=${tokensUsed}, remaining=${remaining}, allowed=${allowed}, resetIn=${resetIn}s`
    );

    const result = {
      enabled: true,
      allowed,
      remaining,
      resetIn,
    };

    // Cache the result
    quotaCache.set(chatId, { ...result, cachedAt: Date.now() });

    return result;
  } catch (error) {
    console.error(`[TokenLimiter] Error checking quota for chat ${chatId}:`, error);
    // Fail closed: deny access on error
    return {
      enabled: false,
      allowed: false,
      remaining: 0,
      resetIn: 0,
    };
  }
}

/**
 * Consume tokens for a chat (atomic operation)
 * @param {string} chatId - Telegram chat ID
 * @param {number} tokenCount - Number of tokens to consume
 * @returns {Promise<{success: boolean, newTotal: number}>}
 */
async function consumeTokens(chatId, tokenCount) {
  try {
    // Atomic increment
    const newTotal = await redis.incrby(`ai:tokens:${chatId}`, tokenCount);

    // Set TTL if not already set (first token consumption)
    const ttl = await redis.ttl(`ai:tokens:${chatId}`);
    if (ttl === -1) {
      // No TTL set, set it now
      await redis.expire(`ai:tokens:${chatId}`, AI_QUOTA_TTL);
      console.log(`[TokenLimiter] Set TTL for chat ${chatId}: ${AI_QUOTA_TTL}s`);
    }

    // Invalidate cache after token consumption
    quotaCache.delete(chatId);
    console.log(`[TokenLimiter] Cache invalidated for chat ${chatId}`);

    console.log(
      `[TokenLimiter] Consumed ${tokenCount} tokens for chat ${chatId}. New total: ${newTotal}`
    );

    return {
      success: true,
      newTotal,
    };
  } catch (error) {
    console.error(`[TokenLimiter] Error consuming tokens for chat ${chatId}:`, error);
    return {
      success: false,
      newTotal: 0,
    };
  }
}

/**
 * Get full status for a chat (for /check-ai command)
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<{enabled: boolean, tokensUsed: number, tokensRemaining: number, quotaLimit: number, resetIn: number}>}
 */
async function getStatus(chatId) {
  try {
    // Check if AI is enabled
    const enabled = await redis.get(`ai:enabled:${chatId}`);
    if (enabled !== "1") {
      return {
        enabled: false,
        tokensUsed: 0,
        tokensRemaining: 0,
        quotaLimit: AI_QUOTA_LIMIT,
        resetIn: 0,
      };
    }

    // Get current token usage
    const tokensUsed = parseInt((await redis.get(`ai:tokens:${chatId}`)) || "0");
    const tokensRemaining = Math.max(0, AI_QUOTA_LIMIT - tokensUsed);

    // Get TTL for reset time
    const ttl = await redis.ttl(`ai:tokens:${chatId}`);
    const resetIn = ttl > 0 ? ttl : 0;

    return {
      enabled: true,
      tokensUsed,
      tokensRemaining,
      quotaLimit: AI_QUOTA_LIMIT,
      resetIn,
    };
  } catch (error) {
    console.error(`[TokenLimiter] Error getting status for chat ${chatId}:`, error);
    return {
      enabled: false,
      tokensUsed: 0,
      tokensRemaining: 0,
      quotaLimit: AI_QUOTA_LIMIT,
      resetIn: 0,
    };
  }
}

/**
 * Format time remaining in human-readable format
 * @param {number} seconds - Seconds remaining
 * @returns {string} - Formatted string (e.g., "3h 45m")
 */
function formatTimeRemaining(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return "< 1m";
  }
}

module.exports = {
  enableAI,
  disableAI,
  checkQuota,
  consumeTokens,
  getStatus,
  formatTimeRemaining,
};
