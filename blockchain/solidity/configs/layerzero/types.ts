/**
 * ULN (Ultra Light Node) configuration for a single library direction.
 *
 * - confirmations:          How many block confirmations to await before trusting the DVN.
 * - requiredDVNCount:       Minimum number of DVNs required to sign/relay a message.
 * - optionalDVNCount:       Number of extra DVNs you may include (for redundancy).
 * - optionalDVNThreshold:   How many of the optional DVNs must sign before they’re counted.
 * - requiredDVNs:           Array of on-chain addresses for the required DVNs.
 * - optionalDVNs:           Array of on-chain addresses for the optional DVNs.
 */
export interface UlnConfig {
    confirmations: number;
    requiredDVNCount: number;
    optionalDVNCount: number;
    optionalDVNThreshold: number;
    requiredDVNs: string[];
    optionalDVNs: string[];
}

/**
 * Executor configuration.
 *
 * - maxMessageSize:   Maximum payload size (in bytes) the executor can process in one go.
 * - executorAddress:  Address of the on-chain executor contract for delivering messages.
 */
export interface ExecutorConfig {
    maxMessageSize: number;
    executorAddress: string;
}

/**
 * Describes the gas budget configuration for a single on-chain message type.
 *
 * - msgType:    Unique message identifier (hex code) corresponding to the LayerZero message action.
 * - MsgTypes:
 *               0x01: REQUEST_DEPOSIT,
 *               0x02: CONFIRM_DEPOSIT,
 *               0x03: REQUEST_REDEEM,
 *               0x04: CONFIRM_REDEEM,
 *               0x05: DISTRIBUTE_YIELD,
 *               0x06: CONFIRM_DEPOSIT_AND_UPDATE_ORACLE,
 *               0x07: DISTRIBUTE_YIELD_AND_UPDATE_ORACLE,
 *               0x08: UPDATE_ORACLE.
 * - baseGas:   Fixed gas amount reserved for executing the message, regardless of payload size.
 * - unitGas:   Additional gas per “unit” of data or per logical operation, used to scale with message complexity.
 */
export interface GasSetting {
    msgType: number;
    baseGas: number;
    unitGas: number;
}

/**
 * Bundles together all gas-budget settings for the two core OAPP roles.
 *
 * - agentGasLimits:               Array of GasSetting entries used by “agentLZ” contracts to confirm deposits,
 *                                 redeem requests, distribute yield, and update oracles.
 * - accountantGasLimits:          Array of GasSetting entries used by “accountantLZ” contracts to request
 *                                 deposits and redeemals.
 */
export interface GasLimitsConfig {
    agentGasLimits: GasSetting[];
    accountantGasLimits: GasSetting[];
}
