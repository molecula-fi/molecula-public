import type { ContractRunner, Provider } from 'ethers';

import type { MoleculaPoolTreasury } from '@molecula-monorepo/solidity/typechain-types';

import type {
    AgentLZ,
    MoleculaPool,
    MUSDLock,
    RebaseToken,
    SupplyManager,
    Oracle,
    AccountantAgent,
    ILayerZeroEndpointV2,
    MUSDE,
    ERC20,
    ERC4626,
    StakedUSDe,
    SavingsUSDS,
    SFrxUSD,
    AavePool,
    SwftSwap,
    PostfixOverrides,
    IERC20Basic,
    ICurveStableSwapFactoryNG,
    ICurveStableSwapNG,
    IERC20Metadata,
    SparkPool,
} from '../types';

type AnyFunction = () => void;
type PickFunctions<T> = { [K in keyof T as T[K] extends AnyFunction ? K : never]: T[K] };

export type EvmContractSafeViewCallArgs<
    Contract extends PickFunctions<Contract>,
    Method extends keyof Contract,
> = PostfixOverrides<Parameters<Contract[Method]>, 'view'>;

export type EvmContractSafeCallArgs<
    Contract extends PickFunctions<Contract>,
    Method extends keyof Contract,
> = PostfixOverrides<Parameters<Contract[Method]>, 'nonpayable'>;

export type EvmContractSafeViewCall<Contract extends PickFunctions<Contract>> = <
    Method extends keyof Contract,
>(
    method: Method,
    ...args: PostfixOverrides<Parameters<Contract[Method]>, 'view'>
) => Promise<Awaited<ReturnType<Contract[Method]>>>;

export type EvmContractSafeCall<Contract extends PickFunctions<Contract>, Response> = <
    Method extends keyof Contract,
>(
    method: Method,
    ...args: PostfixOverrides<Parameters<Contract[Method]>, 'nonpayable'>
) => Promise<Response>;

export type AllEvmContracts =
    | MoleculaPool
    | MoleculaPoolTreasury
    | AgentLZ
    | AccountantAgent
    | ERC20
    | ERC4626
    | IERC20Basic
    | IERC20Metadata
    | RebaseToken
    | MUSDLock
    | SupplyManager
    | Oracle
    | StakedUSDe
    | SavingsUSDS
    | SFrxUSD
    | ILayerZeroEndpointV2
    | MUSDE
    | SwftSwap
    | AavePool
    | SparkPool
    | ICurveStableSwapFactoryNG
    | ICurveStableSwapNG;

export type ProviderOrRunner = Provider | ContractRunner;
