require('dotenv').config();
const bs58 = require('bs58');
const axios = require('axios');
const { 
  Keypair, 
  PublicKey,
  Transaction
} = require('@solana/web3.js');

const API_HEADERS = {
  'x-api-key': process.env.API_KEY
};
const NETWORK = 'devnet';
const EXPLORER_BASE_URL = 'https://explorer.solana.com/tx/';
const FIGMENT_API_URL = 'https://api.figment.io/solana';
const STAKE_AMOUNT = 0.01;
const VALIDATOR_VOTE_ACCOUNT = '9qyNwcztJXEbHWpq8YBHAc3gX1Cd9WdeSiaNEtrQMUp7';

async function createStakeTransaction(wallet, validatorVoteAccount) {
  const response = await axios.post(`${FIGMENT_API_URL}/stake`, {
    funding_account: wallet.publicKey.toString(),
    vote_account: validatorVoteAccount.toString(),
    amount_sol: STAKE_AMOUNT,
    network: NETWORK
  }, { headers: API_HEADERS });

  return response.data.data.unsigned_transaction_serialized;
}

function sign(unsignedTx, wallet) {
  const transaction = Transaction.from(Buffer.from(unsignedTx, 'hex'));
  transaction.partialSign(wallet);
  return transaction;
}

async function broadcastStakeTransaction(signedTx) {
  const response = await axios.post(`${FIGMENT_API_URL}/broadcast`, {
    transaction_payload: signedTx.serialize().toString('hex'),
    network: NETWORK
  }, { headers: API_HEADERS });

  return response.data.transaction_hash;
}

async function main() {
  try {
    // Initialize wallet and validator
    const privateKeyBytes = bs58.decode(process.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    const validatorVoteAccount = new PublicKey(VALIDATOR_VOTE_ACCOUNT);

    // Create, sign, and broadcast the transaction
    const unsignedTx = await createStakeTransaction(wallet, validatorVoteAccount);
    const signedTx = sign(unsignedTx, wallet);
    const txHash = await broadcastStakeTransaction(signedTx);

    const explorerUrl = `${EXPLORER_BASE_URL}${txHash}${NETWORK === 'devnet' ? '?cluster=devnet' : ''}`;
    console.log(`Staked ${STAKE_AMOUNT} SOL to ${VALIDATOR_VOTE_ACCOUNT} successfully!`);
    console.log('View transaction on explorer:', explorerUrl);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
