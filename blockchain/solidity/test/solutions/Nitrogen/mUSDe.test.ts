/* eslint-disable no-bitwise */
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { latest } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import type { MUSDE } from '../../../typechain-types';

import { getEthena, mintmUSDe } from '../../utils/Common';

describe('mUSDe', () => {
    async function initContracts() {
        const user: HardhatEthersSigner = (await ethers.getSigners()).at(0)!;
        const newUser: HardhatEthersSigner = (await ethers.getSigners()).at(1)!;
        const newUser2: HardhatEthersSigner = (await ethers.getSigners()).at(2)!;

        const { usdeMinter, usde, susde } = await getEthena();

        // Get mUSDe
        const musde: MUSDE = await ethers.deployContract('MUSDE', [
            await susde.getAddress(),
            user.address,
        ]);

        const zeroAddress = ethers.ZeroAddress;

        return { user, newUser, newUser2, usdeMinter, usde, susde, musde, zeroAddress };
    }

    it('Should deploy', async () => {
        await loadFixture(initContracts);
    });

    it('Should mint/approve sUSDe', async () => {
        const { user, usdeMinter, usde, susde, musde } = await loadFixture(initContracts);
        const depositValue = 100n;

        const musdeAmount = await mintmUSDe(
            user.address,
            usdeMinter,
            usde,
            susde,
            musde,
            depositValue,
        );

        // Burn mUSDe and unfreeze USDe
        const info = await musde.getCooldownInfo();
        expect(info.canUnstake).to.be.true;
        expect(info.cooldownEnd).to.be.lessThanOrEqual(BigInt(await latest()));
        expect(info.underlyingAmount).to.be.equal(musdeAmount);
        const txResponse = await musde.connect(user).unstake();
        await expect(txResponse).to.emit(musde, 'Burn').withArgs(user.address, musdeAmount);
        expect(await musde.balanceOf(user)).to.equal(0n);
        expect(await susde.balanceOf(user)).to.equal(0n);
        expect(await usde.balanceOf(user)).to.equal(musdeAmount);
    });

    it('Should fail on malicious signer', async () => {
        const { musde } = await loadFixture(initContracts);

        const maliciousSigner: HardhatEthersSigner = (await ethers.getSigners()).at(1)!;
        await expect(musde.connect(maliciousSigner).cooldownShares(100500n)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")',
        );
        await expect(musde.connect(maliciousSigner).unstake()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")',
        );
    });

    it('Should save mUSDe amount if owner is changed', async () => {
        const { user, newUser, usdeMinter, usde, susde, musde, zeroAddress } =
            await loadFixture(initContracts);
        const depositValue = 100n;

        const musdeAmount = await mintmUSDe(
            user.address,
            usdeMinter,
            usde,
            susde,
            musde,
            depositValue,
        );

        // Change mUSDe owner
        await musde.connect(user).approve(newUser, 10);
        expect((await musde.allowanceInfo())[0]).to.be.equal(newUser.address);
        expect((await musde.allowanceInfo())[1]).to.be.equal(10n);
        expect(await musde.balanceOf(user)).to.equal(musdeAmount);
        expect(await musde.balanceOf(newUser)).to.equal(0);
        await musde.connect(user).transferOwnership(newUser.address);
        expect(await musde.owner()).to.equal(newUser.address);
        expect(await musde.balanceOf(user)).to.equal(0);
        expect(await musde.balanceOf(newUser)).to.equal(musdeAmount);
        expect((await musde.allowanceInfo())[0]).to.be.equal(zeroAddress);
        expect((await musde.allowanceInfo())[1]).to.be.equal(0n);

        // Burn mUSDe and unfreeze USDe
        const info = await musde.getCooldownInfo();
        expect(info.canUnstake).to.be.true;
        expect(info.underlyingAmount).to.be.equal(musdeAmount);
        const txResponse = await musde.connect(newUser).unstake();
        await expect(txResponse).to.emit(musde, 'Burn').withArgs(newUser.address, musdeAmount);
        expect(await musde.balanceOf(newUser)).to.equal(0n);
        expect(await susde.balanceOf(newUser)).to.equal(0n);
        expect(await usde.balanceOf(newUser)).to.equal(musdeAmount);
    });

    it('Test erc20 functional', async () => {
        const { user, newUser, newUser2, usdeMinter, usde, susde, musde, zeroAddress } =
            await loadFixture(initContracts);
        const depositValue = 100n;

        const musdeAmount = await mintmUSDe(
            user.address,
            usdeMinter,
            usde,
            susde,
            musde,
            depositValue,
        );

        // Test allowance
        await musde.connect(user).approve(newUser, 10n);
        expect(await musde.allowance(user, newUser)).to.be.equal(10n);
        expect(await musde.allowance(user, newUser2)).to.be.equal(0n);
        expect(await musde.allowance(newUser2, user)).to.be.equal(0n);

        // Test approve
        await musde.connect(user).approve(newUser, (1n << 256n) - 1n);
        await musde.connect(user).approve(newUser, 1);
        await musde.connect(user).approve(newUser, 0);
        await musde.connect(user).approve(newUser, 10);
        expect((await musde.allowanceInfo())[0]).to.be.equal(newUser.address);
        expect((await musde.allowanceInfo())[1]).to.be.equal(10n);
        await expect(musde.connect(newUser).approve(user, 1)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount',
        );

        // Test transferFrom
        await expect(musde.connect(newUser2).transferFrom(user, newUser, 1)).to.be.rejectedWith(
            'ENotSpender',
        );
        await expect(musde.connect(newUser).transferFrom(newUser2, user, 1)).to.be.rejectedWith(
            'EFromIsNotOwner',
        );
        await expect(musde.connect(newUser).transferFrom(user, newUser2, 1)).to.be.rejectedWith(
            'ETransferNotAllBalance',
        );
        await expect(
            musde.connect(newUser).transferFrom(user, newUser2, musdeAmount),
        ).to.be.rejectedWith('InsufficientAllowance');
        await musde.connect(user).approve(newUser, (1n << 256n) - 1n);
        await musde.connect(newUser).transferFrom(user, newUser2, musdeAmount);
        expect((await musde.allowanceInfo())[0]).to.be.equal(zeroAddress);
        expect((await musde.allowanceInfo())[1]).to.be.equal(0n);
        expect(await musde.owner()).to.be.equal(newUser2);

        // Test transfer
        await expect(musde.connect(newUser).transfer(user, 1)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount',
        );
        await expect(musde.connect(newUser2).transfer(user, 1)).to.be.rejectedWith(
            'ETransferNotAllBalance',
        );
        await musde.connect(newUser2).transfer(user, musdeAmount);
        expect(await musde.owner()).to.be.equal(user);
    });

    it('Should correct return erc20 data', async () => {
        const { musde } = await loadFixture(initContracts);

        expect(await musde.name()).to.be.equal('Molecula USDe');
        expect(await musde.symbol()).to.be.equal('mUSDe');
        expect(await musde.decimals()).to.be.equal(18n);
        expect(await musde.totalSupply()).to.be.equal(0n);
    });

    it('Should revert with zero value', async () => {
        const { musde, user, zeroAddress } = await loadFixture(initContracts);

        // user variable in this test is owner

        await expect(musde.connect(user).approve(zeroAddress, 0n)).to.be.rejectedWith(
            'EZeroAddress()',
        );

        await expect(musde.connect(user).transfer(zeroAddress, 0n)).to.be.rejectedWith(
            'EZeroAddress()',
        );

        await expect(
            musde.connect(user).transferFrom(zeroAddress, zeroAddress, 0n),
        ).to.be.rejectedWith('EZeroAddress()');

        expect(await musde.owner()).to.be.equal(user.address);
        await expect(musde.connect(user).renounceOwnership()).to.be.rejectedWith(
            'EUnsupportedOperation()',
        );
        expect(await musde.owner()).to.be.equal(user.address);
    });
});
