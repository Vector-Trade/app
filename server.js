const express = require('express');
const axios = require('axios');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const exchanges = [
  { id: 'NYSE', name: 'New York Stock Exchange' },
  { id: 'NASDAQ', name: 'NASDAQ' }
];

app.get('/exchanges', (req, res) => {
  res.json(exchanges);
});

app.post('/api/connect-wallet', (req, res) => {
  const { publicKey } = req.body;
  console.log('Received publicKey:', publicKey);
  // Perform backend operations with publicKey (e.g., store in database)
  res.json({ message: 'Received publicKey successfully' });
});

async function fetchStockData(symbol) {
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol,
        interval: '1min',
        apikey: ALPHA_VANTAGE_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock data:', error);
  }
}

app.get('/stocks', async (req, res) => {
  const { exchange } = req.query;
  const symbols = exchange === 'NYSE' ? ['AAPL', 'MSFT'] : ['GOOGL', 'AMZN'];

  const stockDataPromises = symbols.map(symbol => fetchStockData(symbol));

  try {
    const stockDataResponses = await Promise.all(stockDataPromises);

    const stocks = stockDataResponses.map(response => {
      const metaData = response['Meta Data'];
      const timeSeries = response['Time Series (1min)'];

      if (!metaData || !timeSeries) {
        console.error('Error in API response:', response);
        return null;
      }

      const latestTime = Object.keys(timeSeries)[0];
      const latestData = timeSeries[latestTime];
      const price = parseFloat(latestData['1. open']);
      return {
        id: metaData['2. Symbol'],
        name: metaData['2. Symbol'],
        price
      };
    }).filter(stock => stock !== null);

    console.log('Sending stocks data:', stocks);
    res.json(stocks);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
