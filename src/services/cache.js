const { redis } = require("../config/database");

/**
 * Cache service for Redis operations
 */
class CacheService {
  /**
   * Get value from cache
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async get(key) {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }

  /**
   * Set value in cache with optional expiration
   * @param {string} key 
   * @param {string} value 
   * @param {number} expireSeconds - Optional expiration in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, expireSeconds = null) {
    try {
      if (expireSeconds) {
        await redis.setex(key, expireSeconds, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error("Redis set error:", error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error("Redis del error:", error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   * @param {string} key 
   * @param {number} seconds 
   * @returns {Promise<boolean>}
   */
  async expire(key, seconds) {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error("Redis expire error:", error);
      return false;
    }
  }
}

module.exports = new CacheService();