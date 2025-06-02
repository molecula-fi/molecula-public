// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PausableContract} from "./../common/pausable/PausableContract.sol";
import {AbstractTokenVault} from "./AbstractTokenVault.sol";
import {ISupplyManagerV2} from "./interfaces/ISupplyManagerV2.sol";

/// @title Token Vault.
/// @notice Abstract contract for managing token Vault operations.
/// @dev Implements basic token Vault functionality with pausable features.
abstract contract TokenVault is AbstractTokenVault {
    using SafeERC20 for IERC20;

    // ============ Constructor ============

    /// @dev Initializes the contract setting the initializer address.
    /// @param owner_ Owner's address.
    /// @param shareAddress Share token's address.
    /// @param supplyManager Supply Manager's address.
    /// @param guardianAddress Guardian's address that can pause the contract.
    constructor(
        address owner_,
        address shareAddress,
        address supplyManager,
        address guardianAddress
    )
        AbstractTokenVault(shareAddress, supplyManager)
        Ownable(owner_)
        PausableContract(guardianAddress)
    {}

    // ============ View Functions ============

    /// @dev Returns the issuer contract interface.
    /// @return Issuer contract interface.
    function _issuer() internal view virtual override returns (address) {
        // Cast the share token to the issuer interface.
        return _SHARE;
    }

    /// @inheritdoc AbstractTokenVault
    function _supplyManagerRequestRedeem(
        address controller,
        uint256 requestId,
        uint256 shares
    ) internal virtual override returns (uint256 assets) {
        assets = ISupplyManagerV2(SUPPLY_MANAGER).requestRedeem(
            asset,
            controller,
            requestId,
            shares
        );
    }

    /// @inheritdoc AbstractTokenVault
    function _storeRequestInfo(
        uint256 /*requestId*/,
        address /*controller*/,
        uint256 /*shares*/ // solhint-disable-next-line no-empty-blocks
    ) internal virtual override {
        // Do nothing. SupplyManagerV2 stores information about request.
    }

    // ============ Core Functions ============

    /// @dev Fulfills redemption requests for the specified request IDs.
    /// @param assetOwner Source of assets.
    /// @param requestIds Array of redemption request IDs.
    /// @param sumAssets Total assets being transferred.
    /// @dev In case the requestId[i] is zero, then it should be skipped from being processed.
    ///      This might happen when someone satisfies the redemption request in the same block.
    function fulfillRedeemRequests(
        address assetOwner,
        uint256[] calldata requestIds,
        uint256 sumAssets
    ) external virtual {
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(asset).safeTransferFrom(assetOwner, address(this), sumAssets);

        uint256 length = requestIds.length;
        for (uint256 i = 0; i < length; ++i) {
            uint256 requestId = requestIds[i];
            if (requestId != 0) {
                // slither-disable-next-line unused-return
                (, , address user, uint256 assets, uint256 shares) = ISupplyManagerV2(
                    SUPPLY_MANAGER
                ).redeemRequests(requestId);
                pendingRedeemShares[user] -= shares;
                claimableRedeemAssets[user] += assets;
            }
        }

        // Emit an event to log the redemption operation.
        emit RedeemClaimable(requestIds, sumAssets);
    }
}
