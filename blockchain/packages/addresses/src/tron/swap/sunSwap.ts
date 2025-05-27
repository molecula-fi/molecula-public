import { TronChainIDs } from '../chains';
import type { TronAddress } from '../types';

export const tronSunSwapV3Addresses = {
    UniswapV3Factory: {
        [TronChainIDs.Mainnet]: 'TThJt8zaJzJMhCEScH7zWKnp5buVZqys9x' as TronAddress,
        [TronChainIDs.Shasta]: 'TVkDVi65Jgq9mF69fcoX2bAu1NMQJtAJxY' as TronAddress,
    },
    NonfungiblePositionManager: {
        [TronChainIDs.Mainnet]: 'TLSWrv7eC1AZCXkRjpqMZUmvgd99cj7pPF' as TronAddress,
        [TronChainIDs.Shasta]: 'TW1wS7Jb189rRgwkrkooZW6YYN9jx7j1rf' as TronAddress,
    },
    SwapRouter: {
        [TronChainIDs.Mainnet]: 'TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN' as TronAddress,
        [TronChainIDs.Shasta]: 'TXKkLmkpQVUCF6rsE1xTycWycmuCXhMwDQ' as TronAddress,
    },
} as const;
