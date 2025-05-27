// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {TokenVault} from "../coreV2/TokenVault.sol";
import {IERC7575} from "../common/external/interfaces/IERC7575.sol";

contract MockTokenVault is TokenVault {
    error EUnsupported();

    constructor(
        address owner_,
        address shareAddress,
        address supplyManager,
        address guardianAddress
    ) TokenVault(owner_, shareAddress, supplyManager, guardianAddress) {}

    /// @inheritdoc IERC7575
    function totalAssets() external pure returns (uint256 /*totalManagedAssets*/) {
        revert EUnsupported();
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public pure override returns (uint256 assets) {
        return shares / 10e12; // For USDC token
    }

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public pure override returns (uint256 shares) {
        return assets * 10e12; // For USDC token
    }
}
