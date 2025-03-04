/* tslint:disable */
/* eslint-disable */

import { EventLog, Log, ContractTransactionResponse, type AddressLike } from 'ethers';

import { ethers } from 'hardhat';

import { ISupplyManager__factory } from '../../typechain-types';

export function findEventArgs(logs: (Log | EventLog)[], eventName: string) {
    let res = null;

    const filteredLogs = logs.filter(
        log => log instanceof EventLog && log.fragment?.name === eventName,
    );
    const firstEvent = filteredLogs[0];

    if (firstEvent) {
        res = (firstEvent as EventLog).args;
    }
    return res;
}

export async function findRequestRedeemEvent(tx: ContractTransactionResponse) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const iSupplyManager = ISupplyManager__factory.createInterface();
    // get event on supplyManager
    const { data, topics } = receipt!.logs[2]!;
    const event = iSupplyManager.decodeEventLog('RedeemRequest', data, topics);

    return {
        operationId: event[0] as bigint,
        agentAddress: event[1] as AddressLike,
        redeemShares: event[2] as bigint,
        redeemValue: event[3] as bigint,
    };
}
