// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import {IIssuer} from "./../../coreV2/interfaces/IIssuer.sol";
import {PausableContract} from "./PausableContract.sol";

/**
 * @title PausableIIssuer
 * @dev Abstract contract that implements the pause functionality for the mint and burn operations.
 */
abstract contract PausableIIssuer is PausableContract {
    /// @dev Function selector for the mint operations from the IIssuer interface.
    bytes4 internal constant _MINT_SELECTOR = IIssuer.mint.selector;

    /// @dev Function selector for the burn operations from the IIssuer interface.
    bytes4 internal constant _BURN_SELECTOR = IIssuer.burn.selector;

    /// @dev Initializes the contract by registering the `mint` and `burn` functions as pausable operations.
    constructor() {
        _addSelector(_MINT_SELECTOR);
        _addSelector(_BURN_SELECTOR);
    }

    /// @dev Pauses the `mint` function.
    function pauseMint() external virtual onlyAuthForPause {
        _setPause(_MINT_SELECTOR, true);
    }

    /// @dev Unpauses the `mint` function.
    function unpauseMint() external virtual onlyOwner {
        _setPause(_MINT_SELECTOR, false);
    }

    /// @dev Pauses the `burn` function.
    function pauseBurn() external virtual onlyAuthForPause {
        _setPause(_BURN_SELECTOR, true);
    }

    /// @dev Unpauses the `burn` function.
    function unpauseBurn() external virtual onlyOwner {
        _setPause(_BURN_SELECTOR, false);
    }
}
