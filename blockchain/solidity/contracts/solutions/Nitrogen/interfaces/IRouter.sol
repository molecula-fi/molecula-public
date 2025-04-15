// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {OperationStatus} from "../../../common/rebase/structures/OperationStatus.sol";

interface IRouter {
    /// @dev Information about the token.
    /// @param agent Agent's address.
    /// @param isRequestDepositPaused Flag indicating whether the `requestDeposit` function is paused for the token.
    /// @param isRequestRedeemPaused Flag indicating whether the `requestRedeem` function is paused for the token.
    /// @param minDepositValue Minimum deposit value for token.
    /// @param minRedeemShares Minimum redeem shares (in mUSD) for token.
    struct TokenInfo {
        address agent;
        bool isRequestDepositPaused;
        bool isRequestRedeemPaused;
        uint256 minDepositValue;
        uint256 minRedeemShares;
    }

    /// @dev Information about deposit operation.
    /// @param status Deposit operation status.
    /// @param user User's address.
    /// @param token Token address.
    /// @param tokenValue User's token value.
    /// @param agent Agent address for the token.
    struct DepositInfo {
        OperationStatus status;
        address user;
        address token;
        uint256 tokenValue;
        address agent;
    }

    /// @dev Information about redeem operation.
    /// @param status Redeem operation status.
    /// @param user User's address.
    /// @param token Token address.
    /// @param tokenValue User's token value.
    /// @param agent Agent address for the token.
    struct RedeemInfo {
        OperationStatus status;
        address user;
        address token;
        uint256 tokenValue;
        address agent;
    }

    /// @dev Pair token and agent.
    /// @param token Token's address.
    /// @param agent Agent's address.
    struct TokenAgent {
        address token;
        address agent;
    }

    /// @dev Error: `msg.sender` is not authorized for some function.
    error EBadSender();

    /// @dev Error: The `requestDeposit` function is called while being paused as the `isRequestDepositPaused` flag is set.
    error ERequestDepositPaused();

    /// @dev Error: The `requestDeposit` function is called while being paused as the `isRequestDepositPaused` flag is set for token.
    /// @param token Token address.
    error ETokenRequestDepositPaused(address token);

    /// @dev Error: The `requestRedeem` function is called while being paused as the `isRequestRedeemPaused` flag is set.
    error ERequestRedeemPaused();

    /// @dev Error: The `requestRedeem` function is called while being paused as the `isRequestRedeemPaused` flag is set for token.
    /// @param token Token address.
    error ETokenRequestRedeemPaused(address token);

    /// @dev Error: Token does not have an agent.
    /// @param token Token address.
    error ENoAgent(address token);

    /// @dev Error: The target token has already been added.
    error EAlreadyHasToken();

    /// @dev Error: The target token has already been removed.
    error EAlreadyRemoved();

    /// @dev Error to throw if the `owner` isn't the sender and `msg.sender` isn't the owner's operator.
    /// @param sender Message sender.
    /// @param owner Beneficiary of the deposit request.
    error EBadOwner(address sender, address owner);

    /// @dev Emitted when the withdrawal value is less than the `withdrawValue` value.
    /// @param redeemValue Minimal withdrawal value.
    error ETooLowRedeemValue(uint256 redeemValue);

    /// @dev Emitted when agent's code hash is not in white list.
    error AgentCodeHashIsNotInWhiteList();

    /// @dev Status is already set.
    error EAlreadySetStatus();

    /// @dev Emitted when the deposit value is less than the `depositValue` value.
    /// @param depositValue Minimal deposit value.
    error ETooLowDepositValue(uint256 depositValue);

    /// @dev Error to throw if an operation is called with invalid parameters.
    error EBadOperationParameters();

    /// @dev Error: Provided array is empty.
    error EEmptyArray();

    /// @dev Error: Provided forbidden selector.
    error EBadSelector();

    /// @dev Emitted when the `isRequestDepositPaused` flag is changed.
    /// @param newValue New value.
    event IsRequestDepositPausedChanged(bool newValue);

    /// @dev Emitted when the `isRequestRedeemPaused` flag is changed.
    /// @param newValue New value.
    event IsRequestRedeemPausedChanged(bool newValue);

    /// @dev Emitted when the `isRequestDepositPaused` flag is changed for token.
    /// @param token Token address.
    /// @param newValue New value.
    event IsRequestDepositPausedChanged(address token, bool newValue);

    /// @dev Emitted when the `isRequestRedeemPaused` flag is changed for token.
    /// @param token Token address.
    /// @param newValue New value.
    event IsRequestRedeemPausedChanged(address token, bool newValue);

    /// @dev Event emitted when an operator is set.
    /// @param controller Controller's address.
    /// @param operator Operator's address.
    /// @param approved Approval status.
    event OperatorSet(address indexed controller, address indexed operator, bool approved);

    /// @dev Event emitted `requestRedeem` called `redeem` function.
    event TokensAreRedeemed();

    /// @dev Event emitted when a user requests a deposit.
    /// @param controller Controller's address.
    /// @param owner User's address.
    /// @param requestId Operation ID.
    /// @param sender Sender's address.
    /// @param assets Amount of assets to deposit.
    /// @param token Token address.
    event DepositRequest(
        address indexed controller,
        address indexed owner,
        uint256 indexed requestId,
        address sender,
        uint256 assets,
        address token
    );

    /// @dev Emitted when a deposit gets confirmed.
    /// @param requestId Operation ID.
    /// @param user User's address that deposits.
    /// @param assets Deposit amount.
    /// @param shares Shares amount.
    /// @param token Token address.
    event DepositConfirm(
        uint256 indexed requestId,
        address user,
        uint256 assets,
        uint256 shares,
        address token
    );

    /// @dev Event emitted when redeem requests are ready to be processed.
    /// @param requestIds Array of request IDs.
    /// @param values Array of corresponding values.
    event Redeem(uint256[] requestIds, uint256[] values);

    /// @dev Event emitted when a user requests a withdrawal.
    /// @param controller Controller's address.
    /// @param owner User's address.
    /// @param requestId Operation ID.
    /// @param sender Sender's address.
    /// @param shares Amount of shares to withdraw.
    /// @param token Token address.
    event RedeemRequest(
        address indexed controller,
        address indexed owner,
        uint256 indexed requestId,
        address sender,
        uint256 shares,
        address token
    );

    /// @dev Emitted when a withdrawal gets confirmed.
    /// @param requestId Operation ID.
    /// @param user User's address that withdraws.
    /// @param assets Withdrawal amount.
    event RedeemConfirm(uint256 indexed requestId, address user, uint256 assets);

    /// @dev Event emitted when distributing yield.
    /// @param users Array of user addresses.
    /// @param shares Array of shares.
    event DistributeYield(address[] users, uint256[] shares);
}
