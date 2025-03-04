/* eslint-disable camelcase, max-lines */
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Test LZMessage', () => {
    async function deployLZMessage() {
        // Contracts are deployed using the first signer/account by default
        const [owner] = await ethers.getSigners();
        expect(owner).to.exist;
        // Deploy LZMessageLib
        const LZMessageLib = await ethers.getContractFactory('LZMessage');
        const msgLib = await LZMessageLib.deploy();

        return {
            msgLib,
            owner,
        };
    }
    describe('General LZMessage tests', () => {
        it('Test distribute yield encode/decode', async () => {
            const { msgLib } = await loadFixture(deployLZMessage);
            const addr = [
                '0xAE246E208ea35B3F23dE72b697D47044FC594D5F',
                '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            ];

            const shares = [10n, 20n, 30n];
            const message = await msgLib.lzEncodeDistributeYieldMessage(addr, shares);
            const modifiedMessage = message.slice(0, 2) + message.slice(4);
            const res = await msgLib.lzDecodeDistributeYieldMessage(modifiedMessage);
            // console.log(res);
            expect(res[0].length).to.equal(3);
            expect(res[0][0]).to.equal(addr[0]);
            expect(res[0][1]).to.equal(addr[1]);
            expect(res[0][2]).to.equal(addr[2]);
            expect(res[1].length).to.equal(3);
            expect(res[1][0]).to.equal(shares[0]);
            expect(res[1][1]).to.equal(shares[1]);
            expect(res[1][2]).to.equal(shares[2]);

            const s = await msgLib.lzDefaultDistributeYieldMessage(5);
            expect(s.length).to.equal((1 + 1 + (20 + 32) * 5) * 2);
            // console.log(s);
        });
    });
});
