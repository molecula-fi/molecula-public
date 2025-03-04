// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockBridgeVault
 * @dev Contract that works as a wallet.
 */
contract MockBridgeVault is Ownable {
    using SafeERC20 for IERC20;

    /**
     * @dev Constructor.
     * @param initialOwner Smart contract owner address.
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Transfers tokens.
     * @param token TRC20 token address.
     * @param to Recipient's address.
     * @param value Amount to transfer.
     */
    function transfer(address token, address to, uint256 value) external onlyOwner {
        IERC20(token).safeTransfer(to, value);
    }
}
