/* eslint-disable camelcase, no-restricted-syntax */

import type { ContractTransactionResponse, AddressLike } from 'ethers';

import { ethers } from 'hardhat';

import {
    IERC721__factory,
    ISupplyManager__factory,
    IRebaseTokenEvents__factory,
    IAgent__factory,
} from '../../typechain-types';

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
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No RequestRedeemEvent event');
}

export async function findRequestDepositEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const IRebaseToken = IRebaseTokenEvents__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = IRebaseToken.decodeEventLog('DepositRequest', data, topics);
            return {
                controller: event[0] as AddressLike,
                owner: event[1] as AddressLike,
                requestId: event[2] as bigint,
                sender: event[3] as AddressLike,
                assets: event[4] as bigint,
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No DepositRequest event');
}

export async function findConfirmDepositEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const IAgentLZ = IAgent__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = IAgentLZ.decodeEventLog('DepositConfirm', data, topics);
            return {
                requestId: event[0] as bigint,
                shares: event[1] as bigint,
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No DepositConfirm event');
}

export async function findRedeemRequestEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const IRebaseToken = IRebaseTokenEvents__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = IRebaseToken.decodeEventLog('RedeemRequest', data, topics);
            return {
                controller: event[0] as AddressLike,
                owner: event[1] as AddressLike,
                requestId: event[2] as bigint,
                sender: event[3] as AddressLike,
                shares: event[4] as bigint,
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No RedeemRequest event');
}

export async function findRedeemEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const iSupplyManager = ISupplyManager__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = iSupplyManager.decodeEventLog('Redeem', data, topics);
            return {
                requestIds: event[0] as bigint[],
                values: event[1] as bigint[],
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No Redeem event');
}

export async function findDistributeYieldEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const IAgentLZ = IAgent__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = IAgentLZ.decodeEventLog('DistributeYield', data, topics);
            return {
                users: event[0] as AddressLike[],
                shares: event[1] as bigint[],
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No DistributeYield event');
}

export async function findTransferEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const iSupplyManager = IERC721__factory.createInterface();
    for (const logs of receipt!.logs) {
        try {
            const { data, topics } = logs;
            const event = iSupplyManager.decodeEventLog('Transfer', data, topics);
            return {
                from: event[0] as AddressLike,
                to: event[1] as AddressLike,
                tokenId: event[2] as bigint,
            };
        } catch (error) {
            // do nothing
        }
    }
    throw new Error('No Transfer');
}
