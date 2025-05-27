// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;
/// @title Deposit Managers's Interface
/// @notice Defines the functions and events required for pool data management.
interface IBufferInteractor {
    /**
     * @dev Encodes data for deposit into Pool.
     * @param asset Address of deposit token.
     * @param receiver Address of LP token receiver.
     * @param amount Deposit value.
     * @return bytes encoded message for deposit transaction.
     */
    function encodeSupply(
        address asset,
        address receiver,
        uint256 amount
    ) external pure returns (bytes memory);

    /**
     * @dev Encodes data for withdraw from Pool.
     * @param asset Address of deposit token.
     * @param receiver Address of LP token receiver.
     * @param amount Deposit value.
     * @return bytes encoded message for withdraw transaction.
     */
    function encodeWithdraw(
        address asset,
        address receiver,
        uint256 amount
    ) external pure returns (bytes memory);

    /**
     * @dev Gets withdrawable balance of ETH.
     * @param pool Address of protocol actual balance storage.
     * @param asset Address of deposit token.
     * @param owner Address of LP token owner.
     * @return withdrawable ETH balance.
     */
    function getEthBalance(
        address pool,
        address asset,
        address owner
    ) external view returns (uint256);
}
