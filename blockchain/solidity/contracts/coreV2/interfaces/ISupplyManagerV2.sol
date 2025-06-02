// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title ISupplyManagerV2.
/// @notice Interface for managing Pool data and Requests.
/// @dev Defines core functions for supply management and yield distribution.
interface ISupplyManagerV2 {
    // ============ Enums ============

    /// @dev Operation status.
    /// @param None No redemption request exists.
    /// @param Pending The redemption request is waiting to be fulfilled.
    /// @param Claimable The redemption request has been fulfilled and can be claimed.
    enum RequestState {
        None,
        Pending,
        Claimable
    }

    // ============ Structs ============

    /// @dev Information about a redeem operation.
    /// @param tokenVault `TokenVault` address associated with the operation.
    /// @param state Current state of the operation (None, Pending, Claimable).
    /// @param controller Address of the controller associated with the request.
    /// @param assets Amount of assets to be redeemed.
    /// @param shares Amount of shares to be burned.
    struct RedeemRequestInfo {
        address tokenVault;
        RequestState state;
        address controller;
        uint256 assets;
        uint256 shares;
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
    /// @param assets Deposited amount.
    /// @param shares Shares amount to mint.
    event Deposit(
        uint256 indexed requestId,
        address indexed tokenVault,
        uint256 indexed assets,
        uint256 shares
    );

    /// @dev Emitted when a user processes a redemption.
    /// @param requestId Redemption operation's ID.
    /// @param tokenVault `TokenVault` address.
    /// @param value Redeemed value.
    /// @param shares Redeemed shares.
    event RedeemRequest(
        uint256 indexed requestId,
        address indexed tokenVault,
        uint256 indexed shares,
        uint256 value
    );

    /// @dev Emitted when redemption requests have been fulfilled and become claimable. This event indicates
    ///      that the requested redemptions are ready to be claimed by their respective owners.
    /// @param requestIds Array of request IDs that have been fulfilled
    /// @param sumAssets Total sum of assets that were processed for all fulfilled requests
    event FulfillRedeemRequests(uint256[] requestIds, uint256 sumAssets);

    /// @dev Emitted when yield is distributed to parties in the Pool.
    /// @param distributedShares The total amount of shares that were distributed as yield.
    event YieldDistributed(uint256 indexed distributedShares);

    // ============ Errors ============

    /// @dev Thrown when no shares are available.
    error ENoShares();

    /// @dev Thrown when the share price is too low for the redemption.
    error ETooLowSharePrice();

    /// @dev Thrown when the share price is too high for the redemption.
    error ETooHighSharePrice();

    /// @dev Thrown when the caller is not an authorized `tokenVault`.
    error ENotMyAgent();

    /// @dev Thrown when the caller is not authorized.
    error ENotAuthorized();

    /// @dev Thrown when the wrong `TokenVault` is used.
    error EWrongTokenVault();

    /// @dev Thrown when there are no pending redemption requests to process.
    error ENoPendingRequests();

    /// @dev Thrown when the Request is unknown (in None status).
    error EUnknownRequest();

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
    /// @param assets Deposit assets.
    /// @return shares Amount to mint.
    function deposit(
        address token,
        uint256 requestId,
        uint256 assets
    ) external returns (uint256 shares);

    /// @dev Requests a redemption operation from the Pool. Creates a new redemption request
    ///      that will be processed in the future.
    /// @param token The ERC20 token address for which redemption is requested
    /// @param controller The address of the controller managing this redemption request
    /// @param requestId Unique identifier for the redemption request
    /// @param shares Amount of shares to be redeemed from the Pool
    /// @return assets The estimated amount of assets to be received after redemption
    function requestRedeem(
        address token,
        address controller,
        uint256 requestId,
        uint256 shares
    ) external returns (uint256 assets);

    /// @dev Redeems the funds.
    /// @param assetOwner Address to redeem from.
    /// @param requestIds Redeem operations' IDs.
    /// @return asset Token ERC20 address.
    /// @return redeemedAssets Redeemed assets.
    function fulfillRedeemRequests(
        address assetOwner,
        uint256[] calldata requestIds
    ) external returns (address asset, uint256 redeemedAssets);

    // ============ Admin Functions ============

    /// @dev Called when a token vault is added.
    /// @param tokenVault Address of the added token vault.
    function onAddTokenVault(address tokenVault) external;

    /// @dev Called when a token vault is removed.
    /// @param tokenVault Address of the removed token vault.
    function onRemoveTokenVault(address tokenVault) external;

    /**
     * @dev Distributes yield.
     * @param parties List of parties.
     * @param newApyFormatter New APY formatter.
     */
    function distributeYield(Party[] calldata parties, uint16 newApyFormatter) external;

    /**
     * @dev Setter for the Yield Distributor address.
     * @param newYieldDistributor New Yield Distributor address.
     */
    function setYieldDistributor(address newYieldDistributor) external;

    // ============ View Functions ============

    /// @dev Returns information about a specific redeem request.
    /// @param requestID ID of the redeem request to query.
    /// @return tokenVault Address of the token vault associated with the request.
    /// @return status Current state of the request (None, Pending, or Claimable).
    /// @return controller Address of the controller associated with the request.
    /// @return assets Amount of assets to be redeemed.
    /// @return shares Amount of shares to be burned.
    function redeemRequests(
        uint256 requestID
    )
        external
        view
        returns (
            address tokenVault,
            RequestState status,
            address controller,
            uint256 assets,
            uint256 shares
        );

    /// @dev Returns the Molecula Pool address.
    /// @return pool Molecula Pool address.
    function getMoleculaPool() external view returns (address pool);

    /// @dev Returns the total supply of the Pool (TVL).
    /// @return res Total Pool supply.
    function totalSupply() external view returns (uint256 res);

    /// @dev Returns shares supply.
    /// @return res Shares supply.
    function totalSharesSupply() external view returns (uint256 res);
}
