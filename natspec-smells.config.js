/**
 * List of supported options: https://github.com/defi-wonderland/natspec-smells?tab=readme-ov-file#options
 */

/* @type {import('@defi-wonderland/natspec-smells').Config} */
module.exports = {
    include: 'blockchain/solidity/**',
    exclude: ['blockchain/solidity/contracts/mock/**', 'blockchain/solidity/contracts/test/**'],
    enforceInheritdoc: false,
    constructorNatspec: true,
};
