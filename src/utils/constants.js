// Admin usernames (case sensitive)
const ADMINS = [
  "Hahaashton",
  "Mr_Marcia_Ong", 
  "n1ds4n",
  "zdeykid",
  "Ngelean",
  "chingchonglingling",
];

// External API URLs
const TERMS_URL = "https://paradite.github.io/16x-bot/terms.json";
const TROLL_CONFUCIUS_QUOTE_URL = "https://raw.githubusercontent.com/techOverflowX/telegram-bot/be46e746899dcd85792494d5df238c49680f812f/docs/troll_confucius.json";
const DIN_BOT_URL = "https://asia-southeast1-free-jobs-253208.cloudfunctions.net/din";

// Translation constants
const RECURSIVE_MARKER = "Auto-translation";
const IGNORE_WORDS = ["haha", "ha ha", "lmao", "@"];
const LANGUAGE_CONFIDENCE_THRESHOLD = 0.85;

// Time constants
const SGT_TIMEZONE = "Asia/Singapore";

module.exports = {
  ADMINS,
  TERMS_URL,
  TROLL_CONFUCIUS_QUOTE_URL,
  DIN_BOT_URL,
  RECURSIVE_MARKER,
  IGNORE_WORDS,
  LANGUAGE_CONFIDENCE_THRESHOLD,
  SGT_TIMEZONE
};