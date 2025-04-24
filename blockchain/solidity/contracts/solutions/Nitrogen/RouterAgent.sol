// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAgent} from "../../common/interfaces/IAgent.sol";
import {ISupplyManager} from "../../common/interfaces/ISupplyManager.sol";
import {IAccountant} from "../../common/interfaces/IAccountant.sol";

import {Router} from "./Router.sol";
import {ZeroValueChecker} from "../../common/ZeroValueChecker.sol";

/// @notice Pausable agent contract for the Ethereum Rebase token.
contract RouterAgent is IAccountant, IAgent, Ownable2Step, ZeroValueChecker {
    using SafeERC20 for IERC20;

    /// @dev Router address.
    Router public immutable ROUTER;

    /// @dev SupplyManager interface.
    ISupplyManager public immutable SUPPLY_MANAGER;

    /// @dev erc20 token's address.
    IERC20 internal _erc20Token;

    /// @dev Error: `msg.sender` is not authorized for some function.
    error EBadSender();

    /// @dev Error to throw if an operation is called with invalid parameters.
    error EBadOperationParameters();

    /// @dev Error: The ERC20 token address has already been added.
    error EAlreadySetToken();

    /// @dev Throws an error if called with the wrong sender.
    /// @param expectedSender Expected sender.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert EBadSender();
        }
        _;
    }

    /// @dev Initializes the contract setting the initializer address.
    /// @param initialOwner Owner address.
    /// @param routerAddress Router's address.
    /// @param supplyManagerAddress Supply Manager's contract address.
    constructor(
        address initialOwner,
        address routerAddress,
        address supplyManagerAddress
    )
        Ownable(initialOwner)
        checkNotZero(initialOwner)
        checkNotZero(routerAddress)
        checkNotZero(supplyManagerAddress)
    {
        ROUTER = Router(routerAddress);
        SUPPLY_MANAGER = ISupplyManager(supplyManagerAddress);
    }

    /// @dev Set token.
    /// @param token Token address.
    function setErc20Token(address token) external checkNotZero(token) onlyOwner {
        if (address(_erc20Token) != address(0)) {
            revert EAlreadySetToken();
        }

        _erc20Token = IERC20(token);
    }

    /// @dev Creates a new deposit request.
    /// @param requestId Redemption operation unique identifier.
    /// @param user User address.
    /// @param value Deposited value.
    function requestDeposit(
        uint256 requestId,
        address user,
        uint256 value
    ) external payable onlyZeroMsgValue only(address(ROUTER)) {
        // Transfer the requested token value from the user.
        // slither-disable-next-line arbitrary-send-erc20
        _erc20Token.safeTransferFrom(user, address(this), value);

        // Approve to the Molecula Pool.
        _erc20Token.forceApprove(SUPPLY_MANAGER.getMoleculaPool(), value);

        // Call the SupplyManager's deposit method.
        uint256 shares = SUPPLY_MANAGER.deposit(address(_erc20Token), requestId, value);

        // Call the router to confirm the deposit.
        ROUTER.confirmDeposit(requestId, shares);

        // Emit an event to log the deposit operation.
        emit Deposit(requestId, value, shares);
    }

    /// @dev Requests the redeem operation.
    /// @param requestId Redeem operation ID.
    /// @param shares Shares to redeem.
    function requestRedeem(
        uint256 requestId,
        uint256 shares
    ) external payable only(address(ROUTER)) {
        // Call the Supply Manager's `requestRedeem` method.
        uint256 tokenValue = SUPPLY_MANAGER.requestRedeem(address(_erc20Token), requestId, shares);

        // Emit an event to log the redeem operation.
        emit RedeemRequest(requestId, shares, tokenValue);
    }

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function redeem(
        address fromAddress,
        uint256[] memory requestIds,
        uint256[] memory values,
        uint256 totalValue
    ) external payable onlyZeroMsgValue only(address(SUPPLY_MANAGER)) {
        // slither-disable-next-line arbitrary-send-erc20
        _erc20Token.safeTransferFrom(fromAddress, address(this), totalValue);
        // slither-disable-next-line unused-return
        ROUTER.redeem(requestIds, values);
    }

    /// @dev Confirms the redemption.
    /// @param user User address.
    /// @param value Value to redeem.
    function confirmRedeem(address user, uint256 value) external only(address(ROUTER)) {
        _erc20Token.safeTransfer(user, value);
    }

    /// @inheritdoc IAgent
    function getERC20Token() external view returns (address token) {
        return address(_erc20Token);
    }

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function distribute(
        address[] memory users,
        uint256[] memory shares
    ) external payable onlyZeroMsgValue only(address(SUPPLY_MANAGER)) {
        ROUTER.distribute(users, shares);
        // Emit an event to log operation.
        emit DistributeYield(users, shares);
    }
}
