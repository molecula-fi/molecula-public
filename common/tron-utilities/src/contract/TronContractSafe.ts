/*  eslint-disable max-lines */
import BigNumber from 'bignumber.js';

import { AbiCoder, type JsonFragment } from 'ethers';

import { type DecodedError, ErrorDecoder } from 'ethers-decode-error';

import PQueue from 'p-queue';

import type { TronWeb } from 'tronweb';

import type { TronContract } from 'tronweb/interfaces';

import type { Hex } from '@molecula-monorepo/common.evm-utilities';

import { jsonStringifyBigint, Log } from '@molecula-monorepo/common.utilities';

import { TronSubscriber, waitForTronTransaction } from '../tron';

import type { TronAddress } from '../types';

import { parseError, SafeCallError } from './errors';

import type {
    AllTronContracts,
    TronSafeTxCall,
    TronSafeViewCall,
    TronSafeSubscriber,
    TronSafeEventsLoad,
    TronSafePayableTxCall,
    LoadEventsFilter,
    TronContractParams,
    TronSafeCreateTx,
    TronContractTransaction,
    TronSafeEstimateEnergy,
    TronSafeBuildParams,
} from './types';

const log = new Log('TronUtilities:TronContractSafe');

/**
 * Queue to limit same time queries amount (to avoid rate limit error)
 * Interval: 1000 ms - 1 sec
 * IntervalCap: 10 - 10 requests per second
 */
const safeCallQueue = new PQueue({ intervalCap: 10, interval: 1000 });

enum Priority {
    Low = 1,
    High = 2,
}

export class TronContractSafe<Contract extends AllTronContracts> {
    /**
     * TronWeb runner
     */
    public readonly client: TronWeb;

    private readonly abi: JsonFragment[];

    private readonly apiUrl: string | undefined;

    /**
     * Contract instance
     */
    protected contract: TronContract;

    /**
     * A error decoder.
     */
    private errorDecoder: ErrorDecoder;

    public constructor(params: TronContractParams) {
        const { contractAddress, client, abi, apiUrl } = params;

        this.client = client;

        this.abi = abi;

        this.apiUrl = apiUrl;

        this.contract = this.client.contract(abi, contractAddress);

        this.errorDecoder = ErrorDecoder.create([abi]);
    }

    /**
     * Contract address
     */
    public get address(): TronAddress {
        return this.contract.address as TronAddress;
    }

    /**
     * Build transaction
     * @param txData - tx data
     * @param method - Method name
     * @param args - Method arguments
     */
    public safeCreateTx: TronSafeCreateTx<Contract> = async (
        txData,
        method,
        ...args
    ): Promise<TronContractTransaction> => {
        const { fromAddress, feeLimit, callValue } = txData;
        const methodName = method.toString();

        const { parameters, selectorTypes } = this.buildParameters(txData, method, ...args);

        const functionSelector = `${methodName}(${selectorTypes.join(',')})`;

        const callOptions: { feeLimit?: string | number; callValue?: string | number } = {};
        if (feeLimit) {
            callOptions.feeLimit = feeLimit;
        }
        if (callValue) {
            callOptions.callValue = callValue;
        }

        const result = await this.client.transactionBuilder.triggerSmartContract(
            this.contract.address,
            functionSelector,
            callOptions,
            parameters,
            fromAddress,
        );

        const { transaction } = result as unknown as { transaction: TronContractTransaction };

        return transaction;
    };

    /**
     * Safely calling a contract view method
     * @param method - Method name
     * @param args - Method arguments
     */
    public safeViewCall: TronSafeViewCall<Contract> = async (method, ...args) => {
        try {
            // @ts-ignore
            return await safeCallQueue.add(() => this.contract[method](...args).call(), {
                priority: Priority.Low,
            });
        } catch (error) {
            throw new SafeCallError('Fail tron safe view call', {
                method: method as string,
                args: JSON.parse(jsonStringifyBigint(args)),
                parentError: parseError(error),
            });
        }
    };

    /**
     * Safely calling a contract transaction method
     * @param method - Method name
     * @param args - Method arguments
     */
    public safeTxCall: TronSafeTxCall<Contract> = async (method, ...args) => {
        let tx: Hex;

        try {
            // @ts-ignore
            tx = await safeCallQueue.add(() => this.contract[method](...args).send(), {
                priority: Priority.High,
            });
        } catch (error) {
            throw new SafeCallError('Fail tron safe tx send', {
                method: method as string,
                args: JSON.parse(jsonStringifyBigint(args)),
                parentError: parseError(error),
            });
        }

        await waitForTronTransaction(this.client, tx);

        return tx;
    };

    /**
     * Safely calling a contract transaction method
     * @param method - Method name
     * @param value - Amount of TRX transferred with this transaction, measured in SUN (1 TRX = 1,000,000 SUN)
     * @param args - Method arguments
     */
    public safePayableTxCall: TronSafePayableTxCall<Contract> = async (method, value, ...args) => {
        let tx: Hex;

        try {
            tx = await safeCallQueue.add(
                // @ts-ignore
                () => this.contract[method](...args).send({ callValue: value }),
                { priority: Priority.High },
            );
        } catch (error) {
            throw new SafeCallError('Fail tron safe payable tx send', {
                method: method as string,
                value: value.toString(),
                args: JSON.parse(jsonStringifyBigint(args)),
                parentError: parseError(error),
            });
        }

        await waitForTronTransaction(this.client, tx);

        return tx;
    };

    /**
     * Create subscriber for listen events
     * @param filterName - Filter name
     * @param callback - Callback function for events
     */
    public createSubscriber: TronSafeSubscriber<Contract> = async (filterName, callback) => {
        const eventName = filterName as string;
        const subscriber = new TronSubscriber(this.contract, eventName);
        try {
            await subscriber.start(callback);

            return subscriber;
        } catch (error) {
            console.error(`Failed to start ${eventName} event subscription with error`, error);
            throw error;
        }
    };

    /**
     * Load last events
     * @param filterName - Filter name
     * @param filterOptions - Filter options
     */
    public loadLastEvents: TronSafeEventsLoad<Contract> = async (
        filterName,
        filterOptions?: LoadEventsFilter | null,
    ) => {
        const eventName = filterName as string;
        const sinceTimestamp = filterOptions?.timestamp;

        const subscriber = new TronSubscriber(this.contract, eventName);

        return subscriber.loadLastEvents({ sort: 'block_timestamp', sinceTimestamp });
    };

    /**
     * Decode information about contract call error
     * @param error - error by contract
     * @returns human readable error reason
     */
    public async decodeError(error: unknown): Promise<DecodedError> {
        return this.errorDecoder.decode(error);
    }

    /**
     * Estimate energy of contract method
     * @param txData - tx data
     * @param method - Method name
     * @param args - Method arguments
     */
    public estimateEnergy: TronSafeEstimateEnergy<Contract> = async (
        txData,
        method,
        ...args
    ): Promise<string> => {
        try {
            if (!this.apiUrl) {
                throw new Error('apiUrl is not set');
            }

            const { fromAddress, callValue } = txData;

            const methodName = method.toString();

            const { parameters, selectorTypes } = this.buildParameters(txData, method, ...args);

            const functionSelector = `${methodName}(${selectorTypes.join(',')})`;

            const parameter = await this.encodeParams(parameters);

            const energy = await this.estimateEnergyRequest({
                owner_address: fromAddress,
                contract_address: this.contract.address,
                function_selector: functionSelector,
                parameter,
                visible: true,
                call_value: callValue ? +callValue : undefined,
            });

            const energyPrices = await this.getEnergyPricesRequest();

            return new BigNumber(energy.toString())
                .multipliedBy(energyPrices[energyPrices.length - 1] ?? 0)
                .toString();
        } catch (error) {
            if (error instanceof SafeCallError) {
                const safeCallError = error as SafeCallError;
                safeCallError.details.method = method as string;
                safeCallError.details.args = JSON.parse(jsonStringifyBigint(args));
                safeCallError.details.txData = jsonStringifyBigint(txData);

                throw safeCallError;
            }

            throw new SafeCallError('Failed to load energy', {
                method: method as string,
                args: JSON.parse(jsonStringifyBigint(args)),
                txData: jsonStringifyBigint(txData),
                parentError: parseError(error),
            });
        }
    };

    // Internals

    /**
     * An utility to build parameters and selectorTypes
     */
    private buildParameters: TronSafeBuildParams<Contract> = (txData, method, ...args) => {
        const methodName = method.toString();

        const abiItem = this.abi.find(item => item.type === 'function' && item.name === method);
        if (!abiItem) {
            throw new SafeCallError(`Not found method in abi`, {
                method: methodName,
                args: JSON.parse(jsonStringifyBigint(args)),
                txData: jsonStringifyBigint(txData),
            });
        }

        const selectorTypes: string[] = [];

        if (abiItem.inputs && abiItem.inputs.length !== args.length) {
            throw new SafeCallError('Invalid args count', {
                method: methodName,
                args: JSON.parse(jsonStringifyBigint(args)),
                txData: jsonStringifyBigint(txData),
                abiItem,
            });
        }

        const parameters = abiItem.inputs
            ? abiItem.inputs.map((input, index) => {
                  if (!input.type) {
                      throw new SafeCallError('Invalid abi input', {
                          method: methodName,
                          args: JSON.parse(jsonStringifyBigint(args)),
                          txData: jsonStringifyBigint(txData),
                          index,
                          input,
                      });
                  }

                  selectorTypes.push(input.type);
                  return {
                      type: input.type,
                      value: args[index],
                  };
              })
            : [];

        return { parameters, selectorTypes };
    };

    private ADDRESS_PREFIX_REGEX = /^(41)/;

    /**
     * An utility to encode parameters
     */
    private async encodeParams(
        inputs: {
            type: string;
            value: unknown;
        }[],
    ) {
        const typesValues = inputs;
        let parameters = '';

        if (typesValues.length === 0) {
            return parameters;
        }
        const abiCoder = new AbiCoder();
        const types = [];
        const values = [];

        for (let i = 0; i < typesValues.length; i += 1) {
            if (typesValues[i]) {
                // eslint-disable-next-line prefer-const
                let { type, value } = typesValues[i]!;
                if (type === 'address') {
                    value = this.client.address
                        .toHex(value as string)
                        .replace(this.ADDRESS_PREFIX_REGEX, '0x');
                } else if (type === 'address[]') {
                    value = (value as string[]).map(v =>
                        this.client.address.toHex(v).replace(this.ADDRESS_PREFIX_REGEX, '0x'),
                    );
                }
                types.push(type);
                values.push(value);
            }
        }

        try {
            parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
        } catch (err) {
            log.error('Unable to encode params', err);
        }
        return parameters;
    }

    /**
     * An utility to get estimate energy
     */
    private estimateEnergyRequest = async (body: {
        owner_address: string;
        contract_address: string;
        function_selector: string;
        parameter: string;
        visible: boolean;
        call_value?: number | undefined;
    }) => {
        const options = {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify(body),
        };

        const result = await fetch(`${this.apiUrl}/wallet/estimateenergy`, options);
        const data = (await result.json()) as
            | {
                  energy_required: bigint;
                  result: { result: true };
                  message?: string;
                  code?: string;
              }
            | {
                  result: { message: string; code: string };
              };

        if ('energy_required' in data && data.energy_required) {
            return data.energy_required;
        }

        throw new SafeCallError(`Estimate energy error`, {
            apiResponse: data.result,
        });
    };

    /**
     * An utility to get energy prices
     */
    private getEnergyPricesRequest = async () => {
        const url = `${this.apiUrl}/wallet/getenergyprices`;
        const options = { method: 'GET' };

        const result = await fetch(url, options);
        const data = (await result.json()) as { prices: string };

        return data.prices.split(':');
    };
}
