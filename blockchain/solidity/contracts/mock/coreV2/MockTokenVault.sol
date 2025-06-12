// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {RebaseTokenV2} from "../../coreV2/Tokens/RebaseTokenV2.sol";
import {ERC20TokenVault} from "../../coreV2/TokenVault/ERC20TokenVault.sol";
import {PausableContract} from "../../common/pausable/PausableContract.sol";
import {BaseTokenVault} from "../../coreV2/TokenVault/BaseTokenVault.sol";
import {IOracleV2} from "../../coreV2/interfaces/IOracleV2.sol";
import {IRebaseERC20V2} from "../../coreV2/Tokens/interfaces/IRebaseERC20V2.sol";

contract MockTokenVault is ERC20TokenVault {
    error EUnsupported();

    bool public isRebaseToken;

    constructor(
        address owner_,
        address shareAddress,
        address supplyManager,
        address guardianAddress,
        bool isRebaseToken_
    ) ERC20TokenVault(owner_, shareAddress, supplyManager) PausableContract(guardianAddress) {
        isRebaseToken = isRebaseToken_;
    }

    /// @inheritdoc IERC7575
    function totalAssets() external pure returns (uint256 /*totalManagedAssets*/) {
        revert EUnsupported();
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public view override returns (uint256 assets) {
        uint256 assetDecimals = IERC20Metadata(_asset).decimals();
        uint256 shareDecimals = IERC20Metadata(_SHARE).decimals();
        return
            IOracleV2(SUPPLY_MANAGER).convertToAssets(shares) /
            10 ** (shareDecimals - assetDecimals);
    }

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) external view override returns (uint256 shares) {
        return _convertToShares(assets);
    }

    /// @inheritdoc BaseTokenVault
    function _convertToShares(uint256 assets) internal view override returns (uint256 shares) {
        uint256 assetDecimals = IERC20Metadata(_asset).decimals();
        uint256 shareDecimals = IERC20Metadata(_SHARE).decimals();
        return
            IOracleV2(SUPPLY_MANAGER).convertToShares(
                assets * (10 ** (shareDecimals - assetDecimals))
            );
    }

    function _maxRedeem(address owner) internal view virtual override returns (uint256 maxShares) {
        return
            isRebaseToken
                ? IRebaseERC20V2(_SHARE).sharesOf(owner)
                : IERC20(_SHARE).balanceOf(owner);
    }
}
