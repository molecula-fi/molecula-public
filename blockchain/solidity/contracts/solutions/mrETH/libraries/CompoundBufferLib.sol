// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library CompoundBufferLib {
    // solhint-disable-next-line private-vars-leading-underscore
    bytes4 internal constant COMPOUND_SUPPLY_SELECTOR =
        bytes4(keccak256("supply(address,uint256)"));

    // solhint-disable-next-line private-vars-leading-underscore
    bytes4 internal constant COMPOUND_WITHDRAW_SELECTOR =
        bytes4(keccak256("withdraw(address,uint256)"));

    /**
     * @dev Encodes data for deposit into Pool.
     * @param asset Address of deposit token.
     * @param amount Deposit value.
     * @return bytes encoded message for deposit transaction.
     */
    function encodeSupply(
        address asset,
        address,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(COMPOUND_SUPPLY_SELECTOR, asset, amount);
    }

    /**
     * @dev Encodes data for withdraw from Pool.
     * @param asset Address of deposit token.
     * @param amount Deposit value.
     * @return bytes encoded message for withdraw transaction.
     */
    function encodeWithdraw(
        address asset,
        address,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(COMPOUND_WITHDRAW_SELECTOR, asset, amount);
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
