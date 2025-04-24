import {
    type DevnetContractAccountantAgent,
    type DevnetContractsCore,
    type DevnetContractsNitrogen,
    type DevnetContractsCarbon,
} from './devnet';
import {
    type MainBetaContractsCarbon,
    type MainBetaContractAccountantAgent,
    type MainBetaContractsCore,
    type MainBetaContractsNitrogen,
} from './mainnet/beta';
import {
    type MainProdContractAccountantAgent,
    type MainProdContractsCarbon,
    type MainProdContractsCore,
    type MainProdContractsNitrogen,
} from './mainnet/prod';

export * from './devnet';
export * from './mainnet/beta';
export * from './mainnet/prod';

export type ContractsCore =
    | typeof DevnetContractsCore
    | typeof MainBetaContractsCore
    | typeof MainProdContractsCore;

export type ContractsNitrogen =
    | typeof DevnetContractsNitrogen
    | typeof MainBetaContractsNitrogen
    | typeof MainProdContractsNitrogen;

export type ContractsCarbon =
    | typeof DevnetContractsCarbon
    | typeof MainBetaContractsCarbon
    | typeof MainProdContractsCarbon;

export type ContractAccountantAgent =
    | typeof DevnetContractAccountantAgent
    | typeof MainBetaContractAccountantAgent
    | typeof MainProdContractAccountantAgent;
