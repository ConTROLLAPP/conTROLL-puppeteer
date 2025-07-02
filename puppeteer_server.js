const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', // CHANGED THIS LINE
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
