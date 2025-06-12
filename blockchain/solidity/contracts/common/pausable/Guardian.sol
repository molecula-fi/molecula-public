// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ValueValidator} from "../ValueValidator.sol";

/// @title Guardian contract.
/// @notice Abstract contract for manage guardian address.
/// @dev Implements setter ans storing guardian address.
abstract contract Guardian is Ownable, ValueValidator {
    // ============ State Variables ============

    /// @dev Account address that can pause functions.
    address public guardian;

    // ============ Errors ============

    /// @dev Error thrown when the caller is not authorized to pause functions.
    error ENotAuthorizedForPause();

    // ============ Modifiers ============

    /// @dev Ensures the caller is either the owner or guardian.
    modifier onlyAuthForPause() {
        if (msg.sender != owner() && msg.sender != guardian) {
            revert ENotAuthorizedForPause();
        }
        _;
    }

    // ============ Constructor ============

    /// @dev Initializes the contract with a guardian address.
    /// @param guardianAddress Guardian's address.
    constructor(address guardianAddress) notZeroAddress(guardianAddress) {
        guardian = guardianAddress;
    }

    // ============ Admin Functions ============

    /// @dev Changes the guardian's address.
    /// @param newGuardian New guardian's address.
    function changeGuardian(
        address newGuardian
    ) external virtual onlyOwner notZeroAddress(newGuardian) {
        guardian = newGuardian;
    }
}
