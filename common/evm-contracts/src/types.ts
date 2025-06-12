// Export typechain

export * from '../typechain';

export * from '../typechain/common';

export type {
    AgentLZ,
    RebaseToken,
    SupplyManager,
    MUSDE,
    MoleculaPoolTreasury,
    MUSDLock,
    IOracle,
    AccountantAgent,
    ILayerZeroEndpointV2,
    IERC20Basic,
    IERC20Metadata,
    ICurveStableSwapFactoryNG,
    ICurveStableSwapNG,
    UsdtOFT,
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
    'MoleculaPoolTreasury',
    'MUSDLock',
    'IOracle',
    'AccountantAgent',
    'StakedUSDe',
    'SavingsUSDS',
    'SFrxUSD',
    'AavePool',
    'SparkPool',
    'EndpointLZ',
    'SwapCurve',
    'ICurveStableSwapFactoryNG',
    'ICurveStableSwapNG',
    'UsdtOFT',
    'Aragon',
] as const;

export type ContractNameType = (typeof contractsNames)[number];
