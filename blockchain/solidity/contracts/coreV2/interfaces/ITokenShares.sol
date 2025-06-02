// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

/// @title ITokenShares.
/// @notice Interface for managing token shares and conversions.
/// @dev Defines core functions for share-based token operations.
interface ITokenShares {
    // ============ Events ============

    /// @dev Emitted when shares are transferred between accounts.
    /// @param from Tokens owner's address.
    /// @param to Tokens recipient's address.
    /// @param shares Shares amount to transfer.
    event TransferShares(address indexed from, address indexed to, uint256 indexed shares);

    // ============ View Functions ============

    /// @dev Returns the Oracle contract address.
    /// @return Oracle contract address.
    function oracle() external view returns (address);

    /// @dev Returns the contract's local total shares.
    /// @return Local total shares amount.
    function localTotalShares() external view returns (uint256);

    /// @dev Converts assets to shares.
    /// @param assets Amount of assets to convert.
    /// @return shares Converted amount of shares.
    function convertToShares(uint256 assets) external view returns (uint256 shares);

    /// @dev Converts shares to assets.
    /// @param shares Amount of shares to convert.
    /// @return assets Converted amount of assets.
    function convertToAssets(uint256 shares) external view returns (uint256 assets);

    /// @dev Returns the user's shares.
    /// @param user User whose shares are to be returned.
    /// @return shares User's shares.
    function sharesOf(address user) external view returns (uint256 shares);

    /// @dev Returns the total supply of the token in shares.
    /// @return totalShares Token's total supply in shares.
    function totalSharesSupply() external view returns (uint256 totalShares);
}
