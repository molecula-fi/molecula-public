// Export typechain

export * from '../typechain';

export * from '../typechain/common';

export type {
    AgentLZ,
    RebaseToken,
    SupplyManager,
    MUSDE,
    MoleculaPool,
    MoleculaPoolTreasury,
    MUSDLock,
    Oracle,
    AccountantAgent,
    ILayerZeroEndpointV2,
    IERC20Basic,
    IERC20Metadata,
    ICurveStableSwapFactoryNG,
    ICurveStableSwapNG,
} from '@molecula-monorepo/solidity/typechain-types';

const contractsNames = [
    'RebaseToken',
    'SupplyManager',
    'AgentLZ',
    'ERC20',
    'ERC4626',
    'IERC20Basic',
    'IERC20Metadata',
    'MUSDE',
    'MoleculaPool',
    'MoleculaPoolTreasury',
    'MUSDLock',
    'Oracle',
    'AccountantAgent',
    'StakedUSDe',
    'SavingsUSDS',
    'SFrxUSD',
    'SwftSwap',
    'AavePool',
    'SparkPool',
    'EndpointLZ',
    'SwapCurve',
    'ICurveStableSwapFactoryNG',
    'ICurveStableSwapNG',
] as const;

export type ContractNameType = (typeof contractsNames)[number];
