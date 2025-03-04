import { expect } from 'chai';
import type { BigNumberish, AddressLike, Addressable } from 'ethers';
import { ethers } from 'hardhat';

import type { IERC20 } from '../../typechain-types';

export const FAUCET = {
    DAI: '0xA69babEF1cA67A37Ffaf7a485DfFF3382056e78C',
    USDT: '0xA69babEF1cA67A37Ffaf7a485DfFF3382056e78C',
    ETH: '0xA69babEF1cA67A37Ffaf7a485DfFF3382056e78C',
    AAVE_ETHEREUM_USDT: '0x176F3DAb24a159341c0509bB36B833E7fdd0a132',
    STAKED_FRAX: '0xAAc0aa431c237C2C0B5f041c8e59B3f1a43aC78F',
};

export async function grantERC20(
    wallet: AddressLike,
    token: IERC20,
    amount: BigNumberish,
    faucet: string = FAUCET.USDT,
) {
    // Prepare an impersonated signer to work as a faucet in the test
    const faucetSigner = await ethers.getImpersonatedSigner(faucet);
    // transfer ERC20 token
    const balance0 = await token.balanceOf(wallet);
    await token.connect(faucetSigner).transfer(wallet, amount);
    const balance = await token.balanceOf(wallet);
    expect(balance - balance0).to.equal(amount);
}

export async function grantETH(wallet: AddressLike, amount: BigNumberish) {
    // Prepare an impersonated signer to work as a faucet in the test
    const faucet = FAUCET.ETH;
    const faucetSigner = await ethers.getImpersonatedSigner(faucet);
    // Get ETH for the wallet
    const tx = {
        to: wallet,
        value: amount,
    };
    const nativeBalance0 = await ethers.provider.getBalance(wallet);
    await faucetSigner.sendTransaction(tx);
    const nativeBalance = await ethers.provider.getBalance(wallet);
    expect(nativeBalance - nativeBalance0).to.be.equal(amount);
}

export async function removeERC20(
    vault: string,
    tokenAddress: string | Addressable,
    expectedBalance: bigint,
) {
    // user who needs to reduce the token balance
    const vaultSigner = await ethers.getImpersonatedSigner(vault);

    const token = await ethers.getContractAt('IERC20', tokenAddress);
    const amountToDecrease = (await token.balanceOf(vaultSigner.address)) - expectedBalance;

    if (amountToDecrease !== 0n) {
        await token
            .connect(vaultSigner)
            .transfer('0x0000000000000000000000000000000000000001', amountToDecrease);
    }
}
