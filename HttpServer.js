let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let wizard = require('wizard_nodejs');
let axios = require('axios');

let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Types = wizard.Types;

let myPort = parseInt(env.howAPIPort);
if (isNaN(myPort) || myPort <= 0) {
  myPort = 3002;
}

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
  let address = req.params.address.toLowerCase();
  let data = await getBalance(address,getValidAssetID());
  res.send(data);
});

app.post('/tokenDeposit/:address/:value', async function (req, res) {

  //auto mint?  X 
  console.log("Token Deposit");
  let address = req.params.address.toLowerCase();
  let value = req.params.value;
  let asset = getValidAssetID();
  let message = '';
  console.log("address = ", address, ", value = ", value);
  

  if (isNaN(value)){
    message = 'value \'' + value + '\' is not a number';
    res.status(400).send({ ok: false, message:  message});
    console.log(message);
    return;
  }

  if (value <= 0){
    message = 'value must bigger then zero ';
    res.status(400).send({ ok: false, message:  message});
    console.log(message);
    return;
  }


  let data = await getBalance(makeupAddress(infinitechain.signer.getAddress()),asset);
  let balance = data.balance;
  
  check =  (value * 1e18)
  console.log('deposit value:' + check);
  console.log('owner balance:' + balance);
  if (check>balance){
    message = 'balance is not enough';
    res.status(400).send({ ok: false, message:  message});
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
    let wizardNodeServerUrl = env.wizardNodeServerUrl + "/pay";
    let resLocal = await axios.post(wizardNodeServerUrl, lightTx.toJson());
    console.log(resLocal.data);
    return lightTx.lightTxHash;
  } catch(e) {
    console.log(e);
  }
};

function makeupAddress(address){
  address = address.toString().replace("0x","").padStart(64, '0');
  return address;
}

function getValidAssetID(){
  let assetID = env.assetAddress.toString().replace("0x","").padStart(64, '0');
  return assetID;
}


let getBalance = async  (address, assetID) => {
  let url = env.nodeUrl + '/balance/' + address + '?assetID=' + assetID;
  console.log(url);
  let res = await axios.get(url);
  return res.data
};

server.listen(myPort, async function () {
  try {
    console.log('App listening on port ' + myPort + ' !');
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
  



