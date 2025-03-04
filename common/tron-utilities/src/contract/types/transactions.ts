type TronContract = {
    parameter: {
        type_url: string;
        value: Record<string, unknown>;
    };
    type: string;
};

interface TronContractTransactionRawData {
    contract: TronContract[];
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    fee_limit: number;
    timestamp: number;
}

export interface TronContractTransaction {
    visible: boolean;
    txID: string;
    raw_data: TronContractTransactionRawData;
    raw_data_hex: string;
    signature?: string[];
    [key: string]: unknown;
}
