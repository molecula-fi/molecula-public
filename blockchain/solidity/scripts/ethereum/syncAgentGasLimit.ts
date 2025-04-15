/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { ethers } from 'hardhat';

import { ContractsCarbon } from '@molecula-monorepo/blockchain.addresses/deploy/devnet';

// Constants
const BASE = 0x100;
const UNIT = 0x200;

const MESSAGE_TYPES = {
    REQUEST_DEPOSIT: 0x01,
    CONFIRM_DEPOSIT: 0x02,
    REQUEST_REDEEM: 0x03,
    CONFIRM_REDEEM: 0x04,
    DISTRIBUTE_YIELD: 0x05,
    CONFIRM_DEPOSIT_AND_UPDATE_ORACLE: 0x06,
    DISTRIBUTE_YIELD_AND_UPDATE_ORACLE: 0x07,
    UPDATE_ORACLE: 0x08,
};

async function syncAgentGasLimit() {
    // Contract instances
    const agentOld = await ethers.getContractAt(
        'AgentLZ',
        '0xD7D8cbA8a95b116DE3ed28A26DbB52Ef722FA911',
    );

    const agentNew = await ethers.getContractAt(
        'AgentLZ',
        ContractsCarbon.eth.agentLZ, // ← replace with actual address
    );

    const results = [];
    for (const [name, msgType] of Object.entries(MESSAGE_TYPES)) {
        const baseKey = BASE + msgType;
        const unitKey = UNIT + msgType;

        const baseGas = await agentOld.gasLimit(baseKey);
        const unitGas = await agentOld.gasLimit(unitKey);

        results.push({ name, msgType, baseGas, unitGas });
    }

    for (const { name, msgType, baseGas, unitGas } of results) {
        // Optional: skip if both are 0
        if (baseGas === 0n && unitGas === 0n) {
            console.log(
                `Skipped ${name} (msgType: 0x${msgType.toString(16)}) — both base and unit are 0`,
            );
            continue;
        }

        try {
            const tx = await agentNew.setGasLimit(msgType, baseGas, unitGas);
            await tx.wait(); // Wait for transaction to be mined before proceeding

            console.log(`Set gasLimit for ${name} (msgType: 0x${msgType.toString(16)})`);
            console.log(`   → base: ${baseGas.toString()}, unit: ${unitGas.toString()}`);
        } catch (err) {
            console.error(
                `Failed to set gasLimit for ${name} (msgType: 0x${msgType.toString(16)})`,
            );
            console.error(`   ↪︎ Reason: ${err.reason || err.message}`);
        }
    }
}

syncAgentGasLimit()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
