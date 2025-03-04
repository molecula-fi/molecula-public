// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.22;
/* solhint-disable */
/**
 * @title TransferHelper
 * @dev Library for safely transferring tokens and performing approvals to prevent common vulnerabilities such as the reentrancy attack.
 */
library TransferHelper {
    /**
     * @dev Safely approves spending of tokens by a contract.
     * @param token Address of the token contract.
     * @param to Address to which approval is granted.
     * @param value Amount of tokens to approve.
     */
    function safeApprove(address token, address to, uint value) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x095ea7b3, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "TransferHelper: APPROVE_FAILED"
        );
    }

    /**
     * @dev Safely transfers tokens to a specified address.
     * @param token Address of the token contract.
     * @param to Address to which tokens are transferred.
     * @param value Amount of tokens to transfer.
     */
    function safeTransfer(address token, address to, uint value) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "TransferHelper: TRANSFER_FAILED"
        );
    }

    /**
     * @dev Safely transfers tokens from one address to another.
     * @param token Address of the token contract.
     * @param from Address from which tokens are transferred.
     * @param to Address to which tokens are transferred.
     * @param value Amount of tokens to transfer.
     */
    function safeTransferFrom(address token, address from, address to, uint value) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "TransferHelper: TRANSFER_FROM_FAILED"
        );
    }

    /**
     * @dev Safely transfers Ether to a specified address.
     * @param to Address to which Ether is transferred.
     * @param value Amount of Ether to transfer.
     */
    function safeTransferETH(address to, uint value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "TransferHelper: ETH_TRANSFER_FAILED");
    }
}
