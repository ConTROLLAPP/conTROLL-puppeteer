FROM node:18-slim

# Install Chromium and all necessary dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install

# Diagnostic: Show where chromium and chromium-browser are located,
# and list the /usr/bin directory, for debugging Render builds.
RUN which chromium || true
RUN which chromium-browser || true
RUN ls -l /usr/bin/

CMD ["node", "puppeteer_server.js"]
