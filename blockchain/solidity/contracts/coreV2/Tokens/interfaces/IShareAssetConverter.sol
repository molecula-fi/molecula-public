// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title IShareAssetConverter Interface
interface IShareAssetConverter {
    /// @dev Returns the contract's local total shares.
    /// @return Local total shares amount.
    function localTotalShares() external view returns (uint256);

    /// @dev Converts a given amount of shares to the corresponding amount of underlying assets.
    /// @param shares The amount of shares to convert.
    /// @return assets The amount of underlying assets corresponding to the shares.
    function convertToAssets(uint256 shares) external view returns (uint256 assets);

    /// @dev Returns the amount of shares to exchange for the given assets.
    /// @param assets Amount of assets to convert.
    /// @return shares Amount of shares to receive.
    function convertToShares(uint256 assets) external view returns (uint256 shares);
}
