import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { EventLog } from 'ethers';
import { ethers } from 'hardhat';

import type { MUSDLock, MockOracle, RebaseERC20 } from '../../typechain-types';

describe('mUSDLock', () => {
    async function initContracts() {
        const signers = await ethers.getSigners();
        const user: HardhatEthersSigner = signers.at(0)!;
        const admin: HardhatEthersSigner = signers.at(1)!;

        const oracle: MockOracle = await ethers.deployContract('MockOracle', [
            100, // initialShares
            1000, // initialPool
            admin,
        ]);
        const mUsd: RebaseERC20 = await ethers.deployContract('RebaseERC20', [
            0, // initialShares for RebaseERC20
            await oracle.getAddress(),
            admin,
            'Molecula USD',
            'mUSD',
            18,
        ]);
        const mUsdLock: MUSDLock = await ethers.deployContract('MUSDLock', [
            await mUsd.getAddress(),
        ]);

        return { user, admin, oracle, mUsd, mUsdLock };
    }

    it('Should deploy', async () => {
        await loadFixture(initContracts);
    });

    it('Test lock and unlock flow', async () => {
        const { user, admin, mUsd, mUsdLock } = await loadFixture(initContracts);

        // Mint shares for user
        await mUsd.connect(admin).mint(user.address, 35); // 35 - shares
        expect(await mUsd.balanceOf(user)).to.equal(350); // 350 - asset

        // User approves 300 mUSD for mUSD Lock contract
        await mUsd.connect(user).approve(await mUsdLock.getAddress(), 300); // 300 - asset
        expect(await mUsd.allowance(user.address, await mUsdLock.getAddress())).to.equal(300); // 300 - asset

        const lockPayload = Buffer.from('Hello, Lock!');

        // User locks zero value
        await expect(mUsdLock.connect(user).lock(0, lockPayload)).to.be.rejectedWith(
            'ETooSmallValue()',
        );

        // User locks 300 mUSD

        let txResponse = await mUsdLock.connect(user).lock(300, lockPayload); // 300 - asset
        const txReceipt = (await txResponse.wait())!;

        const txLogs1 = txReceipt.logs.find(log => {
            return log instanceof EventLog && log.eventName === 'Lock';
        }) as EventLog;
        expect(txLogs1.eventName).to.be.equal('Lock');
        const lockId = txLogs1.args.at(0) as string;
        const arg1 = txLogs1.args.at(1);
        expect(arg1).to.equal(`0x${lockPayload.toString('hex')}`);
        expect(await mUsdLock.getLockIds(user.address)).eql([lockId]);
        expect(await mUsd.balanceOf(user)).to.equal(50); // 50 - asset
        expect(await mUsd.balanceOf(await mUsdLock.getAddress())).to.equal(300); // 300 - asset

        const unlockPayload = Buffer.from('Goodbye, Lock!');

        // Incorrect user unlocks the funds
        await expect(mUsdLock.connect(admin).unlock(lockId, unlockPayload)).to.be.rejectedWith(
            'EWrongSender()',
        );

        // User unlocks their funds

        txResponse = await mUsdLock.connect(user).unlock(lockId, unlockPayload);
        await expect(txResponse)
            .to.emit(mUsdLock, 'Unlock')
            .withArgs(lockId, `0x${unlockPayload.toString('hex')}`);
        expect(await mUsd.balanceOf(user)).to.equal(350); // 350 - asset
        expect(await mUsd.balanceOf(await mUsdLock.getAddress())).to.equal(0);

        // User unlocks the funds that is already unlocked
        await expect(mUsdLock.connect(user).unlock(lockId, '0x')).to.be.rejectedWith(
            'ESharesAlreadyUnlocked()',
        );

        // User unlocks the funds using wrong lockID
        const badLockId = ethers.encodeBytes32String('100500');
        await expect(mUsdLock.connect(user).unlock(badLockId, '0x')).to.be.rejectedWith(
            'ELockIdNotExist',
        );
    });
});
