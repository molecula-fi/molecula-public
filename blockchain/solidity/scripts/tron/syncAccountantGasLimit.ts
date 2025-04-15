import TronWeb from 'tronweb';

import { ContractsCarbon } from '@molecula-monorepo/blockchain.addresses/deploy/devnet';

import { abi as AccountantLZ } from '../../artifacts/contracts/solutions/Carbon/tron/AccountantLZ.sol/AccountantLZ.json';
import { shastaConfig } from '../../configs/tron/shastaTyped';

const BASE = 0x100;
const UNIT = 0x200;

const MESSAGE_TYPES: Record<string, number> = {
    REQUEST_DEPOSIT: 0x01,
    CONFIRM_DEPOSIT: 0x02,
    REQUEST_REDEEM: 0x03,
    CONFIRM_REDEEM: 0x04,
    DISTRIBUTE_YIELD: 0x05,
    CONFIRM_DEPOSIT_AND_UPDATE_ORACLE: 0x06,
    DISTRIBUTE_YIELD_AND_UPDATE_ORACLE: 0x07,
    UPDATE_ORACLE: 0x08,
};
// TODO fix request redeem gas limit
async function syncAccountantGasLimit() {
    // Create TronWeb instance
    const tronWeb = new TronWeb({
        fullHost: shastaConfig.RPC_URL,
    });
    // Get private key
    const accountInfo = tronWeb.fromMnemonic(
        process.env.TRON_SEED_PHRASE as string,
        "m/44'/195'/0'/0/0",
    );
    if (accountInfo instanceof Error) {
        throw new Error('Invalid account information returned from fromMnemonic.');
    }
    const privateKey = accountInfo.privateKey.substring(2);
    tronWeb.setPrivateKey(privateKey);
    // get owner
    const initialOwner = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Initial owner:', initialOwner);

    // Define the smart contract address and ABI
    const oldAccountantAddress = 'TLkrjzX2jYWwMxTfdVRbJ41K4fFoh6952q';
    const oldAccountant = tronWeb.contract(AccountantLZ, oldAccountantAddress);

    const accountantAddress = ContractsCarbon.tron.accountantLZ;
    const accountant = tronWeb.contract(AccountantLZ, accountantAddress);

    const gasLimitPromises = Object.entries(MESSAGE_TYPES).map(async ([name, msgType]) => {
        const baseKey = BASE + msgType;
        const unitKey = UNIT + msgType;

        try {
            // @ts-ignore
            const baseGas = await oldAccountant.gasLimit(baseKey).call();
            // @ts-ignore
            const unitGas = await oldAccountant.gasLimit(unitKey).call();

            // Skip if both are 0
            // eslint-disable-next-line eqeqeq
            if (baseGas == 0 && unitGas == 0) {
                console.log(
                    `Skipped ${name} (msgType: 0x${msgType.toString(16)}) — both base and unit are 0`,
                );
                return;
            }

            await accountant.methods
                // @ts-ignore
                .setGasLimit(msgType, baseGas, unitGas)
                .send();

            console.log(`Set gasLimit for ${name} (msgType: 0x${msgType.toString(16)})`);
            console.log(`   → base: ${baseGas}, unit: ${unitGas}`);
        } catch (err) {
            console.error(`Failed to set gasLimit for ${name}`);
            console.error(`   ↪︎ Error:`, err);
        }
    });

    await Promise.all(gasLimitPromises);
}
syncAccountantGasLimit()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
