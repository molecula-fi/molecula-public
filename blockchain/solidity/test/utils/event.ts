/* tslint:disable */
/* eslint-disable */

import { ContractTransactionResponse, type AddressLike } from 'ethers';

import { ethers } from 'hardhat';

import { ISupplyManager__factory } from '../../typechain-types';

export async function findRequestRedeemEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const iSupplyManager = ISupplyManager__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = iSupplyManager.decodeEventLog('RedeemRequest', data, topics);
            return {
                operationId: event[0] as bigint,
                agentAddress: event[1] as AddressLike,
                redeemShares: event[2] as bigint,
                redeemValue: event[3] as bigint,
            };
        } catch (error) {}
    }
    throw new Error('No RequestRedeemEvent');
}
