// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

/// @title ITokenVault.
/// @notice Interface for managing token vault operations.
/// @dev Defines core functions for deposit and redeem operations.
interface ITokenVault {
    // ============ Structs ============

    /// @dev Information about a deposit or redemption request.
    /// @param user User's address.
    /// @param assets Assets amount.
    /// @param shares Shares amount.
    struct RequestInfo {
        address user;
        uint256 assets;
        uint256 shares;
    }

    // ============ Events ============

    /// @dev Emitted when redemption requests are ready to be processed.
    /// @param requestIds Array of request IDs that have been fulfilled
    /// @param sumAssets Total sum of assets that were processed for all fulfilled requests
    event RedeemClaimable(uint256[] requestIds, uint256 sumAssets);

    // ============ Errors ============

    /// @dev Thrown when the deposit value is less than the minimum one.
    /// @param depositValue Minimum deposit value.
    error ETooLowDepositAssets(uint256 depositValue);

    /// @dev Thrown when the requested redemption shares exceed the maximum allowed.
    /// @param maxRedeemShares Maximum allowed redemption shares.
    error ETooManyRequestRedeemShares(uint256 maxRedeemShares);

    /// @dev Thrown when the redemption value is less than the minimum one.
    /// @param minRedeemShares Minimum redemption shares.
    error ETooLowRequestRedeemShares(uint256 minRedeemShares);

    /// @dev Thrown when an operation is called with invalid parameters.
    error EBadOperationParameters();

    /// @dev Thrown when the caller is not authorized.
    error ENotAuthorized();

    /// @dev Thrown when the token is already initialized.
    error EAlreadyInitialized();

    /// @dev Thrown when ERC-4626 function is not supported due to the ERC-7540 restrictions.
    error EAsyncRedeem();

    /// @dev Thrown when a function is not supported due to the ERC-7540 restrictions.
    error ENotSupported();

    /// @dev Thrown when the redemption amount exceeds the available assets' amount.
    /// @param claimableRedeemAssets Available assets for claiming.
    error ETooManyRedeemAssets(uint256 claimableRedeemAssets);

    /// @dev Emitted when trying set `minDepositAssets` to zero.
    error EZeroMinDepositAssets();

    /// @dev Emitted when trying set `minRedeemShares` to zero.
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
    /// @dev The function is a part of neither ERC-7540 nor ERC-4626 standards.
    ///      It extends contract's withdrawal functionality by allowing to request assets.
    function requestWithdraw(
        uint256 assets,
        address controller,
        address owner
    ) external returns (uint256 requestId);
}
