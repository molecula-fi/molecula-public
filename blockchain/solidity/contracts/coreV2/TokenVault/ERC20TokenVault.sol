// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISupplyManagerV2} from "./../interfaces/ISupplyManagerV2.sol";
import {IERC20TokenVault} from "../Tokens/interfaces/ITokenVault.sol";
import {BaseTokenVault} from "./BaseTokenVault.sol";
import {CommonERC20TokenVault} from "./CommonERC20TokenVault.sol";

/// @title ERC20TokenVault.
/// @dev TokenVault that uses IERC20 tokens as underlying assets.
abstract contract ERC20TokenVault is CommonERC20TokenVault, IERC20TokenVault {
    using SafeERC20 for IERC20;

    // ============ Constructor ============

    /// @dev Initializes the contract setting the initializer address.
    /// @param owner_ Owner's address.
    /// @param shareAddress Share token's address.
    /// @param supplyManager Supply Manager's address.
    constructor(
        address owner_,
        address shareAddress,
        address supplyManager
    ) BaseTokenVault(shareAddress, supplyManager) Ownable(owner_) {}

    // ============ Core Functions ============

    /// @inheritdoc IERC20TokenVault
    function fulfillRedeemRequests(
        address assetOwner,
        uint256[] calldata requestIds,
        uint256 sumAssets
    ) external virtual override {
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(_asset).safeTransferFrom(assetOwner, address(this), sumAssets);

        _fulfillRedeemRequests(requestIds, sumAssets);
    }

    // ============ Internal Functions ============

    /// @dev Returns the issuer contract interface.
    /// @return Issuer contract interface.
    function _issuer() internal view virtual override returns (address) {
        return _SHARE;
    }

    /// @inheritdoc BaseTokenVault
    function _supplyManagerRequestRedeem(
        address controller,
        address owner,
        uint256 requestId,
        uint256 shares
    ) internal virtual override returns (uint256 assets) {
        assets = ISupplyManagerV2(SUPPLY_MANAGER).requestRedeem(
            _asset,
            controller,
            owner,
            requestId,
            shares
        );
    }

    /// @inheritdoc BaseTokenVault
    function _storeRedeemRequestInfo(
        uint256 /*requestId*/,
        address /*controller*/,
        address /*owner*/,
        uint256 /*shares*/ // solhint-disable-next-line no-empty-blocks
    ) internal virtual override {
        // Do nothing. SupplyManagerV2 stores information about request.
    }
}
