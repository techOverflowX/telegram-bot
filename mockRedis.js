// mockRedis.js
const redis = {
    get: async (key) => {
      // Return null or a predefined value for testing
      return null; // or a test value
    },
    set: async (key, value, exp) => {
      // Mock set functionality
      console.log(`Mock set: ${key} = ${value}`);
    },
    del: async (key) => {
      // Mock delete functionality
      console.log(`Mock delete: ${key}`);
    },
  };
  
  module.exports = redis;
  