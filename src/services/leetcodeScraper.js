const puppeteer = require("puppeteer");

async function scrapeDailyLCQuestion() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto("https://leetcode.com/problemset/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // The daily question link contains "envType=daily-question" in the href
    await page.waitForSelector('a[href*="daily-question"]', {
      timeout: 15000,
    });

    const dailyQuestion = await page.evaluate(() => {
      const linkEl = document.querySelector('a[href*="daily-question"]');
      if (!linkEl) return null;

      const href = linkEl.getAttribute("href");

      // Title is inside a div with class "ellipsis line-clamp-1"
      const titleEl = linkEl.querySelector(".line-clamp-1");
      const titleText = titleEl ? titleEl.textContent.trim() : "";

      // Difficulty is in a <p> element with class containing "text-sd-easy/medium/hard"
      const diffEl =
        linkEl.querySelector("[class*='text-sd-easy']") ||
        linkEl.querySelector("[class*='text-sd-medium']") ||
        linkEl.querySelector("[class*='text-sd-hard']");
      const diffText = diffEl ? diffEl.textContent.trim() : "";

      return { titleText, href, diffText };
    });

    if (!dailyQuestion) {
      throw new Error("Could not find the daily question on the page");
    }

    const { titleText, href, diffText } = dailyQuestion;

    // Strip the problem number prefix (e.g. "3713. ") from the title
    const title = titleText.replace(/^\d+\.\s*/, "");

    // Build clean link (just the problem path, no query params)
    const slug = href.split("?")[0].replace(/\/$/, "");
    const link = "https://leetcode.com" + slug + "/";

    // Normalize abbreviated difficulty text
    const diffMap = { Easy: "Easy", "Med.": "Medium", Hard: "Hard" };
    const difficulty = diffMap[diffText] || diffText;

    // Get today's date in YYYY-MM-DD format (SGT)
    const date = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })
      .replace(/\//g, "-");

    let diffIndicator = "";
    if (difficulty === "Easy") {
      diffIndicator = "\u{1F7E9}";
    } else if (difficulty === "Medium") {
      diffIndicator = "\u{1F7E8}";
    } else if (difficulty === "Hard") {
      diffIndicator = "\u{1F7E5}";
    }

    const msg = `*\u{1F468}\u200D\u{1F4BB}LC Daily Question\u{1F469}\u200D\u{1F4BB}*\r\n*Date:* ${date}\r\n*Title: *${title}\r\n*Difficulty:* ${difficulty} ${diffIndicator}\r\n${link}`;

    return msg;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  scrapeDailyLCQuestion()
    .then((msg) => console.log(msg))
    .catch((err) => console.error("Scraper failed:", err));
}

module.exports = { scrapeDailyLCQuestion };
