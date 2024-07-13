
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

async function createTransaction() {
  // Keypairs from config
  const issuerKeypair = Keypair.fromSecret(issuer.secret);
  const distributorKeypair = Keypair.fromSecret(distributor.secret);

  // Connect to Horizon server
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");

  // Load accounts
  const issuerAccount = await server.loadAccount(issuer.publicKey);
  const distributorAccount = await server.loadAccount(distributor.publicKey);

  // Create a new asset (token)
  const abcAsset = new Asset("ABC", issuer.publicKey);

  // Create a transaction to establish a trustline for the distributor account
  const trustTransaction = new TransactionBuilder(distributorAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
  .addOperation(
    Operation.changeTrust({
      asset: abcAsset,
    })
  )
  .setTimeout(180)
  .build();

  trustTransaction.sign(distributorKeypair);
  await server.submitTransaction(trustTransaction);
  console.log("Trustline created successfully");

  // Create a transaction to issue the asset to the distributor account
  const issueTransaction = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
  .addOperation(
    Operation.payment({
      destination: distributor.publicKey,
      asset: abcAsset,
      amount: '1000', // Issuing 1000 ABC tokens
    })
  )
  .setTimeout(180)
  .build();

  issueTransaction.sign(issuerKeypair);
  await server.submitTransaction(issueTransaction);
  console.log("Asset issued successfully");

  // Load the distributor account again to get updated balances
  const updatedDistributorAccount = await server.loadAccount(distributor.publicKey);

  // Find the balance for ABC token
  const abcBalance = updatedDistributorAccount.balances.find(balance => balance.asset_code === 'ABC' && balance.asset_issuer === issuer.publicKey);

  console.log(`ABC token balance of distributor account: ${abcBalance ? abcBalance.balance : '0'}`);
}

// Call the async function
createTransaction().then(() => console.log("Transaction completed successfully")).catch(console.error);
