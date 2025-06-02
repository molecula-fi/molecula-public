// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ValueValidator} from "../ValueValidator.sol";

/// @title PausableContract.
/// @notice Abstract contract for managing function pausing functionality.
/// @dev Implements pausable functions with the guardian and owner controls.
abstract contract PausableContract is Ownable, ValueValidator {
    // ============ State Variables ============

    /// @dev Account address that can pause functions.
    address public guardian;

    /// @dev Mapping of function selectors to their pause status.
    mapping(bytes4 functionSelector => bool isPaused) public isFunctionPaused;

    /// @dev Array of function selectors that can be paused.
    /// @notice Stores all registered function selectors that can be controlled by pause functionality.
    bytes4[] public selectors;

    // ============ Events ============

    /// @dev Emitted when a function's pause status changes.
    /// @param functionSelector Function selector that is changed.
    /// @param isPaused New pause status.
    event PausedChanged(bytes4 indexed functionSelector, bool indexed isPaused);

    // ============ Errors ============

    /// @dev Thrown when trying to set a `isPaused` status that is already set.
    /// @param functionSelector Function selector that was attempted to be set.
    /// @param isPaused The status that was attempted to be set.
    error EAlreadySet(bytes4 functionSelector, bool isPaused);

    /// @dev Thrown when trying to set all functions to a `isPaused` status that they already have.
    /// @param isPaused The status that was attempted to be set.
    error EAllAlreadySet(bool isPaused);

    /// @dev Thrown when a paused function is called.
    /// @param functionSelector Function selector that is paused.
    error EFunctionPaused(bytes4 functionSelector);

    /// @dev Thrown when the caller is not authorized to pause functions.
    error ENotAuthorizedForPause();

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

    /// @dev Pauses all registered functions.
    function pauseAll() external virtual onlyAuthForPause {
        _setPauseAll(true);
    }

    /// @dev Unpauses all registered functions.
    function unpauseAll() external virtual onlyOwner {
        _setPauseAll(false);
    }

    // ============ Internal Functions ============

    /// @dev Adds a function selector to the list of pausable functions.
    /// @param selector The function selector to be added to the list.
    // slither-disable-next-line dead-code
    function _addSelector(bytes4 selector) internal virtual {
        selectors.push(selector);
    }

    /// @dev Sets the pause status for a function. If pause status is already set than throws an exception.
    /// @param functionSelector Function selector to update.
    /// @param isPaused New pause status.
    function _setPause(bytes4 functionSelector, bool isPaused) internal virtual {
        _setPauseOptional(functionSelector, isPaused, true);
    }

    /// @dev Sets the pause status for a function with optional exception throwing.
    /// @param functionSelector Function selector to update.
    /// @param isPaused New pause status.
    /// @param throwException If true, throws an exception when the status is already set.
    /// @return changed Returns true if the pause status was changed, false otherwise.
    function _setPauseOptional(
        bytes4 functionSelector,
        bool isPaused,
        bool throwException
    ) internal virtual returns (bool changed) {
        if (isFunctionPaused[functionSelector] == isPaused) {
            if (throwException) revert EAlreadySet(functionSelector, isPaused);
            return false;
        }
        isFunctionPaused[functionSelector] = isPaused;
        emit PausedChanged(functionSelector, isPaused);
        return true;
    }

    /// @dev Iterates through all registered selectors and updates their pause status.
    ///      Throws EAllAlreadySet if no function's status was changed.
    /// @param isPaused New pause status to be set for all functions.
    function _setPauseAll(bool isPaused) internal virtual {
        uint256 length = selectors.length;
        bool changed = false;
        for (uint256 i = 0; i < length; ++i) {
            changed = _setPauseOptional(selectors[i], isPaused, false) || changed;
        }
        if (!changed) {
            revert EAllAlreadySet(isPaused);
        }
    }
}
