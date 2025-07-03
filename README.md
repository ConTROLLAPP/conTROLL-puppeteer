# conTROLL-puppeteer

Lightweight Puppeteer API server for ConTROLL.

## Features

- Headless Chromium browser scraping via Puppeteer
- Simple HTTP API interface (GET/POST endpoints)
- Designed for deployment on Render (Docker-based)
- No manual Chromium install—uses Puppeteer’s managed browser

## Usage

1. Clone this repo.
2. Build and run with Docker:
   ```bash
   docker build -t conTROLL-puppeteer .
   docker run -p 5000:5000 conTROLL-puppeteer
   ```

3. Endpoints:
   - `GET /scrape?url=...`
   - `POST /scrape` with JSON body

## Deploying to Render

- Uses a Dockerfile (see in repo).
- No need to install Chromium manually—Puppeteer manages its own browser.

## Example Request

```bash
curl "http://localhost:5000/scrape?url=https://example.com"
```

## License

MIT
