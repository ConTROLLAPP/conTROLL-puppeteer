const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Handle JSON POST requests with size limit
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ 
    status: 'Puppeteer Server Running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Handle both GET and POST requests for /scrape endpoint
app.get('/scrape', handleScrapeRequest);
app.post('/scrape', handleScrapeRequest);

// Additional fallback routes for common variations
app.get('/api/scrape', handleScrapeRequest);
app.post('/api/scrape', handleScrapeRequest);

// Catch-all error handler for unmatched routes
app.use((req, res, next) => {
  console.log(`⚠️ Unhandled route: ${req.method} ${req.path}`);
  if (req.path === '/scrape' || req.path.includes('/scrape')) {
    console.log('🔄 Fallback handler triggered for /scrape');
    return handleScrapeRequest(req, res);
  }
  res.status(404).json({ 
    success: false, 
    error: `Route not found: ${req.method} ${req.path}`,
    available_endpoints: ['/scrape (GET/POST)', '/api/scrape (GET/POST)', '/ (GET)']
  });
});

async function handleScrapeRequest(req, res) {
  console.log(`📡 ${req.method} request to ${req.path}`);
  console.log(`📋 Query params:`, req.query);
  console.log(`📋 Body:`, req.body);

  // Handle both GET (query params) and POST (JSON body) requests
  let url, waitFor, extractReviews, extractContacts, mode;

  if (req.method === 'GET') {
    url = req.query.url;
    waitFor = parseInt(req.query.waitFor) || 3000;
    extractReviews = req.query.extractReviews === 'true';
    extractContacts = req.query.extractContacts === 'true';
    mode = req.query.mode || 'basic';
  } else {
    // POST request with JSON body
    url = req.body?.url;
    waitFor = req.body?.waitFor || 3000;
    extractReviews = req.body?.extractReviews || false;
    extractContacts = req.body?.extractContacts || false;
    mode = req.body?.mode || 'basic';
  }

  if (!url) {
    console.log(`❌ Missing URL parameter`);
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  console.log(`🌐 Scraping: ${url}`);

  try {
    const browser = await puppeteer.launch({ 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--window-size=1920x1080'
      ],
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();

    // Set a reasonable user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });

    // Wait for additional time if specified
    if (waitFor > 0) {
      await page.waitForTimeout(waitFor);
    }

    const content = await page.content();
    const $ = cheerio.load(content);

    // Enhanced extraction
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones = content.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const links = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim();
      if (href) links.push({ href, text: linkText });
    });

    await browser.close();

    const result = {
      success: true,
      html: content,
      content: content, // Add content alias for compatibility
      extractedData: {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        text: text.slice(0, 5000),
        links
      },
      timestamp: new Date().toISOString(),
      method: 'puppeteer',
      url: url
    };

    console.log(`✅ Scraped successfully: ${emails.length} emails, ${phones.length} phones`);
    res.json(result);

  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Scraping failed', 
      details: error.message 
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Puppeteer server is running on port ${PORT}`);
});
