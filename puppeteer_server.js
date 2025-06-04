const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY || '';

app.get('/', (req, res) => {
  res.json({
    status: 'Puppeteer Server Running',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Puppeteer server is running on port ${PORT}`);
});
