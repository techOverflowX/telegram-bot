// Test script for demonstrating the SQLite caching system
const { testCacheSystem } = require("./coolingDay");

// Run the cache system test
testCacheSystem()
  .then(() => {
    console.log("Test completed successfully");
    // Allow some time for the database to close properly
    setTimeout(() => process.exit(0), 500);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
