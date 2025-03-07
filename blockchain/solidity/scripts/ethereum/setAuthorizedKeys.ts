// "set:keys:production": "dotenv  -e .env.production hardhat run scripts/ethereum/setAuthorizedKeys.ts --network sepolia",
// "set:keys:test": "                                 hardhat run scripts/ethereum/setAuthorizedKeys.ts --network sepolia",

// import { ethers } from 'hardhat';
//
// export async function setAuthorizedKeys() {
//     console.log('Block #', await ethers.provider.getBlockNumber());
//
//     const agent = await ethers.getContractAt(
//         'AgentLZ',
//         '0x67e17e5796FF421fA8F34fE66728f8ac15C4A3Ab',
//     );
//     let tx = await agent.setAuthorizedServer('0x99EC47D28FB39d1888b025Cf4B33765043c41353');
//     await tx.wait();
//     tx = await agent.setAuthorizedLZConfigurator('0x99EC47D28FB39d1888b025Cf4B33765043c41353');
//     await tx.wait();
//     const newAgentServer = await agent.authorizedServer();
//     const newAgentLZConfigurator = await agent.authorizedLZConfigurator();
//     console.log('agent server', newAgentServer, 'agent lz configurator', newAgentLZConfigurator);
//
//     const wmUSDT = await ethers.getContractAt(
//         'WmUsdtToken',
//         '0x73208c82c4Fb3f43Bb9a80d2594Dd2b696Fd38c5',
//     );
//     tx = await wmUSDT.setAuthorizedServer('0x99EC47D28FB39d1888b025Cf4B33765043c41353');
//     await tx.wait();
//     tx = await wmUSDT.setAuthorizedLZConfigurator('0x99EC47D28FB39d1888b025Cf4B33765043c41353');
//     await tx.wait();
//     const newwmUSDTServer = await wmUSDT.authorizedServer();
//     const newwmUSDTLZConfigurator = await wmUSDT.authorizedLZConfigurator();
//     console.log(
//         'wmUSDT server',
//         newwmUSDTServer,
//         'wmUSDT lz configurator',
//         newwmUSDTLZConfigurator,
//     );
// }
