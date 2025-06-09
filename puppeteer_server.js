
const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "Puppeteer Server Running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Main scraping endpoint
app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing url parameter" 
    });
  }

  let browser;
  try {
    // Launch browser with production-ready options
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: "new",
      executablePath: puppeteer.executablePath()
    });

    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate to URL with timeout
    await page.goto(url, { 
      waitUntil: "domcontentloaded", 
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Get page content
    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract data with improved regex patterns
    const emails = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    const phones = content.match(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];
    
    // Extract clean text
    const text = $("body")
      .find("script, style, nav, footer, header")
      .remove()
      .end()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Extract links with better filtering
    const links = [];
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const linkText = $(el).text().trim();
      if (href && linkText && href.startsWith('http')) {
        links.push({ href, text: linkText.substring(0, 100) });
      }
    });

    // Extract meta information
    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";

    await browser.close();

    res.json({
      success: true,
      url: url,
      extractedData: {
        title,
        description,
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        text: text.substring(0, 10000),
        links: links.slice(0, 50),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    console.error("Scrape error:", error);
    res.status(500).json({
      success: false,
      error: "Scraping failed",
      details: error.message,
      url: url
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Puppeteer server is running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});
