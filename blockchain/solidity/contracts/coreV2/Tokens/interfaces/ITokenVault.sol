// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

/// @title ITokenVault.
/// @notice Interface for managing token vault operations.
/// @dev Defines core functions for deposit and redeem operations.
interface IBaseTokenVault {
    // ============ Structs ============

    /// @dev Stores the redemption information for a specific controller.
    /// @param pendingRedeemShares Total amount of shares pending redemption for this controller.
    /// @param claimableRedeemAssets Total amount of assets available to be claimed for this controller.
    struct RedeemInfo {
        uint256 pendingRedeemShares;
        uint256 claimableRedeemAssets;
    }

    // ============ Events ============

    /// @dev Emitted when redemption requests are ready to be processed.
    /// @param requestIds Array of request IDs that have been fulfilled.
    /// @param sumAssets Total sum of assets that have been processed for all fulfilled requests.
    event RedeemClaimable(uint256[] requestIds, uint256 sumAssets);

    // ============ Errors ============

    /// @dev Error thrown when the deposit value is less than the minimum one.
    /// @param depositValue Minimum deposit value.
    error ETooLowDepositAssets(uint256 depositValue);

    /// @dev Error thrown when the requested redemption shares exceed the maximum allowed.
    /// @param maxRedeemShares Maximum allowed redemption shares.
    error ETooManyRequestRedeemShares(uint256 maxRedeemShares);

    /// @dev Error thrown when the redemption value is less than the minimum one.
    /// @param minRedeemShares Minimum redemption shares.
    error ETooLowRequestRedeemShares(uint256 minRedeemShares);

    /// @dev Error thrown when an operation is called with invalid parameters.
    error EBadOperationParameters();

    /// @dev Error thrown when the caller is not authorized.
    error ENotAuthorized();

    /// @dev Error thrown when the token is already initialized.
    error EAlreadyInitialized();

    /// @dev Error thrown when the ERC-4626 function is not supported due to the ERC-7540 restrictions.
    error EAsyncRedeem();

    /// @dev Error thrown when a function is not supported due to the ERC-7540 restrictions.
    error ENotSupported();

    /// @dev Error thrown when the redemption amount exceeds the available assets' amount.
    /// @param claimableRedeemAssets Available assets for claiming.
    error ETooManyRedeemAssets(uint256 claimableRedeemAssets);

    /// @dev Error emitted when trying set `minDepositAssets` to zero.
    error EZeroMinDepositAssets();

    /// @dev Error emitted when trying set `minRedeemShares` to zero.
    error EZeroMinRedeemShares();

    // ============ Core Functions ============

    /// @dev Initializes the token Vault with specified parameters.
    /// @param asset_ Asset token address.
    /// @param minDepositAssets_ Minimum deposit amount.
    /// @param minRedeemShares_ Minimum redemption shares.
    function init(address asset_, uint128 minDepositAssets_, uint128 minRedeemShares_) external;

    /// @dev Sets the minimum deposit assets' amount.
    /// @param minDepositAssets_ New minimum deposit amount.
    function setMinDepositAssets(uint128 minDepositAssets_) external;

    /// @dev Sets the minimum redemption shares' amount.
    /// @param minRedeemShares_ New minimum redemption shares.
    function setMinRedeemShares(uint128 minRedeemShares_) external;

    /// @dev Requests an asynchronous redemption.
    /// @param assets Amount of assets to be redeemed.
    /// @param controller Request's controller.
    /// @param owner Source of the shares.
    /// @return requestId Created request's ID.
    /// @dev Function is not a part of the ERC-7540 or ERC-4626 standards.
    ///      It extends the contract's withdrawal functionality by allowing to request assets.
    function requestWithdraw(
        uint256 assets,
        address controller,
        address owner
    ) external returns (uint256 requestId);

    // ============ View Functions ============

    /// @dev Returns the total amount of pending redeem shares for a controller.
    /// @param controller Controller's address to check.
    /// @return shares Amount of shares pending redemption.
    function pendingRedeemShares(address controller) external view returns (uint256 shares);

    /// @dev Returns the total amount of claimable redeem assets for a controller.
    /// @param controller Controller's address to check.
    /// @return assets Amount of assets available to be claimed.
    function claimableRedeemAssets(address controller) external view returns (uint256 assets);
}

/// @title IERC20TokenVault.
/// @dev Interface for fulfilling redeem requests in the ERC-20 token Vault.
interface IERC20TokenVault {
    /// @dev Fulfills redemption requests for the specified request IDs.
    /// @param assetOwner Source of assets.
    /// @param requestIds Array of redemption request IDs.
    /// @param sumAssets Total assets being transferred.
    /// @dev If `requestId[i]` is zero, its value should be skipped from being processed.
    ///      This might happen when someone satisfies the redemption request in the same block.
    function fulfillRedeemRequests(
        address assetOwner,
        uint256[] calldata requestIds,
        uint256 sumAssets
    ) external;
}

/// @title INativeTokenVault.
/// @dev Interface for managing the native token Vault operations.
interface INativeTokenVault {
    /// @dev Error thrown when the native token address is not equal to the actual native token address.
    error EWrongNativeAddress();

    /// @dev Fulfills redemption requests for the specified request IDs.
    /// @param requestIds Array of redemption request IDs.
    /// @param sumAssets Total assets being transferred.
    /// @dev If `requestId[i]` is zero, its value should be skipped from being processed.
    ///      This might happen when someone satisfies the redemption request in the same block.
    function fulfillRedeemRequests(uint256[] calldata requestIds, uint256 sumAssets) external;
}
