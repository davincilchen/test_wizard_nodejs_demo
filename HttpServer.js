let env = require('./env');
let BigNumber = require('bignumber.js');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let wizard = require('wizard_nodejs');
//let Util = require('ethereumjs-util');
let axios = require('axios');
let Web3 = require('web3');
let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Types = wizard.Types;
let urlWizardNodeSvr = 'http://127.0.0.1:3001/pay';
let urlGrigotts = 'http://127.0.0.1:3000';
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let server = require('http').createServer(app);

// two phase termination
let couldGracefulShotdown = true;

app.get('/balance/:address', async function (req, res) {
  let asset = env.assetAddress.padStart(64, '0');
  let address = req.params.address.toLowerCase();
  let data = await getBalance(address,asset);
  res.send(data);
});

app.post('/tokenDeposit/:address/:value', async function (req, res) {

  //auto mint?  X 
  console.log("Token Deposit");
  let address = req.params.address.toLowerCase();
  let value = req.params.value;
  let message = '';
  let asset = env.assetAddress.padStart(64, '0');
  console.log("address = ", address, ", value = ", value);
  

  if (isNaN(value)){
    message = 'value ' + value + ' is not a number';
    res.send({ ok: false, message:  message});
    console.log(message);
    return;
  }

  let data = await getBalance(makeupAddress(infinitechain.signer.getAddress()),asset);
  let balance = data.balance;
  
  check =  (value * 1e18)
  //check =  (546 * 1e18)
  console.log('value:' + check);
  console.log('balance:' + balance);
  if (check>balance){
    message = 'balance is not enough';
    res.send({ ok: false, message:  message});
    return;
  }
  
  await remittance(infinitechain,address,value,asset);
  res.send({ ok: true });

});

  

let remittance = async (chain, to, value, asset) => {
  let remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    //assetID: '0'.padStart(64, '0'),
    assetID: asset,
    value: value,
    //fee: 0.002
    fee: 0
  };
  try {
    let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData);
    let resLocal = await axios.post(urlWizardNodeSvr, lightTx.toJson());
    console.log(resLocal.data);
    return lightTx.lightTxHash;
  } catch(e) {
    console.log(e);
  }
};

function makeupAddress(address){
  console.log(address);
  address = address.toString().replace("0x","").padStart(64, '0');
  console.log(address);
  return address;
}
let getBalance = async  (address, assetID) => {
  if (!assetID) {
    assetID = '0'.padStart(64, '0');
  } else {
    assetID = assetID.toString().padStart(64, '0');
  }

  let url = urlGrigotts + '/balance/' + address + '?assetID=' + assetID;
  console.log(url);
  let res = await axios.get(url);
  console.log(res.data);
  return res.data
};

server.listen(3002, async function () {
  try {
    console.log('App listening on port 3002!');
  } catch (e) {
    console.error(e.message);
  }
});
  
if (process.platform === 'win32') {
  let rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', function () {
    process.emit('SIGINT');
  });
}

process.on('SIGINT', function () {
  if (couldGracefulShotdown) {
    process.exit();
  }

  setInterval(() => {
    process.exit();
  }, 1000);
});
  



