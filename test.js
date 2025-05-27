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
// const VALIDATOR_VOTE_ACCOUNT = '9qyNwcztJXEbHWpq8YBHAc3gX1Cd9WdeSiaNEtrQMUp7'; not a valid vote account
const VALIDATOR_VOTE_ACCOUNT = '21Jxcw74j5SvajRKE3PvNifu26CVorF7DF8HyanKNzZ3';
const REWARDS_ACCOUNT = '2js89sykJT65QgZTrC7CBHfqRK5wE3HyCTVBu8Qit3b6';


async function createStakeTransaction(wallet, validatorVoteAccount) {
  const response = await axios.post(`${FIGMENT_API_URL}/stake`, {
    funding_account: wallet.publicKey.toString(),
    vote_account: validatorVoteAccount.toString(),
    amount_sol: STAKE_AMOUNT,
    network: NETWORK
  }, { headers: API_HEADERS });

  console.log('stake worked',response.data.data.unsigned_transaction_serialized )

  return {
    unsignedTx:   response.data.data.unsigned_transaction_serialized,
    stakeAccount: response.data.data.stake_account
  };}

// async function fetchRewardsSummary(account) {
//   const res = await axios.post(
//     `${FIGMENT_API_URL}/rewards`,
//     {
//       system_accounts: [ account ],
//       network: NETWORK
//     },
//     { headers: API_HEADERS }
//   );
//   return res.data.data; 
// }

async function createUndelegateTransaction(wallet, stakeAccount) {
  const res = await axios.post(
    `${FIGMENT_API_URL}/undelegate`,
    {
      stake_account: stakeAccount,
      network: NETWORK
    },
    { headers: API_HEADERS }
  );
  console.log('undelegate working?', res.data.data.unsigned_transaction_serialized)
  return res.data.data.unsigned_transaction_serialized;
}


function sign(unsignedTx, wallet) {
  const transaction = Transaction.from(Buffer.from(unsignedTx, 'hex'));
  transaction.partialSign(wallet);
  return transaction;
}

async function broadcastTransaction(signedTx) {
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
    const stakeAccount = "Fkx657DszTUYTYPBCWBRtwuDW3NZ2VBs1PxPNdLgFM5H"

    // Create, sign, and broadcast the transaction
    const unsignedTx = await createStakeTransaction(wallet, validatorVoteAccount);
    const signedTx = sign(unsignedTx.unsignedTx, wallet);
    const txHash = await broadcastTransaction(signedTx);

    const explorerUrl = `${EXPLORER_BASE_URL}${txHash}${NETWORK === 'devnet' ? '?cluster=devnet' : ''}`;
    console.log(`Staked ${STAKE_AMOUNT} SOL to ${VALIDATOR_VOTE_ACCOUNT} successfully!`);
    console.log('View transaction on explorer:', explorerUrl);

    // --- Rewards summary for the given account over ~1 month ---
    // const rewards = await fetchRewardsSummary(REWARDS_ACCOUNT);
    // console.log(`Rewards for ${REWARDS_ACCOUNT}:`, rewards);

  // --- Undelegate (deactivate) ---
    const unsignedUndelegate = await createUndelegateTransaction(wallet, stakeAccount);
    const signedUndelegate   = sign(unsignedUndelegate, wallet);
    const undelegateTxHash     = await broadcastTransaction(signedUndelegate);
    console.log(`Undelegated stake-account ${stakeAccount}`);
    console.log('Explorer:', `${EXPLORER_BASE_URL}${undelegateTxHash}?cluster=devnet`);


  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
