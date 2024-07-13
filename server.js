const express = require('express');
const axios = require('axios');
require('dotenv').config();
const bodyParser = require('body-parser');
const {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} = require("@stellar/stellar-sdk");

const {
  accounts: { issuer, distributor },
  serverUrl
} = require("./config.json");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ISSUER_SECRET = issuer.secret;
const DISTRIBUTOR_SECRET = distributor.secret;
// const serverUrl = 'https://horizon-testnet.stellar.org';

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

async function createToken(publicKey, stockSymbol, quantity) {
  const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
  const distributorKeypair = Keypair.fromSecret(DISTRIBUTOR_SECRET);

  const server = new Horizon.Server(serverUrl);

  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
  const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());

  const asset = new Asset(stockSymbol, issuerKeypair.publicKey());

  // Create a transaction to establish trustline
  const trustTransaction = new TransactionBuilder(distributorAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
  .addOperation(
    Operation.changeTrust({
      asset: asset,
    })
  )
  .setTimeout(180)
  .build();

  trustTransaction.sign(distributorKeypair);
  await server.submitTransaction(trustTransaction);
  console.log("Trustline created successfully");

  // Create a transaction to issue the asset
  const issueTransaction = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
  .addOperation(
    Operation.payment({
      destination: publicKey,
      asset: asset,
      amount: quantity.toString(), // Issue quantity
    })
  )
  .setTimeout(180)
  .build();

  issueTransaction.sign(issuerKeypair);
  await server.submitTransaction(issueTransaction);
  console.log("Asset issued successfully");

  // Return the asset details
  return { stockSymbol, quantity };
}

app.post('/api/create-token', async (req, res) => {
  const { publicKey, stockSymbol, quantity } = req.body;
  let symbol = "v"+stockSymbol;

  try {
    const result = await createToken(publicKey, symbol, quantity);
    res.json({ message: 'Token created successfully', ...result });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
