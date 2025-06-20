// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {ZeroValueChecker} from "./../../common/ZeroValueChecker.sol";
import {IMoleculaPoolV2} from "./../../coreV2/interfaces/IMoleculaPoolV2.sol";
import {ISupplyManagerV2WithNative} from "./../../coreV2/interfaces/ISupplyManagerV2.sol";
import {ISupplyManagerV2} from "./../../coreV2/interfaces/ISupplyManagerV2.sol";
import {ConstantsCoreV2} from "../../coreV2/Constants.sol";
import {IMoleculaPoolV2WithNativeToken} from "../../coreV2/interfaces/IMoleculaPoolV2.sol";

/**
 * @dev Token parameters.
 * @param token Token address.
 * @param n Normalization to 18 decimals: equal to the `18 - poolToken.decimals` value.
 * @param isERC4626 Boolean indicating whether the token is of the ERC-4626 type.
 */
struct TokenParams {
    address token;
    int8 n;
    bool isERC4626;
}

enum TokenType {
    None,
    ERC20, // Value representing the ERC20 token type, not an extension.
    ERC4626
}

/**
 * @dev Token information.
 * @param tokenType Token type.
 * @param isBlocked Boolean flag indicating whether the token is blocked.
 * @param n Normalization to 18 decimals: equal to the `18 - poolToken.decimals` value.
 * @param arrayIndex Index in `TokenParams[] pool`.
 * @param valueToRedeem Value to redeem in the token amount.
 */
struct TokenInfo {
    TokenType tokenType;
    bool isBlocked;
    int8 n;
    uint32 arrayIndex;
    uint256 valueToRedeem;
}

/// @notice Based on MoleculaPoolTreasury
contract MockDistributedPool is
    Ownable,
    IMoleculaPoolV2,
    ZeroValueChecker,
    IMoleculaPoolV2WithNativeToken
{
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;

    /// @dev Supply Manager's address.
    address public immutable SUPPLY_MANAGER;

    /// @dev Boolean flag indicating whether the `redeem` function is paused.
    bool public isRedeemPaused;

    /// @dev Boolean flag indicating whether the `execute` function is paused.
    bool public isExecutePaused;

    /// @dev Pool Keeper's address.
    address public poolKeeper;

    /// @dev Account's address that can pause the `redeem` and `execute` functions.
    address public guardian;

    /// @dev Pool of all the supported tokens including the ones of the ERC20 and ERC4626 types.
    TokenParams[] public pool;

    /// @dev Mapping of the ERC20 pool.
    mapping(address => TokenInfo) public poolMap;

    /// @dev White list of addresses callable by this contract.
    mapping(address => bool) public isInWhiteList;

    /// @dev Error: Not a smart-contract.
    error ENotContract();

    /// @dev Error: Not ERC20 token pool.
    error ENotERC20PoolToken();

    /// @dev Error: Provided array is empty.
    error EEmptyArray();

    /// @dev Error: Duplicated token.
    error EDuplicatedToken();

    /// @dev Error: Removed token does not have the zero balance.
    error ENotZeroBalanceOfRemovedToken();

    /// @dev Error: Removed token does not have the zero `valueToRedeem`.
    error ENotZeroValueToRedeemOfRemovedToken();

    /// @dev Error: Molecula Pool does not have the token.
    error ETokenNotExist();

    /// @dev Error: The msg.sender is not authorized for some function.
    error EBadSender();

    /// @dev Error: The `redeem` or `execute` function with the blocked token is called.
    error ETokenBlocked();

    /// @dev Error: The target address is not in the white list.
    error ENotInWhiteList();

    /// @dev Error: The target address has already been added.
    error EAlreadyAddedInWhiteList();

    /// @dev Error: The target address is not in the whitelist.
    error ENotPresentInWhiteList();

    /// @dev Error: The `execute` function is called while being paused as the `isExecutePaused` flag is set.
    error EExecutePaused();

    /// @dev Error: The `redeem` function is called while being paused as the `isRedeemPaused` flag is set.
    error ERedeemPaused();

    /// @dev Error: There are unprocessed redeem requests.
    error EUnprocessedRedeemRequests();

    /// @dev Emitted when the target has been added in the white list.
    /// @param target Address.
    event AddedInWhiteList(address indexed target);

    /// @dev Emitted when the target has been deleted from the white list.
    /// @param target Address.
    event DeletedFromWhiteList(address indexed target);

    /// @dev Emitted when the `isExecutePaused` flag is changed.
    /// @param newValue New value.
    event IsExecutePausedChanged(bool indexed newValue);

    /// @dev Emitted when the `isRedeemPaused` flag is changed.
    /// @param newValue New value.
    event IsRedeemPausedChanged(bool indexed newValue);

    /// @dev Emitted when `token` is blocked or unblocked.
    /// @param token Token address.
    /// @param isBlocked New token status.
    event TokenBlockedChanged(address indexed token, bool indexed isBlocked);

    /// @dev Throws an error if called with the wrong sender.
    /// @param expectedSender Expected sender.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert EBadSender();
        }
        _;
    }

    /// @dev Check that `msg.sender` is the owner or guardian.
    modifier onlyAuthForPause() {
        if (msg.sender != owner() && msg.sender != guardian) {
            revert EBadSender();
        }
        _;
    }

    /**
     * @dev Initializes the contract setting the initializer address.
     * @param initialOwner Owner's address.
     * @param tokens List of ERC20/ERC4626 tokens.
     * @param poolKeeperAddress Pool Keeper's address.
     * @param supplyManagerAddress Supply Manager's address.
     * @param whiteList List of whitelisted addresses.
     * @param guardianAddress Guardian address that can pause the contract.
     */
    constructor(
        address initialOwner,
        address[] memory tokens,
        address poolKeeperAddress,
        address supplyManagerAddress,
        address[] memory whiteList,
        address guardianAddress
    )
        Ownable(initialOwner)
        checkNotZero(initialOwner)
        checkNotZero(poolKeeperAddress)
        checkNotZero(supplyManagerAddress)
        checkNotZero(guardianAddress)
    {
        uint256 length = tokens.length;
        for (uint256 i = 0; i < length; ++i) {
            _addToken(tokens[i]);
        }
        poolKeeper = poolKeeperAddress;
        SUPPLY_MANAGER = supplyManagerAddress;

        length = whiteList.length;
        for (uint256 i = 0; i < length; ++i) {
            _addInWhiteList(whiteList[i]);
        }
        guardian = guardianAddress;
    }

    /**
     * @dev Normalizes the value.
     * @param n Normalization to 18 decimals: equal to the `18 - poolToken.decimals` value.
     * @param value Value to normalize.
     * @return result Normalized value.
     */
    function _normalize(int8 n, uint256 value) internal pure returns (uint256 result) {
        uint256 multiplier;
        if (n > 0) {
            multiplier = 10 ** uint256(uint8(n));
            result = value * multiplier;
        } else if (n < 0) {
            multiplier = 10 ** uint256(uint8(-n));
            result = value / multiplier;
        } else {
            // n == 0.
            result = value;
        }
        return result;
    }

    /// @dev Convert the token value (sUSDe, USDe, etc) to mUSDe.
    /// @param value Token value.
    /// @param token Token address.
    /// @param n Normalization to 18 decimals: equal to the `18 - poolToken.decimals` value.
    /// @param isERC4626 Boolean indicating whether the token is of the ERC-4626 type.
    /// @return mUSDAmount mUSD amount.
    function _tokenAmountTomUSD(
        uint256 value,
        address token,
        int8 n,
        bool isERC4626
    ) private view returns (uint256 mUSDAmount) {
        mUSDAmount = 0;
        if (value > 0) {
            if (isERC4626) {
                // Convert `value` (e.g. mUSDe to USDe) to assets.
                value = IERC4626(token).convertToAssets(value);
            }
            // Note: `value` is in USD (e.g. USDT, USDe, etc).
            mUSDAmount = _normalize(n, value);
        }
    }

    /**
     * @dev Returns the total supply of the pool (TVL).
     * @return supply Total pool supply.
     * @return totalRedeem Total redeem value.
     */
    function totalPoolsSupplyAndRedeem() public view returns (uint256 supply, uint256 totalRedeem) {
        supply = 0;
        totalRedeem = 0;
        uint256 len = pool.length;
        for (uint256 i = 0; i < len; ++i) {
            TokenParams memory tokenParam = pool[i];
            address token = tokenParam.token;

            uint256 balance;
            if (token == ConstantsCoreV2.NATIVE_TOKEN) {
                balance = address(this).balance;
            } else {
                balance = IERC20(token).balanceOf(address(this));
            }
            uint256 curSupply = _tokenAmountTomUSD(
                balance,
                token,
                tokenParam.n,
                tokenParam.isERC4626
            );
            supply += curSupply;

            uint256 redeemValue = poolMap[token].valueToRedeem;
            totalRedeem += _tokenAmountTomUSD(
                redeemValue,
                token,
                tokenParam.n,
                tokenParam.isERC4626
            );
        }
    }

    function totalSupply() public view returns (uint256 res) {
        (uint256 supply, uint256 redeemValue) = totalPoolsSupplyAndRedeem();
        if (redeemValue > supply) {
            return 0;
        }
        return supply - redeemValue;
    }

    /**
     * @dev Add the token to the pool.
     * @param token ERC20 token address.
     */
    function _addToken(address token) internal {
        if (token == ConstantsCoreV2.NATIVE_TOKEN) {
            // Ensure that the token is not duplicated.
            if (poolMap[token].tokenType != TokenType.None) {
                revert EDuplicatedToken();
            }

            // Add the token to the pool.
            int8 n = 0;
            pool.push(TokenParams(token, n, false));
            poolMap[token] = TokenInfo({
                tokenType: TokenType.ERC20,
                n: n,
                arrayIndex: uint32(pool.length - 1),
                valueToRedeem: 0,
                isBlocked: false
            });
        } else {
            // Ensure that the token is a contract before making a call.
            if (token.code.length == 0) {
                revert ENotContract();
            }

            // Ensure that the token has the `balanceOf()` function.
            if (!_hasBalanceOf(token)) {
                revert ENotERC20PoolToken();
            }

            bool isERC4626 = _hasConvertToAssets(token);

            // Ensure that the token is not duplicated.
            if (poolMap[token].tokenType != TokenType.None) {
                revert EDuplicatedToken();
            }

            // Add the token to the pool.
            uint8 decimals = IERC20Metadata(token).decimals();
            int8 n = 18 - int8(decimals);
            pool.push(TokenParams(token, n, isERC4626));
            poolMap[token] = TokenInfo({
                tokenType: isERC4626 ? TokenType.ERC4626 : TokenType.ERC20,
                n: n,
                arrayIndex: uint32(pool.length - 1),
                valueToRedeem: 0,
                isBlocked: false
            });
        }
    }

    /**
     * @dev Delete the last value from the pool.
     * @param token Token address.
     */
    function _removeToken(address token) internal {
        if (poolMap[token].tokenType == TokenType.None) {
            revert ETokenNotExist();
        }

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            revert ENotZeroBalanceOfRemovedToken();
        }
        if (poolMap[token].valueToRedeem > 0) {
            revert ENotZeroValueToRedeemOfRemovedToken();
        }

        uint32 i = poolMap[token].arrayIndex;
        TokenParams storage lastElement = pool[pool.length - 1];
        pool[i] = lastElement;
        poolMap[lastElement.token].arrayIndex = i;
        delete poolMap[token];
        pool.pop();
    }

    /**
     * @dev Check if the token has `balanceOf` function.
     * @param token Token address.
     * @return has True if the token has `balanceOf` function.
     */
    function _hasBalanceOf(address token) internal view returns (bool has) {
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(this)) // Test with current contract address
        );

        return success && data.length == 32; // Must return a uint256 value
    }

    /**
     * @dev Check whether the token has the `convertToAssets` function.
     * @param token Token address.
     * @return has Boolean indicating whether the token has the `convertToAssets` function.
     */
    function _hasConvertToAssets(address token) internal view returns (bool has) {
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(IERC4626.convertToAssets.selector, uint256(1)) // Test with dummy value (1 share)
        );

        return success && data.length == 32; // Must return a uint256 value
    }

    /**
     * @dev Add the token to the pool.
     * @param token ERC20 token address.
     */
    function addToken(address token) external onlyOwner {
        _addToken(token);
    }

    /**
     * @dev Delete the last value from the pool.
     * @param token Token address.
     */
    function removeToken(address token) external onlyOwner {
        _removeToken(token);
    }

    /**
     * @dev Sets the Pool Keeper's wallet.
     * @param poolKeeperAddress Pool Keeper's wallet.
     */
    function setPoolKeeper(
        address poolKeeperAddress
    ) external onlyOwner checkNotZero(poolKeeperAddress) {
        poolKeeper = poolKeeperAddress;
    }

    function _deposit(
        uint256 requestId,
        address token,
        address from,
        uint256 value
    ) internal only(SUPPLY_MANAGER) returns (uint256 moleculaTokenAmount) {
        requestId;
        if (poolMap[token].tokenType == TokenType.None) {
            revert ETokenNotExist();
        }
        if (poolMap[token].tokenType == TokenType.ERC20) {
            moleculaTokenAmount = _normalize(poolMap[token].n, value);
        } else {
            uint256 assets = IERC4626(token).convertToAssets(value);
            moleculaTokenAmount = _normalize(poolMap[token].n, assets);
        }
        if (token == ConstantsCoreV2.NATIVE_TOKEN) {
            require(value == msg.value, "value != msg.value");
        } else {
            // Transfer assets to the token holder.
            // slither-disable-next-line arbitrary-send-erc20
            IERC20(token).safeTransferFrom(from, address(this), value);
        }
        return moleculaTokenAmount;
    }

    /// @inheritdoc IMoleculaPoolV2
    function deposit(
        uint256 requestId,
        address token,
        address from,
        uint256 value
    ) external only(SUPPLY_MANAGER) returns (uint256 moleculaTokenAmount) {
        return _deposit(requestId, token, from, value);
    }

    /// @inheritdoc IMoleculaPoolV2WithNativeToken
    function depositNativeToken(
        uint256 requestId,
        address token,
        address from,
        uint256 value
    ) external payable only(SUPPLY_MANAGER) returns (uint256 moleculaTokenAmount) {
        return _deposit(requestId, token, from, value);
    }

    function requestRedeem(
        uint256 /*requestId*/,
        address token,
        uint256 value // In mUSD.
    ) external only(SUPPLY_MANAGER) returns (uint256 tokenValue) {
        if (poolMap[token].tokenType == TokenType.None) {
            revert ETokenNotExist();
        }

        if (poolMap[token].tokenType == TokenType.ERC20) {
            // Convert the provided mUSD token value to the given token value (e.g. USDT).
            tokenValue = _normalize(-poolMap[token].n, value);
            // Must reduce the pool amount to correctly calculate `totalSupply` upon redemption.
            poolMap[token].valueToRedeem += tokenValue;
        } else {
            // Convert the provided mUSD token value to stable USD assets (e.g. USDe).
            uint256 assets = _normalize(-poolMap[token].n, value);
            // Convert stable USD assets (e.g. USDe) to the given token value (e.g. sUSDe).
            tokenValue = IERC4626(token).convertToShares(assets);
            // Must reduce the pool amount to correctly calculate `totalSupply` upon redemption.
            poolMap[token].valueToRedeem += tokenValue;
        }
    }

    /**
     * @dev Redeem tokens.
     * @param requestIds Request IDs.
     */
    function fulfillRedeemRequests(uint256[] calldata requestIds) external payable {
        if (isRedeemPaused) {
            revert ERedeemPaused();
        }

        if (requestIds.length == 0) {
            revert EEmptyArray();
        }
        // Call the Supply Manager's `redeem` method.
        // Receive the corresponding ERC20 token and total value redeemed.
        // Note: `value` is in the token amount (e.g. sUSDe).
        // slither-disable-next-line reentrancy-benign
        (address token, uint256 value) = ISupplyManagerV2(SUPPLY_MANAGER).fulfillRedeemRequests(
            address(this),
            requestIds
        );

        // Check whether the token is in `poolMap`.
        if (poolMap[token].tokenType == TokenType.None) {
            revert ETokenNotExist();
        }

        if (poolMap[token].isBlocked) {
            revert ETokenBlocked();
        }

        // Reduce the value to redeem for the correct `totalSupply` calculation.
        poolMap[token].valueToRedeem -= value;
    }

    function fulfillRedeemRequestsForNativeToken(uint256[] calldata requestIds) external {
        if (isRedeemPaused) {
            revert ERedeemPaused();
        }

        if (requestIds.length == 0) {
            revert EEmptyArray();
        }
        // Call the Supply Manager's `redeem` method.
        // Receive the corresponding ERC20 token and total value redeemed.
        // Note: `value` is in the token amount (e.g. sUSDe).
        // slither-disable-next-line reentrancy-benign
        (address token, uint256 value) = ISupplyManagerV2WithNative(SUPPLY_MANAGER)
            .fulfillRedeemRequestsForNativeToken(requestIds);

        // Check whether the token is in `poolMap`.
        if (poolMap[token].tokenType == TokenType.None) {
            revert ETokenNotExist();
        }

        if (poolMap[token].isBlocked) {
            revert ETokenBlocked();
        }

        // Reduce the value to redeem for the correct `totalSupply` calculation.
        poolMap[token].valueToRedeem -= value;
    }

    function grantNativeToken(address receiver, uint256 nativeTokenAmount) external {
        payable(receiver).sendValue(nativeTokenAmount);
    }

    /**
     * @dev Returns the list of the ERC20 pool.
     * @return result List of the ERC20 pool.
     */
    function getTokenPool() external view returns (TokenParams[] memory result) {
        return pool;
    }

    /**
     * @dev Add the target in the white list.
     * @param target Address.
     */
    function _addInWhiteList(address target) private checkNotZero(target) {
        if (isInWhiteList[target]) {
            revert EAlreadyAddedInWhiteList();
        }
        isInWhiteList[target] = true;
    }

    /**
     * @dev Add the target in the white list.
     * @param target Address.
     */
    function addInWhiteList(address target) external onlyOwner {
        _addInWhiteList(target);
        emit AddedInWhiteList(target);
    }

    /**
     * @dev Delete the target from the white list.
     * @param target Address.
     */
    function deleteFromWhiteList(address target) external onlyOwner checkNotZero(target) {
        if (!isInWhiteList[target]) {
            revert ENotPresentInWhiteList();
        }
        delete isInWhiteList[target];
        emit DeletedFromWhiteList(target);
    }

    /**
     * @dev Execute transactions on behalf of the whitelisted contract.
     * Allows the `approve` calls to tokens in `poolMap` and `poolMap` without whitelisting.
     * @param target Address.
     * @param data Encoded function data.
     * @return result Result of the function call.
     */
    function execute(
        address target,
        bytes calldata data
    ) external payable only(poolKeeper) returns (bytes memory result) {
        if (isExecutePaused) {
            revert EExecutePaused();
        }
        if (poolMap[target].isBlocked) {
            revert ETokenBlocked();
        }

        // Decode the function selector.
        bytes4 selector;
        // slither-disable-next-line assembly, solhint-disable-next-line no-inline-assembly
        assembly {
            selector := mload(data.offset)
        }

        // Allow approval calls for any ERC-20 token, but only to whitelisted spender contracts.
        if (selector == IERC20.approve.selector) {
            // Ensure that the value is zero.
            if (msg.value != 0) {
                revert EMsgValueIsNotZero();
            }

            // Decode `approve(spender, amount)` to get the spender address.
            address spender;
            // slither-disable-next-line assembly, solhint-disable-next-line no-inline-assembly
            assembly {
                spender := mload(add(data.offset, 4)) // skip: 4 bytes selector
            }

            // Ensure spender is whitelisted.
            if (!isInWhiteList[spender]) {
                revert ENotInWhiteList();
            }

            // Execute the function call.
            return target.functionCall(data);
        }

        // Otherwise, check the whitelist.
        if (!isInWhiteList[target]) {
            revert ENotInWhiteList();
        }

        // Execute the function call.
        return target.functionCallWithValue(data, msg.value);
    }

    /// @dev Change the guardian address.
    /// @param newGuardian New guardian address.
    function changeGuardian(address newGuardian) external onlyOwner checkNotZero(newGuardian) {
        guardian = newGuardian;
    }

    /// @dev Set new value for the `isExecutePaused` flag.
    /// @param newValue New value.
    function _setExecutePaused(bool newValue) private {
        if (isExecutePaused != newValue) {
            isExecutePaused = newValue;
            emit IsExecutePausedChanged(newValue);
        }
    }

    /// @dev Set new value for the `isRedeemPaused` flag.
    /// @param newValue New value.
    function _setRedeemPaused(bool newValue) private {
        if (isRedeemPaused != newValue) {
            isRedeemPaused = newValue;
            emit IsRedeemPausedChanged(newValue);
        }
    }

    /// @dev Pause the `execute` function.
    function pauseExecute() external onlyAuthForPause {
        _setExecutePaused(true);
    }

    /// @dev Unpause the `execute` function.
    function unpauseExecute() external onlyOwner {
        _setExecutePaused(false);
    }

    /// @dev Pause the `redeem` function.
    function pauseRedeem() external onlyAuthForPause {
        _setRedeemPaused(true);
    }

    /// @dev Unpause the `redeem` function.
    function unpauseRedeem() external onlyOwner {
        _setRedeemPaused(false);
    }

    /// @dev Pause the `execute` and `redeem` functions.
    function pauseAll() external onlyAuthForPause {
        _setExecutePaused(true);
        _setRedeemPaused(true);
    }

    /// @dev Unpause the `execute` and `redeem` functions.
    function unpauseAll() external onlyOwner {
        _setExecutePaused(false);
        _setRedeemPaused(false);
    }

    /// @dev Block & unblock the `execute` and `redeem` operations with the token from the pool.
    /// @param token Token address.
    /// @param isBlocked Boolean flag indicating whether the token is blocked.
    function setBlockToken(address token, bool isBlocked) external onlyOwner {
        TokenInfo storage tokenInfo = poolMap[token];
        if (tokenInfo.tokenType == TokenType.None) {
            revert ETokenNotExist();
        }

        if (tokenInfo.isBlocked != isBlocked) {
            tokenInfo.isBlocked = isBlocked;
            emit TokenBlockedChanged(token, isBlocked);
        }
    }

    function addTokenVault(address tokenVault) external {
        address asset = IERC7575(tokenVault).asset();
        if (asset != ConstantsCoreV2.NATIVE_TOKEN) {
            IERC20(asset).forceApprove(tokenVault, type(uint256).max);
        }
    }

    function removeTokenVault(address tokenVault) external {
        address asset = IERC7575(tokenVault).asset();
        if (asset != ConstantsCoreV2.NATIVE_TOKEN) {
            IERC20(asset).forceApprove(tokenVault, 0);
        }
    }
}
