import { expect } from 'chai';
import type { BigNumberish, AddressLike } from 'ethers';
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
    const signers = await ethers.getSigners();
    const signer = signers.at(0)!;
    const nativeBalance0 = await ethers.provider.getBalance(wallet);
    await signer.sendTransaction({
        to: wallet,
        value: amount,
    });
    const nativeBalance = await ethers.provider.getBalance(wallet);
    expect(nativeBalance - nativeBalance0).to.be.equal(amount);
}
