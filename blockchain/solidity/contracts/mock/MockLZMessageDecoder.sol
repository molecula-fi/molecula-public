// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {LZMsgCodec} from "../common/layerzero/LZMsgCodec.sol";

/// @notice MockLZMsgCodecDecoder contract.
contract MockLZMessageDecoder {
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
        if (msgType == LZMsgCodec.REQUEST_DEPOSIT) {
            return LZMsgCodec.lzDecodeUint256Pair(message[1:]);
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
        if (msgType == LZMsgCodec.CONFIRM_DEPOSIT) {
            return LZMsgCodec.lzDecodeUint256Pair(message[1:]);
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
        if (msgType == LZMsgCodec.CONFIRM_DEPOSIT_AND_UPDATE_ORACLE) {
            return LZMsgCodec.lzDecodeConfirmDepositMessageAndUpdateOracle(message[1:]);
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
        if (msgType == LZMsgCodec.UPDATE_ORACLE) {
            return LZMsgCodec.lzDecodeUint256Pair(message[1:]);
        } else {
            revert EWrongMessageType();
        }
    }
}
