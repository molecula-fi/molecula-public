/* eslint-disable @typescript-eslint/no-explicit-any */

import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils';
import { bls12_381 as bls } from '@noble/curves/bls12-381';
import { sha256 } from '@noble/hashes/sha2';
import { type Signer } from 'ethers';

type Hex = `0x${string}`;

interface ERC2612PermitMessage {
    owner: string;
    spender: string;
    value: number | string;
    nonce: number | string;
    deadline: number | string;
}

interface RSV {
    r: string;
    s: string;
    v: number;
}

interface Domain {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
}

function createTypedERC2612Data(message: ERC2612PermitMessage, domain: Domain) {
    return {
        types: {
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        },
        primaryType: 'Permit',
        domain,
        message,
    };
}

function splitSignatureToRSV(signature: string): RSV {
    const r = `0x${signature.substring(2).substring(0, 64)}`;
    const s = `0x${signature.substring(2).substring(64, 128)}`;
    const v = parseInt(signature.substring(2).substring(128, 130), 16);

    return { r, s, v };
}

export async function signERC2612Permit(
    name: string,
    version: string,
    token: string,
    owner: string,
    spender: string,
    value: number | string,
    deadline: number | string,
    nonce: number | string,
    signer: Signer,
): Promise<ERC2612PermitMessage & RSV> {
    const message: ERC2612PermitMessage = {
        owner,
        spender,
        value,
        nonce,
        deadline,
    };

    const domain: Domain = {
        name,
        version,
        chainId: 31337,
        verifyingContract: token,
    };

    const typedData = createTypedERC2612Data(message, domain);

    const rawSignature = await signer.signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message,
    );

    const sig = splitSignatureToRSV(rawSignature);

    return { ...sig, ...message };
}

export function fromHexString(hex: string): Uint8Array {
    const hexString = hex.startsWith('0x') ? hex.slice(2) : hex;

    if (hexString.length % 2 !== 0) {
        throw new Error(`hex string length ${hexString.length} must be multiple of 2`);
    }
    return hexToBytes(hexString);
}

function toHex(bytes: Uint8Array): Hex {
    return `0x${bytesToHex(bytes)}` as Hex;
}

function calculatePubkeyRoot(pubkey: Hex): Uint8Array {
    const pubkeyBytes = fromHexString(pubkey);
    const pubkeyPadded = new Uint8Array([...pubkeyBytes, ...new Uint8Array(16)]);
    return sha256(pubkeyPadded);
}

function calculateSignatureRoot(signature: Hex): Uint8Array {
    const signatureBytes = fromHexString(signature);
    const sigPart1 = signatureBytes.slice(0, 64);
    const sigPart2 = new Uint8Array([...signatureBytes.slice(64), ...new Uint8Array(32)]);
    return sha256(new Uint8Array([...sha256(sigPart1), ...sha256(sigPart2)]));
}

function calculateAmountPadded(amount: number): Uint8Array {
    const amountBytes = new Uint8Array(8);
    new DataView(amountBytes.buffer).setBigUint64(0, BigInt(amount), true);
    return new Uint8Array([...amountBytes, ...new Uint8Array(24)]);
}

function calculateDepositDataRoot(
    pubkey: Hex,
    withdrawalCredentials: Hex,
    amount: number,
    signature: Hex,
): Hex {
    const pubkeyRoot = calculatePubkeyRoot(pubkey);
    const signatureRoot = calculateSignatureRoot(signature);
    const amountPadded = calculateAmountPadded(amount);

    const left = sha256(new Uint8Array([...pubkeyRoot, ...fromHexString(withdrawalCredentials)]));
    const right = sha256(new Uint8Array([...amountPadded, ...signatureRoot]));
    return toHex(sha256(new Uint8Array([...left, ...right])));
}

export function verifyDepositRoot(
    pubkey: Hex,
    withdrawalCredentials: Hex,
    amount: number,
    signature: Hex,
    expectedRoot: Hex,
): boolean {
    const depositDataRoot = calculateDepositDataRoot(
        pubkey,
        withdrawalCredentials,
        amount,
        signature,
    );
    return depositDataRoot === expectedRoot;
}

export function createValidatorKeys(withdrawalCredentials: string) {
    // Generate a random private key
    const privateKey = bls.utils.randomPrivateKey();

    // Convert withdrawal credentials to bytes
    const withdrawalBytes = fromHexString(withdrawalCredentials);

    // Create deposit message bytes
    const messageBytes = new Uint8Array([
        ...bls.getPublicKey(privateKey),
        ...withdrawalBytes,
        ...new Uint8Array(8).fill(0), // 32 ETH in gwei (little endian)
    ]);
    new DataView(messageBytes.buffer).setBigUint64(messageBytes.length - 8, BigInt(32e9), true);

    // Sign the message
    const signature = bls.sign(messageBytes, privateKey);

    // Create deposit data
    const generated = {
        pubkey: toHex(bls.getPublicKey(privateKey)),
        withdrawal_credentials: withdrawalCredentials as Hex,
        amount: 32000000000,
        signature: toHex(signature),
    };

    // Calculate and verify deposit data root
    const depositDataRoot = calculateDepositDataRoot(
        generated.pubkey,
        generated.withdrawal_credentials,
        generated.amount,
        generated.signature,
    );

    // Verify the deposit data
    const isValid = verifyDepositRoot(
        generated.pubkey,
        generated.withdrawal_credentials,
        generated.amount,
        generated.signature,
        depositDataRoot,
    );

    if (!isValid) {
        throw new Error('Generated deposit data verification failed');
    }

    return {
        privateKey: toHex(privateKey),
        ...generated,
        depositDataRoot,
    };
}
