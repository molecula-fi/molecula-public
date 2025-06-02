// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

interface INitrogenTokenVault {
    /// @dev Follows the sequences:
    /// - Claim assets available to redeem first.
    /// - Creates a new redemption operation request.
    /// - Fulfill the request.
    /// - Claims the redeemed assets.
    /// @param shares Amount of shares to redeem.
    /// @param receiver Receiver's address.
    /// @param owner Owner of shares.
    /// @return requestId Operation ID.
    function redeemImmediately(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 requestId);
}
