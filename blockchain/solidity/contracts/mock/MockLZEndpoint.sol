// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

struct MessagingParams {
    uint32 dstEid;
    bytes32 receiver;
    bytes message;
    bytes options;
    bool payInLzToken;
}

/// @dev The receipt for a message.
/// @param guid The unique identifier for the sent message.
/// @param nonce The nonce of the sent message.
/// @param fee The LayerZero fee incurred for the message.
struct MessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    MessagingFee fee;
}
/// @dev The fee for a message.
/// @param nativeFee The native fee.
/// @param lzTokenFee The lzToken fee.
struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct Origin {
    uint32 srcEid;
    bytes32 sender;
    uint64 nonce;
}

/// @dev Error: Invalid gas value.
error EInvalidGasValue();

interface ILZApp {
    /**
     * @dev Called when the data is received from the protocol. It overrides the equivalent function in the parent contract.
     * Protocol messages are defined as packets, comprised of the following parameters. Call on deposit.
     * @param _origin Struct containing information about where the packet came from.
     * @param _guid Global unique identifier for tracking the packet.
     * @param _message Encoded message.
     * @param _executor Executor address as specified by the OApp.
     * @param _extraData Any extra data or options to trigger on receipt.
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

/// @notice MockLayerZeroEndpoint contract.
contract MockLZEndpoint {
    /// @dev Nonce counter of the operations.
    uint64 public nonce = 0;

    /// @dev The last message received.
    bytes public lastMessage;

    /// @dev The last options received.
    bytes public lastOptions;

    /**
     * @dev Interacts with the LayerZero's `EndpointV2.send()` for sending a message.
     * @param _params The message parameters.
     * @param _refundAddress The address to receive any excess fee values sent to the endpoint.
     * @return receipt The receipt of the message.
     */
    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory receipt) {
        uint256 gasLimit = getGasLimit(_params.options);
        if (msg.value != gasLimit) {
            revert EInvalidGasValue();
        }
        _params;
        _refundAddress;
        nonce += 1;
        lastMessage = _params.message;
        lastOptions = _params.options;
        receipt = MessagingReceipt(bytes32(0), nonce, MessagingFee(gasLimit, 0));
        return receipt;
    }

    /**
     * @dev Called when the data is received from the protocol. It overrides the equivalent function in the parent contract.
     * Protocol messages are defined as packets, comprised of the following parameters.
     * @param oApp The address of the OApp.
     * @param srcEid The source chain ID.
     * @param sender The sender address.
     * @param msgType The message type.
     * @param requestId The request ID.
     * @param value The data values.
     */
    function lzReceive(
        address oApp,
        uint32 srcEid,
        bytes32 sender,
        bytes1 msgType,
        uint256 requestId,
        uint256 value
    ) external payable {
        nonce += 1;
        bytes memory options;
        bytes memory message = abi.encodePacked(msgType, requestId, value);
        ILZApp(oApp).lzReceive(
            Origin(srcEid, sender, nonce),
            bytes32(0),
            message,
            address(0),
            options
        );
    }

    /**
     * @dev Call the redeem operation on an OApp.
     * @param oApp The address of the OApp.
     * @param srcEid The source chain ID.
     * @param sender The sender address.
     * @param msgType The message type.
     * @param requestIds The request IDs.
     * @param values The data values.
     */
    function lzReceiveRedeem(
        address oApp,
        uint32 srcEid,
        bytes32 sender,
        bytes1 msgType,
        uint256[] memory requestIds,
        uint256[] memory values
    ) external payable {
        nonce += 1;
        bytes memory options;
        bytes memory message = abi.encodePacked(msgType, requestIds, values);
        ILZApp(oApp).lzReceive(
            Origin(srcEid, sender, nonce),
            bytes32(0),
            message,
            address(0),
            options
        );
    }

    /**
     * @dev Called to distribute the yield.
     * @param oApp Address of the OApp.
     * @param srcEid Source chain ID.
     * @param sender Sender address.
     * @param msgType Message type.
     * @param users Users.
     * @param shares Shares.
     */
    function lzReceiveDistributeYield(
        address oApp,
        uint32 srcEid,
        bytes32 sender,
        bytes1 msgType,
        address[] memory users,
        uint256[] memory shares
    ) external payable {
        nonce += 1;
        bytes memory options;
        // Encode the message.
        bytes memory message = abi.encodePacked(msgType);
        for (uint256 i = 0; i < users.length; i++) {
            message = abi.encodePacked(message, bytes20(users[i]));
        }
        for (uint256 i = 0; i < shares.length; i++) {
            message = abi.encodePacked(message, shares[i]);
        }
        // Send the data to the app.
        ILZApp(oApp).lzReceive(
            Origin(srcEid, sender, nonce),
            bytes32(0),
            message,
            address(0),
            options
        );
    }

    /**
     * @dev Called when the data is received from the protocol. It overrides the equivalent function in the parent contract.
     * Protocol messages are defined as packets, comprised of the following parameters.
     * @param oApp The address of the OApp.
     * @param srcEid The source chain ID.
     * @param sender The sender address.
     * @param value The data values.
     */
    function lzReceiveConfirmToSwapUSDT(
        address oApp,
        uint32 srcEid,
        bytes32 sender,
        uint256 value
    ) external payable {
        nonce += 1;
        bytes memory options;
        bytes memory message = abi.encodePacked(value);
        ILZApp(oApp).lzReceive(
            Origin(srcEid, sender, nonce),
            bytes32(0),
            message,
            address(0),
            options
        );
    }
    /**
     * @dev Called when the data is received from the protocol. It overrides the equivalent function in the parent contract.
     * Protocol messages are defined as packets, comprised of the following parameters.
     * @param oApp The address of the OApp.
     * @param srcEid The source chain ID.
     * @param sender The sender address.
     * @param value The data values.
     */
    function lzReceiveRequestToSwapWmUSDT(
        address oApp,
        uint32 srcEid,
        bytes32 sender,
        uint256 value
    ) external payable {
        nonce += 1;
        bytes memory options;
        bytes memory message = abi.encodePacked(value);
        ILZApp(oApp).lzReceive(
            Origin(srcEid, sender, nonce),
            bytes32(0),
            message,
            address(0),
            options
        );
    }

    /**
     * @dev Gets the gas limit from the options.
     * @param options The message options.
     * @return totalGas The gas limit.
     */
    function getGasLimit(bytes memory options) public pure returns (uint256 totalGas) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Calculate the starting position of the last 16 bytes.
            let start := add(options, 38) // 32 (length prefix) + 6 (offset to the 6th byte).
            // Load 32 bytes from `start`.
            totalGas := mload(start)
        }
        // truncate to uint128.
        return uint128(totalGas >> 128);
    }

    /**
     * @dev Internal function to interact with the LayerZero's `EndpointV2.quote()` for fee calculation.
     * @param _params The message parameters.
     * @param _sender The sender address.
     * @return fee The calculated `MessagingFee` for the message.
     *      - nativeFee: The native fee for the message.
     *      - lzTokenFee: The LZ token fee for the message.
     */
    function quote(
        MessagingParams calldata _params,
        address _sender
    ) external pure returns (MessagingFee memory fee) {
        _params;
        _sender;
        fee.nativeFee = getGasLimit(_params.options);
        fee.lzTokenFee = 0;
        return fee;
    }

    /**
     * @dev Sets the delegate address.
     * @dev Mock call for the OApp constructor.
     * @param _delegate New delegate address.
     */
    function setDelegate(address _delegate) external pure {
        _delegate;
    }
}
