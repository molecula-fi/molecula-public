export enum AuthorizedType {
    // Ethereum
    AUTHORIZED_REDEEMER = 'AUTHORIZED_REDEEMER',
    AUTHORIZED_AGENT_SERVER = 'AUTHORIZED_AGENT_SERVER',
    AUTHORIZED_WMUSDT_SERVER = 'AUTHORIZED_WMUSDT_SERVER',
    AGENT_AUTHORIZED_LZ_CONFIGURATOR = 'AGENT_AUTHORIZED_LZ_CONFIGURATOR',

    // Tron
    ORACLE_AUTHORIZED_UPDATER = 'ORACLE_AUTHORIZED_UPDATER',
    ACCOUNTANT_AUTHORIZED_SERVER = 'ACCOUNTANT_AUTHORIZED_SERVER',
    TREASURY_AUTHORIZED_SERVER = 'TREASURY_AUTHORIZED_SERVER',
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR = 'ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR',
    TREASURY_AUTHORIZED_LZ_CONFIGURATOR = 'TREASURY_AUTHORIZED_LZ_CONFIGURATOR',
}

/**
 * Network types used for the contracts deployment.
 * Might include different stages within the same network.
 */
export enum NetworkType {
    'mainnet/beta' = 'mainnet/beta',
    'mainnet/prod' = 'mainnet/prod',
    devnet = 'devnet',
}

export enum MoleculaPoolVersion {
    v10 = '1.0',
    v11 = '1.1',
}

export function getMoleculaPoolVersion() {
    return Object.values(MoleculaPoolVersion).filter(item => {
        return isNaN(Number(item));
    });
}
