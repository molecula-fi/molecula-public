// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;
/// @title Deposit Managers's Types Interface
/// @notice Defines the structs and enums of Deposit Manager contract.
interface IDepositManagerTypes {
    /**
     * @dev Enum of operation statuses.
     */
    enum OperationStatus {
        None, // operation doesn't exist
        Pending, // operation is pending confirmation
        Confirmed // operation confirmed
    }

    /**
     * @dev Struct to store the redeem operation information.
     * @param value Operation-associated value on the withdrawal.
     * @param status Operation status.
     */
    struct RedeemOperationInfo {
        uint256 value;
        OperationStatus status;
    }

    /**
     * @dev Struct to store the yield for a party.
     * @param party User address.
     * @param portion Yield portion.
     */
    struct Party {
        address party;
        uint256 portion;
    }

    /**
     * @dev Struct to store pool data.
     * @param poolToken Address of pool rebase token.
     * @param poolLib Address of interactor library.
     * @param poolPortion Percentage distribution of funds into pool.
     * @param poolId Id of pool in poolsArray.
     */
    struct PoolData {
        address poolToken;
        address poolLib;
        uint128 poolPortion;
        uint128 poolId;
    }
}
