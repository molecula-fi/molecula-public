// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwftSwap} from "../common/interfaces/ISwftSwap.sol";

/// @notice Agent contract to call the SWFT Bridge.
contract TestSwft is Ownable {
    using SafeERC20 for IERC20;

    /// @dev Slippage factor denominator value.
    uint256 private constant _SLIPPAGE_FACTOR_DENOM = 10000;
    /// @dev SWFT Bridge contract address.
    address private immutable _SWFT_BRIDGE;
    /// @dev Swap destination address.
    string public swapDestination;
    /// @dev Slippage factor value. Slippage is equal to 1% by default.
    uint256 public slippageFactor = 9900;
    /// @dev USDT token
    address public token;

    /// @dev Error: Invalid slippage factor.
    error EInvalidSlippageFactor();

    /**
     * @dev Initializes the contract setting the initializer address.
     * @param initialOwner Owner address.
     * @param swftBridge SWFT Bridge contract address.
     * @param destination Ethereum's destination address.\
     * @param tokenAddress ERC20 Token contract address.
     */
    constructor(
        address initialOwner,
        address swftBridge,
        string memory destination,
        address tokenAddress
    ) Ownable(initialOwner) {
        _SWFT_BRIDGE = swftBridge;
        swapDestination = destination;
        token = tokenAddress;
    }

    /**
     * @dev Calls the SWFT Bridge.
     * @param user User's address.
     * @param value Amount to swap.
     */
    function swap(address user, uint256 value) external {
        // Transfer from the user wallet to the SWFT swap.
        if (value > 0) {
            IERC20(token).safeTransferFrom(user, address(this), value);
            IERC20(token).forceApprove(_SWFT_BRIDGE, value);
            // Calculate the minimum return value based on the slippage.
            uint256 minReturnValue = (value * slippageFactor) / _SLIPPAGE_FACTOR_DENOM;
            ISwftSwap(_SWFT_BRIDGE).swap(
                token,
                "USDT(TRON)", // As per the documentation: https://docs-bridgers-en.bridgers.xyz/bridgers1-api-endpoints/get-coins-list.
                swapDestination,
                value,
                minReturnValue
            );
        }
    }

    /**
     * @dev Transfers tokens to the Bridge Vault.
     * @param value Amount to transfer.
     */
    function transfer(uint256 value) external onlyOwner {
        // Attempt to transfer the tokens. Revert the transaction if the transfer fails.
        IERC20(token).safeTransfer(msg.sender, value);
    }

    /**
     * @dev Sets the slippage factor value.
     * @param slippageFactorValue Slippage factor value.
     */
    function setSlippageFactor(uint256 slippageFactorValue) external onlyOwner {
        if (slippageFactorValue > _SLIPPAGE_FACTOR_DENOM) {
            revert EInvalidSlippageFactor();
        }
        slippageFactor = slippageFactorValue;
    }

    /**
     * @dev Sets the token address.
     * @param tokenAddress ERC20 Token contract address.
     */
    function setToken(address tokenAddress) external onlyOwner {
        token = tokenAddress;
    }
}
