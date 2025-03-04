// solhint-disable
// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.28;

import "./uniswap/TransferHelper.sol";
import "./uniswap/ISwapRouter.sol";

contract TestUniSwap {
    // For the scope of these swap examples,
    // we will detail the design considerations when using
    // `exactInput`, `exactInputSingle`, `exactOutput`, and  `exactOutputSingle`.

    // It should be noted that for the sake of these examples, we purposefully pass in the swap router instead of inherit the swap router for simplicity.
    // More advanced example contracts will detail how to inherit the swap router safely.

    ISwapRouter public immutable SWAP_ROUTER;

    // This example swaps DAI/WETH9 for single path swaps and DAI/USDC/WETH9 for multi path swaps.
    /// @dev DAI address
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    /// @dev WETH9 address
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    /// @dev USDC address
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    /// @dev USDT address
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    // Fee has decimals 4 i.e. 1% = 10000.
    // For this example, we will set the pool fee to 0.01% = 100.
    // It is DAI/USDT pool with the highest TVL
    uint24 public constant poolFee = 100;

    constructor(ISwapRouter _swapRouter) {
        SWAP_ROUTER = _swapRouter;
    }

    /// @notice swapUSDT2DAI swaps a fixed amount of DAI for a maximum possible amount of WETH9
    /// using the DAI/WETH9 0.3% pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DAI for this function to succeed.
    /// @param amountIn The exact amount of DAI that will be swapped for WETH9.
    /// @return amountOut The amount of WETH9 received.
    function swapUSDT2DAI(
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        // msg.sender must approve this contract

        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(USDT, msg.sender, address(this), amountIn);

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(USDT, address(SWAP_ROUTER), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDT,
            tokenOut: DAI,
            fee: poolFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = SWAP_ROUTER.exactInputSingle(params);
    }

    /// @notice swapDAI2USDT swaps a fixed amount of DAI for a maximum possible amount of WETH9
    /// using the DAI/WETH9 0.3% pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DAI for this function to succeed.
    /// @param amountIn The exact amount of DAI that will be swapped for WETH9.
    /// @return amountOut The amount of WETH9 received.
    function swapDAI2USDT(
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        // msg.sender must approve this contract

        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(DAI, msg.sender, address(this), amountIn);

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(DAI, address(SWAP_ROUTER), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: DAI,
            tokenOut: USDT,
            fee: poolFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = SWAP_ROUTER.exactInputSingle(params);
    }
}
