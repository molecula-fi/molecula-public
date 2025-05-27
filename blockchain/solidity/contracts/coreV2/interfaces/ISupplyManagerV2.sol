// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title ISupplyManagerV2.
/// @notice Interface for managing Pool data and operations.
/// @dev Defines core functions for supply management and yield distribution.
interface ISupplyManagerV2 {
    // ============ Enums ============

    /// @dev Operation status.
    enum OperationStatus {
        None,
        Pending,
        Confirmed
    }

    // ============ Structs ============

    /// @dev Information about a redeem operation.
    /// @param tokenVault `TokenVault` address associated with the operation.
    /// @param value Redemption operation-associated value.
    /// @param status Operation status.
    struct RedeemOperationInfo {
        address tokenVault;
        uint256 value;
        OperationStatus status;
    }

    /// @dev Information about a party's yield distribution.
    /// @param user User's address.
    /// @param portion Yield portion.
    struct Party {
        address user;
        uint256 portion;
    }

    // ============ Events ============

    /// @dev Emitted when processing deposits.
    /// @param requestId Deposit operation's ID.
    /// @param tokenVault `TokenVault` address.
    /// @param value Deposited amount.
    /// @param shares Shares amount to mint.
    event Deposit(uint256 requestId, address tokenVault, uint256 value, uint256 shares);

    /// @dev Emitted when a user processes a redemption.
    /// @param requestId Redemption operation's ID.
    /// @param tokenVault `TokenVault` address.
    /// @param value Redeemed value.
    /// @param shares Redeemed shares.
    event RedeemRequest(
        uint256 indexed requestId,
        address tokenVault,
        uint256 shares,
        uint256 value
    );

    /// @dev Emitted when redemption requests become claimable.
    /// @param requestIds Array of the request IDs.
    /// @param values Array of the corresponding values.
    event FulfillRedeemRequests(uint256[] requestIds, uint256[] values);

    /// @dev Emitted when distributing yield.
    event DistributeYield();

    // ============ Errors ============

    /// @dev Thrown when no shares are available.
    error ENoShares();

    /// @dev Thrown when the share price is too low for the redemption.
    error ETooLowSharePrice();

    /// @dev Thrown when the share price is too high for the redemption.
    error ETooHighSharePrice();

    /// @dev Thrown when the caller is not an authorized `tokenVault`.
    error ENotMyAgent();

    /// @dev Thrown when the Pool total supply equals zero.
    error EZeroTotalSupply();

    /// @dev Thrown when the caller is not authorized.
    error ENotAuthorized();

    /// @dev Thrown when the wrong `TokenVault` is used.
    error EWrongTokenVault();

    /// @dev Thrown when the operation status is incorrect.
    error EBadOperationStatus();

    /// @dev Thrown when the sum of portions is not equal to `1`.
    error EWrongPortion();

    /// @dev Thrown when the `TokenVault` already exists in the parties' list.
    error EDuplicateTokenVault();

    /// @dev Thrown when the parties' list is empty.
    error EEmptyParties();

    /// @dev Thrown when the APY is invalid.
    error EInvalidAPY();

    /// @dev Thrown when the yield amount is negative.
    error ENoRealYield();

    // ============ Core Functions ============

    /// @dev Processes a deposit into the Pool.
    /// @param token Deposited token ERC20 address.
    /// @param requestId Deposit operation's ID.
    /// @param value Deposit value.
    /// @return shares Amount to mint.
    function deposit(
        address token,
        uint256 requestId,
        uint256 value
    ) external returns (uint256 shares);

    /// @dev Requests a redemption operation.
    /// @param token Token ERC20 address.
    /// @param requestId Redeem operation's ID.
    /// @param shares Shares to redeem.
    /// @return value Value to redeem.
    function requestRedeem(
        address token,
        uint256 requestId,
        uint256 shares
    ) external returns (uint256 value);

    /// @dev Redeems the funds.
    /// @param fromAddress Address to redeem from.
    /// @param requestIds Redeem operations' IDs.
    /// @return token Token ERC20 address.
    /// @return redeemedValue Redeemed value.
    function fulfillRedeemRequests(
        address fromAddress,
        uint256[] memory requestIds
    ) external returns (address token, uint256 redeemedValue);

    // ============ View Functions ============

    /// @dev Returns the Molecula Pool address.
    /// @return pool Molecula Pool address.
    function getMoleculaPool() external view returns (address pool);

    /// @dev Returns the total supply of the Pool (TVL).
    /// @return res Total Pool supply.
    function totalSupply() external view returns (uint256 res);

    /// @dev Returns shares supply.
    /// @return res Shares supply.
    function totalSharesSupply() external view returns (uint256 res);

    // ============ Admin Functions ============

    /// @dev Called when a token vault is added.
    /// @param tokenVault Address of the added token vault.
    function onAddTokenVault(address tokenVault) external;

    /// @dev Called when a token vault is removed.
    /// @param tokenVault Address of the removed token vault.
    function onRemoveTokenVault(address tokenVault) external;
}
