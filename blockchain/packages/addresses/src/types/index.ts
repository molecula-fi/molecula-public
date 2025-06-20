export enum AuthorizedType {
    // Ethereum
    AGENT_AUTHORIZED_LZ_CONFIGURATOR = 'AGENT_AUTHORIZED_LZ_CONFIGURATOR',

    // Tron
    ORACLE_AUTHORIZED_UPDATER = 'ORACLE_AUTHORIZED_UPDATER',
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR = 'ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR',
}

/**
 * Network types used for the contract deployment.
 * Might include different stages within the same network.
 */
export enum EnvironmentType {
    'mainnet/beta' = 'mainnet/beta',
    'mainnet/prod' = 'mainnet/prod',
    devnet = 'devnet',
}
