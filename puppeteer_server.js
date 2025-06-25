const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cheerio = require('cheerio');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Function to install Chrome if missing
async function ensureChromeInstalled() {
  try {
    // Try to find Chrome executable
    const chromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      process.env.CHROME_BIN,
      process.env.PUPPETEER_EXECUTABLE_PATH
    ].filter(Boolean);

    for (const path of chromePaths) {
      try {
        execSync(`test -f ${path}`, { stdio: 'ignore' });
        console.log(`✅ Chrome found at: ${path}`);
        process.env.PUPPETEER_EXECUTABLE_PATH = path;
        return path;
      } catch (e) {
        // Continue checking
      }
    }

    console.log('⚠️ Chrome not found, attempting installation...');
    
    // Install Chrome on Linux (Render-compatible)
    try {
      // Use which to check if chrome exists in PATH
      try {
        const whichResult = execSync('which google-chrome-stable', { encoding: 'utf8' }).trim();
        if (whichResult) {
          console.log(`✅ Chrome found via which: ${whichResult}`);
          process.env.PUPPETEER_EXECUTABLE_PATH = whichResult;
          return whichResult;
        }
      } catch (e) {
        // Chrome not in PATH, continue with installation
      }

      // Try installing dependencies for Chromium
      console.log('📦 Installing Chrome dependencies...');
      execSync('apt-get update && apt-get install -y wget gnupg2 software-properties-common', { stdio: 'pipe', timeout: 60000 });
      
      // Add Google Chrome repository
      execSync('wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -', { stdio: 'pipe', timeout: 30000 });
      execSync('echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list', { stdio: 'pipe' });
      
      // Install Chrome
      execSync('apt-get update && apt-get install -y google-chrome-stable', { stdio: 'pipe', timeout: 120000 });
      
      const installedPath = '/usr/bin/google-chrome-stable';
      
      // Verify installation
      execSync(`test -f ${installedPath}`, { stdio: 'ignore' });
      process.env.PUPPETEER_EXECUTABLE_PATH = installedPath;
      console.log(`✅ Chrome installed successfully at: ${installedPath}`);
      return installedPath;
      
    } catch (installError) {
      console.log(`❌ Chrome installation failed: ${installError.message}`);
      console.log('🔄 Attempting to use bundled Chromium...');
      return null;
    }
  } catch (error) {
    console.log(`⚠️ Chrome check failed: ${error.message}`);
    console.log('🔄 Will attempt with bundled Chromium');
    return null;
  }
}

// Initialize Chrome on startup
ensureChromeInstalled();

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
    // Ensure Chrome is available before launching
    const chromePath = await ensureChromeInstalled();
    
    const launchOptions = { 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-features=site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920x1080'
      ],
      headless: 'new'
    };

    // Set executable path if Chrome was found/installed
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    console.log(`🚀 Launching browser with options:`, JSON.stringify(launchOptions, null, 2));
    
    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`✅ Browser launched successfully`);
    } catch (launchError) {
      console.log(`❌ Initial browser launch failed: ${launchError.message}`);
      
      // Try fallback options if Chrome path was set
      if (chromePath) {
        console.log(`🔄 Trying fallback launch without executablePath...`);
        const fallbackOptions = { ...launchOptions };
        delete fallbackOptions.executablePath;
        
        try {
          browser = await puppeteer.launch(fallbackOptions);
          console.log(`✅ Browser launched with fallback options`);
        } catch (fallbackError) {
          console.log(`❌ Fallback launch also failed: ${fallbackError.message}`);
          throw new Error(`Browser launch failed: ${launchError.message}`);
        }
      } else {
        throw launchError;
      }
    }

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
    console.error('Error stack:', error.stack);
    
    let errorResponse = {
      success: false,
      error: 'Scraping failed',
      details: error.message,
      timestamp: new Date().toISOString()
    };
    
    // Categorize different types of errors
    if (error.message.includes('Could not find Chrome') || 
        error.message.includes('ENOENT') ||
        error.message.includes('No usable sandbox') ||
        error.message.includes('chrome') ||
        error.message.includes('chromium')) {
      
      errorResponse.error = 'Chrome executable error';
      errorResponse.details = 'Chrome browser not properly configured on server';
      errorResponse.fallback_suggestion = 'Use ScraperAPI or Cheerio fallback instead';
      errorResponse.chrome_paths_checked = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      
    } else if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
      errorResponse.error = 'Navigation timeout';
      errorResponse.details = 'Page took too long to load';
      
    } else if (error.message.includes('net::ERR_') || error.message.includes('Failed to navigate')) {
      errorResponse.error = 'Navigation failed';
      errorResponse.details = 'Could not reach the target URL';
      
    } else if (error.message.includes('Protocol error')) {
      errorResponse.error = 'Browser protocol error';
      errorResponse.details = 'Communication with browser failed';
    }
    
    console.log(`📤 Sending error response:`, JSON.stringify(errorResponse, null, 2));
    res.status(500).json(errorResponse);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Puppeteer server is running on port ${PORT}`);
});
