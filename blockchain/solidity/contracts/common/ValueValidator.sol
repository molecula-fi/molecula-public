// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title ValueValidator
/// @notice Contract for validating common value-based conditions.
/// @dev Provides modifiers to check for zero values, zero addresses, and `msg.value` conditions.
contract ValueValidator {
    /// @dev Error thrown when a value is zero but must be non-zero.
    error EZeroValue();

    /// @dev Error thrown when an address is zero but must be non-zero.
    error EZeroAddress();

    /// @dev Error thrown when `msg.value` is not zero but must be zero.
    error EMsgValueIsNotZero();

    /// @dev Error: `msg.sender` is not authorized for this function.
    error ENotAuthorized();

    /**
     * @dev Ensures the function is called by the expected sender.
     * @param expectedSender Address that is allowed to call the function.
     * @custom:revert ENotAuthorized Check if the caller is not the expected sender.
     */
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert ENotAuthorized();
        }
        _;
    }

    /// @dev Modifier that checks if a value is not zero.
    /// @param value Value to check.
    modifier notZero(uint256 value) {
        // slither-disable-next-line incorrect-equality
        if (value == 0) {
            revert EZeroValue();
        }
        _;
    }

    /// @dev Modifier that checks if an address is not zero.
    /// @param addr Address to check.
    modifier notZeroAddress(address addr) {
        if (addr == address(0)) {
            revert EZeroAddress();
        }
        _;
    }

    /// @dev Modifier that ensures `msg.value` is zero.
    modifier zeroMsgValue() {
        if (msg.value != 0) {
            revert EMsgValueIsNotZero();
        }
        _;
    }
}
