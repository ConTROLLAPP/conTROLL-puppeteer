const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    status: 'Puppeteer Server Running',
    timestamp: new Date().toISOString(),
    version: '1.0.1'
  });
});

app.get('/scrape', handleScrapeRequest);
app.post('/scrape', handleScrapeRequest);
app.get('/api/scrape', handleScrapeRequest);
app.post('/api/scrape', handleScrapeRequest);

app.use((req, res) => {
  console.log(`⚠️ Unhandled route: ${req.method} ${req.path}`);
  if (req.path.includes('/scrape')) {
    return handleScrapeRequest(req, res);
  }
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    available_endpoints: ['/scrape (GET/POST)', '/api/scrape (GET/POST)', '/ (GET)']
  });
});

async function handleScrapeRequest(req, res) {
  try {
    const method = req.method;
    const data = method === 'GET' ? req.query : req.body;

    const url = data.url;
    const waitFor = parseInt(data.waitFor) || 3000;
    const extractReviews = data.extractReviews === 'true' || data.extractReviews === true;
    const extractContacts = data.extractContacts === 'true' || data.extractContacts === true;

    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }

    console.log(`🌐 Starting scrape for: ${url}`);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--window-size=1920x1080'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (waitFor > 0) await page.waitForTimeout(waitFor);

    const html = await page.content();
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];

    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim();
      if (href) links.push({ href, text: linkText });
    });

    await browser.close();

    res.json({
      success: true,
      url,
      html,
      content: html,
      extractedData: {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        text: text.slice(0, 5000),
        links
      },
      timestamp: new Date().toISOString(),
      method: 'puppeteer'
    });

  } catch (error) {
    console.error
