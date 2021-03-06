let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db', { valueEncoding: 'json' });
// let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
// let Types = wizard.Types;
let url = 'http://localhost:3001/pay';

let credentials;
let token;

let infinitechain = new wizard.InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // onInstantWithdrawa
  infinitechain.event.onInstantWithdraw((err, result) => {
    console.log('instantWithdraw:');
    console.log(result);
  });

  // instantWithdraw
  let withdrawalLightTx = await infinitechain.client.makeProposeWithdrawal(
    { assetID: '0x0'.padEnd(66, '0'),
      value: 0.00000000000001
    });

  let response = await axios.post(url, withdrawalLightTx.toJson());
  let withdrawalReceiptJson = response.data;

  let withdrawalReceipt = new Receipt(withdrawalReceiptJson);
  await infinitechain.client.saveReceipt(withdrawalReceipt);
  console.log(withdrawalReceipt);
});
