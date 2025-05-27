// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {AbstractTokenVault} from "./AbstractTokenVault.sol";
import {FunctionPausable} from "../common/FunctionPausable.sol";
import {IIssuer} from "./interfaces/IIssuer.sol";

/// @title Token Vault.
/// @notice Abstract contract for managing token Vault operations.
/// @dev Implements basic token Vault functionality with pausable features.
abstract contract TokenVault is AbstractTokenVault {
    // ============ Events ============

    /// @dev Event emitted when distributing yield.
    /// @param users Array of user addresses.
    /// @param shares Array of shares.
    event DistributeYield(address[] users, uint256[] shares);

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
        FunctionPausable(guardianAddress)
    {}

    // ============ View Functions ============

    /// @dev Returns the issuer contract interface.
    /// @return Issuer contract interface.
    function issuer() public view override returns (IIssuer) {
        // Cast the share token to the issuer interface.
        return IIssuer(_SHARE);
    }

    // ============ Core Functions ============

    /// @dev Fulfills redemption requests for the specified request IDs.
    /// @param fromAddress Address to fulfill requests from.
    /// @param requestIds Array of request IDs to fulfill.
    /// @param assets Array of asset amounts.
    /// @param totalValue Total value of assets.
    function fulfillRedeemRequests(
        address fromAddress,
        uint256[] memory requestIds,
        uint256[] memory assets,
        uint256 totalValue
    ) external {
        // Process redeem requests.
        _fulfillRedeemRequests(fromAddress, requestIds, assets, totalValue);
    }
}
