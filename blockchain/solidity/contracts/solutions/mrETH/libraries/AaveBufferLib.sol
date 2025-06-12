// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library AaveBufferLib {
    /// @dev Constant for selector of aave deposit function.
    // solhint-disable-next-line private-vars-leading-underscore
    bytes4 internal constant SUPPLY_SELECTOR =
        bytes4(keccak256("supply(address,uint256,address,uint16)"));

    /// @dev Constant for selector of aave withdraw function.
    // solhint-disable-next-line private-vars-leading-underscore
    bytes4 internal constant WITHDRAW_SELECTOR =
        bytes4(keccak256("withdraw(address,uint256,address)"));

    /**
     * @dev Encodes data for deposit into Pool.
     * @param asset Address of deposit token.
     * @param receiver Address of LP token receiver.
     * @param amount Deposit value.
     * @return bytes encoded message for deposit transaction.
     */
    function encodeSupply(
        address asset,
        address receiver,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(SUPPLY_SELECTOR, asset, amount, receiver, 0);
    }

    /**
     * @dev Encodes data for withdraw from Pool.
     * @param asset Address of deposit token.
     * @param receiver Address of LP token receiver.
     * @param amount Deposit value.
     * @return bytes encoded message for withdraw transaction.
     */
    function encodeWithdraw(
        address asset,
        address receiver,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(WITHDRAW_SELECTOR, asset, amount, receiver);
    }

    /**
     * @dev Gets withdrawable balance of ETH.
     * @param asset Address of deposit token.
     * @param owner Address of LP token owner.
     * @return withdrawable ETH balance.
     */
    function getEthBalance(address, address asset, address owner) external view returns (uint256) {
        return IERC20(asset).balanceOf(owner);
    }
}
