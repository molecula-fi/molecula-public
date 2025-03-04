import { type BytesLike, type ParamType, ethers } from 'ethers';

const { AbiCoder } = ethers;
const ADDRESS_PREFIX = '0x';

/**
 * Decode data string
 * @param types - Parameter type list, if the function has multiple return values, the order of the types in the list should conform to the defined order
 * @param output - Data before decoding
 * @param ignoreMethodHash - Decode the function return value, fill falseMethodHash with false, if decode the data field in the gettransactionbyid result, fill ignoreMethodHash with true
 * @returns Array of decoded params
 */
export async function decodeParams(
    types: ReadonlyArray<string | ParamType>,
    output: BytesLike,
    ignoreMethodHash: boolean,
) {
    if (!output || typeof output === 'boolean') {
        // eslint-disable-next-line no-param-reassign
        ignoreMethodHash = !!output;
        // eslint-disable-next-line no-param-reassign
        output = types as unknown as BytesLike;
    }

    if (ignoreMethodHash && (output as string).replace(/^0x/, '').length % 64 === 8) {
        // eslint-disable-next-line no-param-reassign
        output = `0x${(output as string).replace(/^0x/, '').substring(8)}`;
    }

    const abiCoder = new AbiCoder();

    if ((output as string).replace(/^0x/, '').length % 64) {
        throw new Error('The encoded string is not valid. Its length must be a multiple of 64.');
    }
    return abiCoder.decode(types, output).reduce((obj, arg, index) => {
        if (types[index] === 'address') {
            // eslint-disable-next-line no-param-reassign
            arg = ADDRESS_PREFIX + arg.substr(2).toLowerCase();
        }
        obj.push(arg);
        return obj;
    }, []);
}
