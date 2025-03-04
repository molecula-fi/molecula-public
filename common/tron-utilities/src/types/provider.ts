import type { TronWebConstructor } from 'tronweb/interfaces';

export type TronWebOptions = TronWebConstructor & {
    /**
     * Optional event server endpoint.
     */
    eventServer?: string;
};
