// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ZeroValueChecker} from "./ZeroValueChecker.sol";

/// @title FunctionPausable.
/// @notice Abstract contract for managing function pausing functionality.
/// @dev Implements pausable functions with the guardian and owner controls.
abstract contract FunctionPausable is Ownable, ZeroValueChecker {
    // ============ State Variables ============

    /// @dev Account address that can pause functions.
    address public guardian;

    /// @dev Mapping of function selectors to their pause status.
    mapping(bytes4 functionSelector => bool isPaused) public isFunctionPaused;

    // ============ Events ============

    /// @dev Emitted when a function's pause status changes.
    /// @param functionSelector Function selector that is changed.
    /// @param isPaused New pause status.
    event PausedChanged(bytes4 indexed functionSelector, bool isPaused);

    // ============ Errors ============

    /// @dev Thrown when a paused function is called.
    /// @param functionSelector Function selector that is paused.
    error EFunctionPaused(bytes4 functionSelector);

    /// @dev Thrown when the caller is not authorized to pause functions.
    error ENotAuthorizedForPause();

    // ============ Constructor ============

    /// @dev Initializes the contract with a guardian address.
    /// @param guardianAddress Guardian's address.
    constructor(address guardianAddress) checkNotZero(guardianAddress) {
        guardian = guardianAddress;
    }

    // ============ Modifiers ============

    /// @dev Ensures the caller is either the owner or guardian.
    modifier onlyAuthForPause() {
        if (msg.sender != owner() && msg.sender != guardian) {
            revert ENotAuthorizedForPause();
        }
        _;
    }

    /// @dev Ensures the function is not paused.
    /// @param functionSelector Function selector to check.
    modifier checkNotPause(bytes4 functionSelector) {
        if (isFunctionPaused[functionSelector]) {
            revert EFunctionPaused(functionSelector);
        }
        _;
    }

    // ============ Admin Functions ============

    /// @dev Changes the guardian's address.
    /// @param newGuardian New guardian's address.
    function changeGuardian(
        address newGuardian
    ) external virtual onlyOwner checkNotZero(newGuardian) {
        guardian = newGuardian;
    }

    // ============ Internal Functions ============

    /// @dev Sets the pause status for a function.
    /// @param functionSelector Function selector to update.
    /// @param isPaused New pause status.
    function _setPause(bytes4 functionSelector, bool isPaused) internal virtual {
        if (isFunctionPaused[functionSelector] != isPaused) {
            isFunctionPaused[functionSelector] = isPaused;
            emit PausedChanged(functionSelector, isPaused);
        }
    }
}
