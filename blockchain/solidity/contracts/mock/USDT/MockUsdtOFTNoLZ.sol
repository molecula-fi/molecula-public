// SPDX-License-Identifier: UNLICENSED
/* solhint-disable */
pragma solidity ^0.8.22;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {OAppOptionsType3} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";

import {OFTLimit, OFTReceipt, OFTFeeDetail} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {ILayerZeroEndpointV2, MessagingParams} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import {IOFT, SendParam, MessagingReceipt, MessagingFee} from "../../solutions/Carbon/common/interfaces/IUsdtOFT.sol";

interface IUsdtOFT is IOFT {
    /// ========================== EVENTS =====================================

    /// ========================== ERRORS =====================================
    error OnlyLpAdminOrOwner();
    error OnlyPlanner();
    error ComposeNotSupported();
    error InvalidEid();
    error InvalidMsgType(uint16 msgType);
    error InvalidFeeBps(uint16 feeBps);
    error InsufficientFeeBalance();
    error InsufficientCredits(uint32 eid, uint256 credits, uint256 amountWithdraw);
    error InvalidAmount();

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function credits(uint32 _eid) external view returns (uint256 credits);
    function feeBps() external view returns (uint16);
    function tvl() external view returns (uint256);
}

contract MockUsdtOFTNoLZ is IUsdtOFT, OAppOptionsType3 {
    using SafeERC20 for IERC20;

    // MsgTypes
    uint16 public constant WITHDRAW_REMOTE = 1;
    uint16 public constant SEND_OFT = 2;
    uint16 public constant SEND_CREDITS = 3;

    // Endpoint IDs
    uint32 public immutable ARBITRUM_EID; // 30110
    uint32 public immutable CELO_EID; // 30125
    uint32 public immutable ETH_EID; // 30101
    uint32 public immutable TON_EID; // 30152
    uint32 public immutable TRON_EID; // 30420
    uint32 public immutable LOCAL_EID;

    // @dev Nonce counter of the operations.
    uint64 public nonce = 0;

    // Credit balances
    mapping(uint32 eid => uint256 credits) public credits;

    IERC20 internal immutable innerToken;

    // Management addresses
    address public lzEndpoint;

    // Fees
    uint256 public feeBalance = 0;
    uint16 public feeBps = 10;
    uint16 public constant BPS_DENOMINATOR = 10000;

    constructor(
        uint32 _arbitrumEid,
        uint32 _celoEid,
        uint32 _ethEid,
        uint32 _tonEid,
        uint32 _tronEid,
        address _token,
        address _lzEndpoint,
        address _delegate
    ) Ownable(_delegate) {
        // @dev Endpoint details
        ARBITRUM_EID = _arbitrumEid;
        CELO_EID = _celoEid;
        ETH_EID = _ethEid;
        TON_EID = _tonEid;
        TRON_EID = _tronEid;
        LOCAL_EID = _ethEid;

        lzEndpoint = _lzEndpoint;

        // @dev Token details
        if (IERC20Metadata(_token).decimals() != sharedDecimals()) revert InvalidLocalDecimals();
        innerToken = IERC20(_token);
    }

    /// ========================== INTERFACE FUNCTIONS =====================================
    function token() public view returns (address) {
        return address(innerToken);
    }

    function approvalRequired() external pure returns (bool) {
        return true;
    }

    function oftVersion() external pure returns (bytes4 interfaceId, uint64 version) {
        // @dev We are using version '0' to indicate that this is a custom oft implementation
        return (type(IOFT).interfaceId, 0);
    }

    function sharedDecimals() public pure returns (uint8) {
        return 6;
    }

    function tvl() external view returns (uint256) {
        // @dev This will also account for tokens accidentally sent directly to this contract, but not accounted for.
        return innerToken.balanceOf(address(this)) - feeBalance;
    }

    /// ========================== INTERNAL HELPER FUNCTIONS =====================================
    function _assertCredits(uint32 _eid, uint256 _amount) internal view {
        uint256 currentCredits = credits[_eid];
        if (currentCredits < _amount) revert InsufficientCredits(_eid, currentCredits, _amount);
    }

    function _decreaseCredits(uint32 _eid, uint256 _amount) internal {
        // @dev Only do the operation if its greater than 0;
        if (_amount > 0) {
            uint256 currentCredits = credits[_eid];
            if (currentCredits < _amount) revert InsufficientCredits(_eid, currentCredits, _amount);
            credits[_eid] = currentCredits - _amount;
        }
    }

    function _increaseCredits(uint32 _eid, uint256 _amount) internal {
        // @dev Only do the operation if its greater than 0;
        if (_amount > 0) credits[_eid] += _amount;
    }

    function increaseCredits(uint32 _eid, uint256 _amount) external {
        _increaseCredits(_eid, _amount);
    }

    function _buildMsgAndOptions(
        uint16 _msgType,
        SendParam calldata _sendParam,
        uint256 _amount
    ) internal view returns (bytes memory message, bytes memory options) {
        // @dev Can't move 0 tokens
        if (_amount == 0) revert InvalidAmount();

        // @dev this OFT does NOT support composing
        if (_sendParam.composeMsg.length > 0) revert ComposeNotSupported();

        // @dev Can safely cast this as uint64,
        // because this is strictly used for USDT implementation where 6 decimals is used.
        // Unless over 18 trillion usdt is minted, this wont be a problem.
        message = abi.encodePacked(_msgType, _sendParam.to, uint64(_amount));
        options = combineOptions(_sendParam.dstEid, _msgType, _sendParam.extraOptions);
    }

    /// ========================== OFT FUNCTIONS =====================================
    function _debitView(
        uint256 _amount,
        uint256 _minAmount
    ) internal view returns (uint256 amountSent, uint256 amountReceived) {
        amountSent = _amount;

        // @dev Apply the fee
        uint256 feeAmount = (amountSent * feeBps) / BPS_DENOMINATOR;
        amountReceived = amountSent - feeAmount;

        // @dev Check for slippage.
        if (amountReceived < _minAmount) revert SlippageExceeded(amountReceived, _minAmount);
    }

    function quoteOFT(
        SendParam calldata _sendParam
    )
        external
        view
        virtual
        returns (
            OFTLimit memory oftLimit,
            OFTFeeDetail[] memory oftFeeDetails,
            OFTReceipt memory oftReceipt
        )
    {
        uint256 minAmount = 0;
        uint256 maxAmount = type(uint64).max;
        oftLimit = OFTLimit(minAmount, maxAmount);

        // @dev Unused in this implementation
        oftFeeDetails = new OFTFeeDetail[](0);

        // @dev This is the same as the send() operation, but without the actual send.
        // - amountSent is the amount that would be debited from the sender.
        // - amountReceived is the amount that will be credited to the recipient.
        // The diff is the fee amount to be applied
        (uint256 amountSent, uint256 amountReceived) = _debitView(
            _sendParam.amountLD,
            _sendParam.minAmountLD
        );
        oftReceipt = OFTReceipt(amountSent, amountReceived);
    }

    // @dev The quote is as similar as possible to the actual send() operation.
    function quoteSend(
        SendParam calldata _sendParam,
        bool
    ) external view returns (MessagingFee memory msgFee) {
        // @dev Mock the amount to receive, this is the same operation used in the send().
        (, uint256 amountReceived) = _debitView(_sendParam.amountLD, _sendParam.minAmountLD);

        // @dev Handle the credits
        _assertCredits(_sendParam.dstEid, amountReceived);

        // @dev Builds the options and OFT message to quote in the endpoint.
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(
            SEND_OFT,
            _sendParam,
            amountReceived
        );

        MessagingParams memory messagingParams = MessagingParams(
            _sendParam.dstEid,
            _sendParam.to,
            message,
            options,
            false
        );

        // @dev Calculates the LayerZero fee for the send() operation.
        return ILayerZeroEndpointV2(lzEndpoint).quote(messagingParams, address(this));
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address
    ) external payable returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        // @dev Applies fees and determines the total amount to deduct from the sender, and the amount received
        (uint256 amountSent, uint256 amountReceived) = _debitView(
            _sendParam.amountLD,
            _sendParam.minAmountLD
        );

        // @dev Lock tokens by moving them into this contract from the caller.
        innerToken.safeTransferFrom(msg.sender, address(this), amountSent);

        // @dev Handle the credits
        _decreaseCredits(_sendParam.dstEid, amountReceived);
        _increaseCredits(LOCAL_EID, amountReceived);

        // @dev Increment the fee balance so we can account for fee withdrawals
        feeBalance += amountSent - amountReceived;

        nonce += 1;
        msgReceipt = MessagingReceipt(bytes32(0), nonce, _fee);

        // send innerToken to recipient
        innerToken.safeTransfer(address(uint160(uint256(_sendParam.to))), amountReceived);

        // @dev Formulate the OFT receipt.
        oftReceipt = OFTReceipt(amountSent, amountReceived);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSent, amountReceived);
    }
}
