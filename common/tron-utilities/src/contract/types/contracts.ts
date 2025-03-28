import type { JsonFragment } from 'ethers';

import type { TronWeb } from 'tronweb';

import type { TRC20 } from '@molecula-monorepo/common.tron-contracts';
import type { ILayerZeroEndpointV2 } from '@molecula-monorepo/solidity/typechain-types/@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces';

import type { MUSDLock } from '@molecula-monorepo/solidity/typechain-types/contracts/common/mUSDLock.sol';
import type { RebaseTokenCommon as RebaseToken } from '@molecula-monorepo/solidity/typechain-types/contracts/common/rebase';
import type {
    AccountantLZ,
    TronOracle as Oracle,
} from '@molecula-monorepo/solidity/typechain-types/contracts/solutions/Carbon/tron';

export type AllTronContracts =
    | RebaseToken
    | MUSDLock
    | Oracle
    | AccountantLZ
    | TRC20
    | ILayerZeroEndpointV2;

export type TronContractParams = {
    client: TronWeb;
    contractAddress: string;
    abi: JsonFragment[];
    apiUrl?: string | undefined;
};
