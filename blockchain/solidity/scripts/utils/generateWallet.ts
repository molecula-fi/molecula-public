import { ethers } from 'hardhat';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TronWeb = require('tronweb');

function run() {
    const wallet = ethers.Wallet.createRandom();
    const mnemonic = wallet.mnemonic!.phrase;

    console.log('Mnemonic for ethereum and tron wallet:', mnemonic);
    console.log();

    console.log('Ethereum wallet:');
    console.log('Path:', wallet.path);
    console.log('Public key:', wallet.publicKey);
    console.log('Private Key:', wallet.privateKey);
    console.log('Eth address:', wallet.address);
    console.log();

    const tronPath = "m/44'/195'/0'/0/0";
    const tronWallet = TronWeb.fromMnemonic(mnemonic, tronPath);
    console.log('Tron wallet:');
    console.log('Path:', tronPath);
    console.log('Public key:', tronWallet.privateKey);
    console.log('Private Key:', tronWallet.publicKey);
    console.log('Tron address:', tronWallet.address);
}

run();
