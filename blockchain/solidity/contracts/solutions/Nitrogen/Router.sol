// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAgent} from "../../common/interfaces/IAgent.sol";
import {IRouter} from "./interfaces/IRouter.sol";
import {ISupplyManager} from "../../common/interfaces/ISupplyManager.sol";

import {MoleculaPoolTreasury} from "../../core/MoleculaPoolTreasury.sol";
import {OperationStatus} from "../../common/rebase/structures/OperationStatus.sol";
import {RebaseERC20} from "../../common/rebase/RebaseERC20.sol";
import {RouterAgent} from "./RouterAgent.sol";
import {ZeroValueChecker} from "../../common/ZeroValueChecker.sol";

/// @notice A pausable router contract used as an owner of the RebaseToken, which allows dealing with more underlying
/// assets than one which is defined in RebaseToken's Accountant.
contract Router is IRouter, Ownable2Step, ZeroValueChecker {
    using SafeERC20 for IERC20;
    using Address for address;

    /// @dev Rebase token contract's address.
    RebaseERC20 public immutable REBASE_TOKEN;

    /// @dev Flag indicating whether the `requestDeposit` function is paused.
    bool public isRequestDepositPaused;

    /// @dev Flag indicating whether the `requestRedeem` function is paused.
    bool public isRequestRedeemPaused;

    /// @dev Last operation ID tracked by the contract.
    uint256 private _lastOperationIndex;

    /// @dev Account address that can pause the `requestDeposit` and `requestRedeem` functions.
    address public guardian;

    /// @dev Checks if an operator is approved by the controller.
    mapping(address controller => mapping(address operator => bool)) public isOperator;

    /// @dev Mapping of token addresses to their respective token info.
    mapping(address token => TokenInfo tokenInfo) public tokenInfoMap;

    /// @dev Mapping operation ID to the deposit information.
    mapping(uint256 => DepositInfo) public depositRequests;

    /// @dev Mapping of request ID to their respective redeem information.
    mapping(uint256 requestId => RedeemInfo) public redeemRequests;

    /// @dev White list of valid agents' code hashes.
    mapping(bytes32 codeHash => bool isValid) public agentCodeHashWhiteList;

    /// @dev Check that `msg.sender` is the owner or guardian.
    modifier onlyAuthForPause() {
        if (msg.sender != owner() && msg.sender != guardian) {
            revert EBadSender();
        }
        _;
    }

    /// @dev Throws an error if a message sender is not the owner's operator.
    /// @param owner Owner of the assets or shares.
    modifier onlyOperator(address owner) {
        if (owner != msg.sender && !isOperator[owner][msg.sender]) {
            revert EBadOwner(msg.sender, owner);
        }
        _;
    }

    /// @dev Check that router has agent for the token.
    /// @param token Token address.
    modifier hasAgent(address token) {
        if (tokenInfoMap[token].agent == address(0)) {
            revert ENoAgent(token);
        }
        _;
    }

    /// @dev Initializes the contract setting the initializer address.
    /// @param initialOwner Owner address.
    /// @param rebaseTokenAddress Rebase token address.
    /// @param guardianAddress Guardian address that can pause the contract.
    constructor(
        address initialOwner,
        address rebaseTokenAddress,
        address guardianAddress
    )
        Ownable(initialOwner)
        checkNotZero(initialOwner)
        checkNotZero(rebaseTokenAddress)
        checkNotZero(guardianAddress)
    {
        REBASE_TOKEN = RebaseERC20(rebaseTokenAddress);
        guardian = guardianAddress;
    }

    /// @dev Creates a new deposit.
    /// @param assets Amount of assets to deposit.
    /// @param controller Controller of the request: the beneficiary of the deposit.
    /// @param owner Owner of assets.
    /// @param token Token address.
    /// @return requestId Operation ID.
    function requestDeposit(
        uint256 assets,
        address controller,
        address owner,
        address token
    ) external onlyOperator(owner) returns (uint256 requestId) {
        // Check whether the `requestDeposit` function is paused.
        if (isRequestDepositPaused) {
            revert ERequestDepositPaused();
        }

        // Check whether the dedicated agent for the token is present.
        TokenInfo memory tokenInfo = _getTokenInfo(token);

        // Check whether the `requestDeposit` function is paused for token.
        if (tokenInfo.isRequestDepositPaused) {
            revert ETokenRequestDepositPaused(token);
        }

        // Check whether deposit value is at least `minDepositValue`.
        if (assets < tokenInfo.minDepositValue) {
            revert ETooLowDepositValue(tokenInfo.minDepositValue);
        }

        // Generate an ID for each new operation.
        requestId = _generateOperationId();

        // Check if the deposit operation already exists.
        if (depositRequests[requestId].status != OperationStatus.None) {
            revert EBadOperationParameters();
        }

        // Store the deposit operation in the `depositRequests` mapping.
        depositRequests[requestId] = DepositInfo({
            status: OperationStatus.Pending,
            user: controller,
            token: token,
            tokenValue: assets,
            agent: tokenInfo.agent
        });

        // Call the Accountant to request the deposit.
        RouterAgent(tokenInfo.agent).requestDeposit(requestId, owner, assets);

        // Emit an event to log the deposit request.
        emit DepositRequest(controller, owner, requestId, msg.sender, assets, token);

        return requestId;
    }

    /// @dev Confirms a deposit.
    /// @param requestId Operation ID.
    /// @param shares Shares' amount.
    function confirmDeposit(uint256 requestId, uint256 shares) external {
        // Get deposit information.
        DepositInfo storage depositInfo = depositRequests[requestId];

        // Check if the operation exists.
        if (depositInfo.status != OperationStatus.Pending) {
            revert EBadOperationParameters();
        }

        // Check msg.sender
        if (msg.sender != depositInfo.agent) {
            revert EBadSender();
        }

        // Get the user's address to proceed with the deposit operation.
        address user = depositInfo.user;

        // Save the operation status.
        depositInfo.status = OperationStatus.Confirmed;

        // Value minted for the user.
        uint256 value18 = 0;
        // If we have shares, mint then.
        if (shares > 0) {
            // Convert the shares to the value.
            value18 = REBASE_TOKEN.convertToAssets(shares);

            // Mint shares for the user.
            REBASE_TOKEN.mint(user, shares);
        }

        // Emit an event to log the deposit confirmation.
        emit DepositConfirm(requestId, user, value18, shares, depositInfo.token);
    }

    /// @dev Creates a new redeem operation request, redeem tokens and confirm request.
    /// @param shares Amount of shares to withdraw.
    /// @param controller Controller of the Request: the beneficiary of the redeem operation.
    /// @param owner Owner of shares.
    /// @param token Token address.
    /// @return requestId Operation ID.
    /// @return agent Agent address.
    function requestRedeem(
        uint256 shares,
        address controller,
        address owner,
        address token
    ) public onlyOperator(owner) returns (uint256 requestId, address agent) {
        // Check whether the `requestRedeem` function is paused.
        if (isRequestRedeemPaused) {
            revert ERequestRedeemPaused();
        }

        // Check whether the `requestRedeem` function is paused for the token.
        TokenInfo memory tokenInfo = _getTokenInfo(token);
        if (tokenInfo.isRequestRedeemPaused) {
            revert ETokenRequestRedeemPaused(token);
        }

        // Set the shares' amount equal to the user's shares if the shares' amount is greater than the user's shares.
        uint256 userShares = REBASE_TOKEN.sharesOf(owner);
        if (shares > userShares) {
            shares = userShares;
        }

        // Check the redeem operation value.
        if (shares < tokenInfo.minRedeemShares) {
            revert ETooLowRedeemValue(tokenInfo.minRedeemShares);
        }

        // Generate an ID for each new operation.
        requestId = _generateOperationId();

        // Check if the redeem operation already exists.
        if (redeemRequests[requestId].status != OperationStatus.None) {
            revert EBadOperationParameters();
        }

        // Store the redeem operation in the `redeemRequests` mapping.
        redeemRequests[requestId] = RedeemInfo({
            status: OperationStatus.Pending,
            user: controller,
            token: token,
            tokenValue: 0, // Set correct value in `redeem` function
            agent: tokenInfo.agent
        });

        // Burn the owner's shares.
        REBASE_TOKEN.burn(owner, shares);

        // Call the Agent to request the redeem operation.
        RouterAgent(tokenInfo.agent).requestRedeem(requestId, shares);

        // Emit an event to log the redeem operation request.
        emit RedeemRequest(controller, owner, requestId, msg.sender, shares, token);

        // Return the requestID and the dedicated agent.
        return (requestId, tokenInfo.agent);
    }

    /**
     * @dev Executes the redeem operation.
     * @param operationIds Array of the operation IDs.
     * @param tokenValues Array of values.
     * @return totalValue Total value to redeem.
     */
    function redeem(
        uint256[] memory operationIds,
        uint256[] memory tokenValues
    ) external returns (uint256 totalValue) {
        // Check whether `operationIds` is not empty in order to check msg.sender below.
        if (operationIds.length == 0) {
            revert EEmptyArray();
        }

        for (uint256 i = 0; i < operationIds.length; ++i) {
            RedeemInfo storage redeemInfo = redeemRequests[operationIds[i]];

            // Check whether msg.sender is correct agent.
            if (msg.sender != redeemInfo.agent) {
                revert EBadSender();
            }

            // Check if the operation is pending.
            // Do nothing otherwise, since the operation might be already processed.
            if (redeemInfo.status == OperationStatus.Pending) {
                redeemInfo.tokenValue = tokenValues[i];
                redeemInfo.status = OperationStatus.ReadyToConfirm;
                // Calculate the redeem operation total value.
                totalValue += tokenValues[i];
            }
        }

        // Emit an event to log the redeem operation.
        emit Redeem(operationIds, tokenValues);

        return totalValue;
    }

    /// @dev Confirms a redeem operation.
    /// @param requestId Operation ID.
    function confirmRedeem(uint256 requestId) public {
        RedeemInfo storage redeemInfo = redeemRequests[requestId];

        if (redeemInfo.status != OperationStatus.ReadyToConfirm) {
            // Revert the transaction with an error if the redeem operation does not exist.
            revert EBadOperationParameters();
        }

        // Save the operation status.
        redeemInfo.status = OperationStatus.Confirmed;

        // Call the RouterAgent to confirm the redeem operation.
        address token = redeemInfo.token;
        TokenInfo memory tokenInfo = _getTokenInfo(token);
        RouterAgent(tokenInfo.agent).confirmRedeem(redeemInfo.user, redeemInfo.tokenValue);

        // Emit an event to log redeem operation confirmation.
        emit RedeemConfirm(requestId, redeemInfo.user, redeemInfo.tokenValue);
    }

    /// @dev Creates a new redeem operation request and tries to redeem the tokens immediately, confirms the request at last.
    /// @param shares Amount of shares to redeem.
    /// @param controller Controller of the Request: the beneficiary of the redeem operation.
    /// @param owner Owner of shares.
    /// @return requestId Operation ID.
    /// @param token Token address.
    function redeemImmediately(
        uint256 shares,
        address controller,
        address owner,
        address token
    ) external returns (uint256) {
        // Make a redeem requests.
        // slither-disable-next-line reentrancy-no-eth
        (uint256 requestId, address agent) = requestRedeem(shares, controller, owner, token);

        // Find a Molecula Pool address.
        ISupplyManager supplyManager = RouterAgent(agent).SUPPLY_MANAGER();
        address moleculaPoolTreasury = supplyManager.getMoleculaPool();

        // Try to redeem from the pool.
        uint256[] memory requestIds = new uint256[](1);
        requestIds[0] = requestId;
        MoleculaPoolTreasury(moleculaPoolTreasury).redeem(requestIds);

        // Confirm the redemption.
        confirmRedeem(requestId);

        // Return a request ID.
        return requestId;
    }

    /// @dev Generates an operation ID.
    /// @return id Operation ID.
    function _generateOperationId() internal returns (uint256 id) {
        unchecked {
            ++_lastOperationIndex;
        }
        bytes32 h = keccak256(abi.encodePacked(address(this), block.chainid, _lastOperationIndex));
        return uint256(h);
    }

    /// @dev Check that router is able to work with token and return token information.
    /// @param token Token address.
    /// @return tokenInfo Token info.
    function _getTokenInfo(address token) internal view returns (TokenInfo memory tokenInfo) {
        tokenInfo = tokenInfoMap[token];
        if (tokenInfo.agent == address(0)) {
            revert ENoAgent(token);
        }
        return tokenInfo;
    }

    /// @dev Approves or disapproves an operator for a controller.
    /// We don't support the operator logic here.
    /// @param operator Corresponding operator.
    /// @param approved Approval.
    /// @return result Approval result.
    function setOperator(address operator, bool approved) external returns (bool result) {
        isOperator[msg.sender][operator] = approved;
        emit OperatorSet(msg.sender, operator, approved);
        return true;
    }

    /// @dev Add new agent.
    /// @param agent Agent address.
    /// @param isDepositPaused Flag indicating whether the `requestDeposit` function is paused for the agent's token.
    /// @param isRedeemPaused Flag indicating whether the `requestRedeem` function is paused for the agent's token.
    /// @param minDepositValue Minimum deposit value for token.
    /// @param minRedeemShares Minimum redeem shares (in mUSD) for token.
    function addAgent(
        address agent,
        bool isDepositPaused,
        bool isRedeemPaused,
        uint256 minDepositValue,
        uint256 minRedeemShares
    ) external onlyOwner {
        // Check whether agent's codee hash in white list.
        if (!agentCodeHashWhiteList[agent.codehash]) {
            revert AgentCodeHashIsNotInWhiteList();
        }

        // Get agent's token.
        address token = IAgent(agent).getERC20Token();

        // Check whether agent's token is initialised (not zero address).
        if (token == address(0)) {
            revert EZeroAddress();
        }

        // Check whether there is no agent for the token.
        if (tokenInfoMap[token].agent != address(0)) {
            revert EAlreadyHasToken();
        }

        // Add agent.
        tokenInfoMap[token] = TokenInfo({
            agent: agent,
            isRequestRedeemPaused: isDepositPaused,
            isRequestDepositPaused: isRedeemPaused,
            minDepositValue: minDepositValue,
            minRedeemShares: minRedeemShares
        });
    }

    /// @dev Set minimum deposit value for token.
    /// @param token Token address.
    /// @param minDepositValue Minimum deposit value.
    function setMinDepositValue(
        address token,
        uint256 minDepositValue
    ) external hasAgent(token) onlyOwner {
        tokenInfoMap[token].minDepositValue = minDepositValue;
    }

    /// @dev Remove the agen by token address.
    /// @param token Removing token address.
    function removeToken(address token) external onlyOwner {
        if (tokenInfoMap[token].agent == address(0)) {
            revert EAlreadyRemoved();
        }
        delete tokenInfoMap[token];
    }

    /// @dev Adds shares to the user.
    /// @param users User's address.
    /// @param shares Amount of shares to add.
    function distribute(address[] memory users, uint256[] memory shares) external {
        // Check msg.sender
        address token = IAgent(msg.sender).getERC20Token();
        TokenInfo memory tokenInfo = _getTokenInfo(token);
        if (msg.sender != tokenInfo.agent) {
            revert EBadSender();
        }

        for (uint256 i = 0; i < users.length; ++i) {
            REBASE_TOKEN.mint(users[i], shares[i]);
        }

        // Emit an event to log operation.
        emit DistributeYield(users, shares);
    }

    /// @dev Transfers ownership of the contract to a new account (`newOwner`).
    /// Can only be called by the current owner.
    /// @param data Function payload.
    /// @return result Data that was returned by function call.
    function callRebaseToken(bytes memory data) external onlyOwner returns (bytes memory result) {
        // Decode the function selector.
        bytes4 selector = bytes4(data);

        // Check whether the selector is allowed.
        if (
            selector == Ownable2Step.transferOwnership.selector ||
            selector == Ownable.renounceOwnership.selector ||
            selector == RebaseERC20.mint.selector ||
            selector == RebaseERC20.burn.selector
        ) {
            revert EBadSelector();
        }

        // Call RebaseToken's function.
        return address(REBASE_TOKEN).functionCall(data);
    }

    /// @dev Change the guardian's address.
    /// @param newGuardian New guardian's address.
    function changeGuardian(address newGuardian) external onlyOwner checkNotZero(newGuardian) {
        guardian = newGuardian;
    }

    /// @dev Set a new value for the `isRequestDepositPaused` flag.
    /// @param newValue New value.
    function _setIsRequestDepositPaused(bool newValue) private {
        if (isRequestDepositPaused != newValue) {
            isRequestDepositPaused = newValue;
            emit IsRequestDepositPausedChanged(newValue);
        }
    }

    /// @dev Set a new value for the `isRequestRedeemPaused` flag.
    /// @param newValue New value.
    function _setIsRequestRedeemPaused(bool newValue) private {
        if (isRequestRedeemPaused != newValue) {
            isRequestRedeemPaused = newValue;
            emit IsRequestRedeemPausedChanged(newValue);
        }
    }

    /// @dev Pause the `requestDeposit` function.
    function pauseRequestDeposit() external onlyAuthForPause {
        _setIsRequestDepositPaused(true);
    }

    /// @dev Unpause the `requestDeposit` function.
    function unpauseRequestDeposit() external onlyOwner {
        _setIsRequestDepositPaused(false);
    }

    /// @dev Pause the `requestRedeem` function.
    function pauseRequestRedeem() external onlyAuthForPause {
        _setIsRequestRedeemPaused(true);
    }

    /// @dev Unpause the `requestRedeem` function.
    function unpauseRequestRedeem() external onlyOwner {
        _setIsRequestRedeemPaused(false);
    }

    /// @dev Pause the `requestDeposit` and `requestRedeem` functions.
    function pauseAll() external onlyAuthForPause {
        _setIsRequestDepositPaused(true);
        _setIsRequestRedeemPaused(true);
    }

    /// @dev Unpause the `requestDeposit` and `requestRedeem` functions.
    function unpauseAll() external onlyOwner {
        _setIsRequestDepositPaused(false);
        _setIsRequestRedeemPaused(false);
    }

    /// @dev Set a new value for the `isRequestDepositPaused` flag for the token.
    /// @param token Token address.
    /// @param newValue New value.
    function _setIsRequestDepositPausedForToken(
        address token,
        bool newValue
    ) private hasAgent(token) {
        tokenInfoMap[token].isRequestDepositPaused = newValue;
        emit IsRequestDepositPausedChanged(token, newValue);
    }

    /// @dev Set a new value for the `isRequestRedeemPaused` flag for the token.
    /// @param token Token address.
    /// @param newValue New value.
    function _setIsRequestRedeemPausedForToken(
        address token,
        bool newValue
    ) private hasAgent(token) {
        tokenInfoMap[token].isRequestRedeemPaused = newValue;
        emit IsRequestRedeemPausedChanged(token, newValue);
    }

    /// @dev Pause the `requestDeposit` function for the token.
    /// @param token Token address.
    function pauseTokenRequestDeposit(address token) external onlyAuthForPause {
        _setIsRequestDepositPausedForToken(token, true);
    }

    /// @dev Unpause the `requestDeposit` function for the token.
    /// @param token Token address.
    function unpauseTokenRequestDeposit(address token) external onlyOwner {
        _setIsRequestDepositPausedForToken(token, false);
    }

    /// @dev Pause the `requestRedeem` function for the token.
    /// @param token Token address.
    function pauseTokenRequestRedeem(address token) external onlyAuthForPause {
        _setIsRequestRedeemPausedForToken(token, true);
    }

    /// @dev Unpause the `requestRedeem` function for the token.
    /// @param token Token address.
    function unpauseTokenRequestRedeem(address token) external onlyOwner {
        _setIsRequestRedeemPausedForToken(token, false);
    }

    /// @dev Pause the `requestDeposit` and `requestRedeem` functions for the token.
    /// @param token Token address.
    function pauseToken(address token) external onlyAuthForPause {
        _setIsRequestDepositPausedForToken(token, true);
        _setIsRequestRedeemPausedForToken(token, true);
    }

    /// @dev Unpause the `requestDeposit` and `requestRedeem` functions for the token.
    /// @param token Token address.
    function unpauseToken(address token) external onlyOwner {
        _setIsRequestDepositPausedForToken(token, false);
        _setIsRequestRedeemPausedForToken(token, false);
    }

    /// @dev Add/remove the agent's hash code to/from the white list.
    /// @param codeHash agent's hash code.
    /// @param isValid Flag indicating whether hash code is valid.
    function setAgentCodeHashInWhiteList(bytes32 codeHash, bool isValid) external onlyOwner {
        if (agentCodeHashWhiteList[codeHash] == isValid) {
            revert EAlreadySetStatus();
        }
        agentCodeHashWhiteList[codeHash] = isValid;
    }
}
