// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {LZMessage} from "../common/layerzero/LZMessage.sol";

/// @notice MockLZMessageDecoder contract.
contract MockLZMessageDecoder is LZMessage {
    /// @dev Error wrong message type.
    error EWrongMessageType();

    /**
     * @dev Decodes a request deposit message.
     * @param message Encoded message.
     * @return requestId Decoded request ID.
     * @return value Decoded value.
     */
    function decodeRequestDepositMessage(
        bytes calldata message
    ) external pure returns (uint256 requestId, uint256 value) {
        uint8 msgType = uint8(message[0]);
        if (msgType == REQUEST_DEPOSIT) {
            return LZMessage.lzDecodeRequestDepositMessage(message[1:]);
        } else {
            revert EWrongMessageType();
        }
    }

    /**
     * @dev Decodes a deposit confirmation message.
     * @param message Encoded message.
     * @return requestId Decoded request ID.
     * @return shares Decoded shares.
     */
    function decodeConfirmDepositMessage(
        bytes calldata message
    ) external pure returns (uint256 requestId, uint256 shares) {
        uint8 msgType = uint8(message[0]);
        if (msgType == CONFIRM_DEPOSIT) {
            return LZMessage.lzDecodeConfirmDepositMessage(message[1:]);
        } else {
            revert EWrongMessageType();
        }
    }

    /**
     * @dev Decodes a deposit confirmation message and update the oracle.
     * @param message Encoded message.
     * @return requestId Decoded request ID.
     * @return shares Decoded shares.
     * @return totalValue Decoded total value.
     * @return totalShares Decoded total shares.
     */
    function decodeConfirmDepositMessageAndUpdateOracle(
        bytes calldata message
    )
        external
        pure
        returns (uint256 requestId, uint256 shares, uint256 totalValue, uint256 totalShares)
    {
        uint8 msgType = uint8(message[0]);
        if (msgType == CONFIRM_DEPOSIT_AND_UPDATE_ORACLE) {
            return LZMessage.lzDecodeConfirmDepositMessageAndUpdateOracle(message[1:]);
        } else {
            revert EWrongMessageType();
        }
    }

    /**
     * @dev Decodes an oracle update message.
     * @param message Encoded message.
     * @return totalValue Total value.
     * @return totalShares Total shares.
     */
    function decodeUpdateOracle(
        bytes calldata message
    ) public pure returns (uint256 totalValue, uint256 totalShares) {
        uint8 msgType = uint8(message[0]);
        if (msgType == UPDATE_ORACLE) {
            return LZMessage.lzDecodeUpdateOracle(message[1:]);
        } else {
            revert EWrongMessageType();
        }
    }
}
