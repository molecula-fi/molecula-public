// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IDelegationManager} from "../external/interfaces/IDelegationManager.sol";
import {BeaconChainProofs} from "../external/libraries/BeaconChainProofs.sol";

/// @title Deposit Managers's Interface
/// @notice Defines the functions and events required for pool data management.
interface IDepositManager {
    /**
     * @dev Emitted when processing deposits.
     * @param token Deposit token address.
     * @param vault Token vault address.
     * @param value A deposited amount.
     */
    event Deposit(address indexed token, address indexed vault, uint256 indexed value);

    /**
     * @dev Emitted when processing deposits into EigenLayer.
     * @param value Deposit value.
     * @param pubkey A BLS12-381 public key.
     * @param signature A BLS12-381 signature.
     * @param depositDataRoot The SHA-256 hash of the SSZ-encoded DepositData object.
     */
    event StakeNative(
        uint256 indexed value,
        bytes pubkey,
        bytes signature,
        bytes32 depositDataRoot
    );

    /// @dev Emitted when the `isStakePaused` flag is changed.
    /// @param newValue New value.
    event IsStakePausedChanged(bool indexed newValue);

    /// @dev Error indicating Deposit Manager is already initialized.
    error EInitialized();

    /// @dev Error indicating incorrect array length.
    error EIncorrectLength();

    /// @dev Error indicating that the native value amount not match to msg.value.
    error EIncorrectNativeValue();

    /// @dev Error indicating that the buffered amount exceeds the value stored in the buffer.
    error ENoNeedToStake();

    /// @dev Error indicating that the value amount not enough for deposit into EignenLayer.
    error ETooHighDepositValue();

    /// @dev Error: `msg.sender` is not authorized for some function.
    error EBadSender();

    /// @dev Throws an error if the operation status is incorrect.
    error EBadOperationStatus();

    /// @dev Throws an error if the poolId doesn't match the position in the array
    error EWrongPoolId();

    /// @dev Throws an error if the sum of portion is not equal to `1`.
    error EWrongPortion();

    /// @dev Throws an error if the buffer percentage is invalid.
    error EInvalidPercentage();

    /// @dev Error: The `stake` and `delegate` functions are called while being paused as the `isStakePaused` flag is set.
    error EStakePaused();

    /**
     * @dev Process a deposit into the Pools.
     * @param requestId Deposit operation unique identifier.
     * @param token Deposit token address.
     * @param vault Token vault address.
     * @param value A deposited amount.
     * @return moleculaTokenAmount Deposited amount of tokens.
     */
    function deposit(
        uint256 requestId,
        address token,
        address vault,
        uint256 value
    ) external payable returns (uint256);

    /**
     * @dev Process a deposit into the EigenLayer.
     * @param value Deposit value.
     * @param pubkey A BLS12-381 public key.
     * @param signature A BLS12-381 signature.
     * @param depositDataRoot The SHA-256 hash of the SSZ-encoded DepositData object.
     */
    function stakeNative(
        uint256 value,
        bytes calldata pubkey,
        bytes calldata signature,
        bytes32 depositDataRoot
    ) external;

    /**
     * @dev Verify one or more validators have their withdrawal credentials pointed at this EigenPod, and award
     * shares based on their effective balance. Proven validators are marked `ACTIVE` within the EigenPod, and
     * future checkpoint proofs will need to include them.
     * @dev Withdrawal credential proofs MUST NOT be older than `currentCheckpointTimestamp`.
     * @dev Validators proven via this method MUST NOT have an exit epoch set already.
     * @param beaconTimestamp the beacon chain timestamp sent to the 4788 oracle contract. Corresponds
     * to the parent beacon block root against which the proof is verified.
     * @param stateRootProof proves a beacon state root against a beacon block root
     * @param validatorIndices a list of validator indices being proven
     * @param validatorFieldsProofs proofs of each validator's `validatorFields` against the beacon state root
     * @param validatorFields the fields of the beacon chain "Validator" container. See consensus specs for
     * details: https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#validator
     */
    function verifyWithdrawalCredentials(
        uint64 beaconTimestamp,
        BeaconChainProofs.StateRootProof calldata stateRootProof,
        uint40[] calldata validatorIndices,
        bytes[] calldata validatorFieldsProofs,
        bytes32[][] calldata validatorFields
    ) external;

    /**
     * @dev Delegate shares to an AVS operator.
     * @param operator Address of operator for delegation.
     * @param approverSignatureAndExpiry Operator's signature for delegation.
     * @param approverSalt Unique data to prevent signature collisions.
     */
    function delegateTo(
        address operator,
        IDelegationManager.SignatureWithExpiry memory approverSignatureAndExpiry,
        bytes32 approverSalt
    ) external;

    /**
     * @dev Undelegate shares from old AVS operator to new AVS operator.
     * @param operator Address of operator for delegation.
     * @param approverSignatureAndExpiry Operator's signature for delegation.
     * @param approverSalt Unique data to prevent signature collisions.
     */
    function redelegate(
        address operator,
        IDelegationManager.SignatureWithExpiry memory approverSignatureAndExpiry,
        bytes32 approverSalt
    ) external;

    /**
     * @dev Undelegate shares from current AVS operator.
     * @return withdrawalRoots data for unstake deposited amount.
     */
    function undelegate() external returns (bytes32[] memory);

    /**
     * @dev Returns the formatted total supply of the protocol ETH (TVL).
     * @return res Total ETH supply.
     */
    function totalSupply() external view returns (uint256 res);
}
