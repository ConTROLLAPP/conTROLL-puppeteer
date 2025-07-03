FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

# Download Puppeteer's compatible Chrome at build time!
RUN npx puppeteer browsers install chrome

COPY . .

CMD ["node", "puppeteer_server.js"]
