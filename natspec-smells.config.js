/**
 * List of supported options: https://github.com/defi-wonderland/natspec-smells?tab=readme-ov-file#options
 */

/* @type {import('@defi-wonderland/natspec-smells').Config} */
module.exports = {
    include: 'blockchain/solidity/**',
    exclude: [
        'blockchain/solidity/contracts/mock/**',
        'blockchain/solidity/contracts/test/**',
        'blockchain/solidity/contracts/common/UsdtOFT.sol',
        'blockchain/solidity/contracts/common/interfaces/IUsdtOFT.sol',
    ],
    enforceInheritdoc: false,
    constructorNatspec: true,
};
