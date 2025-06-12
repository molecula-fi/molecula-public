// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

/// @title IRebaseERC20V2.
/// @notice Interface for managing token shares and conversions.
/// @dev Defines core functions for share-based token operations.
interface IRebaseERC20V2 {
    // ============ Events ============

    /// @dev Emitted when shares are transferred between accounts.
    /// @param from Tokens owner's address.
    /// @param to Tokens recipient's address.
    /// @param shares Shares amount to transfer.
    event TransferShares(address indexed from, address indexed to, uint256 indexed shares);

    // ============ View Functions ============

    /// @dev Returns the user's shares.
    /// @param user User whose shares are to be returned.
    /// @return shares User's shares.
    function sharesOf(address user) external view returns (uint256 shares);

    /// @dev Returns the total supply of the token in shares.
    /// @return totalShares Token's total supply in shares.
    function totalSharesSupply() external view returns (uint256 totalShares);
}
