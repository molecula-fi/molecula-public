// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {RebaseTokenV2} from "./../../coreV2/RebaseTokenV2.sol";
import {TokenVault} from "./../../coreV2/TokenVault.sol";

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
    function convertToAssets(uint256 shares) public view override returns (uint256 assets) {
        uint256 assetDecimals = IERC20Metadata(asset).decimals();
        uint256 shareDecimals = IERC20Metadata(_SHARE).decimals();
        return
            RebaseTokenV2(_SHARE).convertToAssets(shares) / 10 ** (shareDecimals - assetDecimals);
    }

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public view override returns (uint256 shares) {
        uint256 assetDecimals = IERC20Metadata(asset).decimals();
        uint256 shareDecimals = IERC20Metadata(_SHARE).decimals();
        return
            RebaseTokenV2(_SHARE).convertToShares(assets * (10 ** (shareDecimals - assetDecimals)));
    }
}
