// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title IMoleculaPoolV2.
/// @notice Interface for managing Molecula Pool operations.
/// @dev Defines core functions for pool deposits and redeems.
interface IMoleculaPoolV2 {
    // ============ Errors ============

    /// @dev Thrown when called with an unauthorized Supply Manager.
    error ENotMySupplyManager();

    // ============ Core Functions ============

    /// @dev Deposits assets to the pool.
    /// @param requestId Deposit operation's ID.
    /// @param token Deposit token.
    /// @param from Sender's address.
    /// @param assets Deposit amount.
    /// @return moleculaTokenAmount Formatted deposit amount.
    function deposit(
        uint256 requestId,
        address token,
        address from,
        uint256 assets
    ) external returns (uint256 moleculaTokenAmount);

    /// @dev Executes a Redemption operation request.
    /// @param requestId Redemption operation's ID.
    /// @param token Redemption ERC20 token.
    /// @param moleculaTokenAmount Formatted redeem operation value.
    /// @return assets Redemption assets.
    function requestRedeem(
        uint256 requestId,
        address token,
        uint256 moleculaTokenAmount
    ) external returns (uint256 assets);

    // ============ View Functions ============

    /// @dev Returns the total supply of the pool (TVL).
    /// @return pool Total pool supply.
    function totalSupply() external view returns (uint256 pool);

    // ============ Admin Functions ============

    /// @dev Adds a new token Vault.
    /// @param tokenVault Token Vault address to add.
    function addTokenVault(address tokenVault) external;

    /// @dev Removes a token Vault.
    /// @param tokenVault Token Vault address to remove.
    function removeTokenVault(address tokenVault) external;
}

/// @title IMoleculaPoolV2WithNativeToken.
/// @notice Interface for managing the native token operations in the Molecula Pool.
/// @dev Extends IMoleculaPoolV2 with the native token functionality.
interface IMoleculaPoolV2WithNativeToken is IMoleculaPoolV2 {
    /// @dev Deposits native tokens to the pool.
    /// @param requestId Deposit operation's ID.
    /// @param token Native token address.
    /// @param from Sender's address.
    /// @param assets Deposit amount in the native token.
    /// @return moleculaTokenAmount Formatted deposit amount.
    function depositNativeToken(
        uint256 requestId,
        address token,
        address from,
        uint256 assets
    ) external payable returns (uint256 moleculaTokenAmount);

    /// @dev Grants the native tokens to the specified receiver.
    /// @param receiver Address to receive the native tokens.
    /// @param nativeTokenAmount Amount of the native tokens to grant.
    function grantNativeToken(address receiver, uint256 nativeTokenAmount) external;
}
