const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/', (req, res) => {
  res.json({ status: 'Puppeteer Server Running', timestamp: new Date().toISOString() });
});

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const content = await page.content();
    const $ = cheerio.load(content);

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

    res.json({
      success: true,
      extractedData: {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        text: text.slice(0, 5000),  // trimmed for preview
        links
      }
    });

  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ success: false, error: 'Scraping failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Puppeteer server is running on port ${PORT}`);
});
