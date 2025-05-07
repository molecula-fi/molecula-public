export enum AuthorizedType {
    // Ethereum
    AGENT_AUTHORIZED_LZ_CONFIGURATOR = 'AGENT_AUTHORIZED_LZ_CONFIGURATOR',

    // Tron
    ORACLE_AUTHORIZED_UPDATER = 'ORACLE_AUTHORIZED_UPDATER',
    ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR = 'ACCOUNTANT_AUTHORIZED_LZ_CONFIGURATOR',
}

/**
 * Network types used for the contracts deployment.
 * Might include different stages within the same network.
 */
export enum EnvironmentType {
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
