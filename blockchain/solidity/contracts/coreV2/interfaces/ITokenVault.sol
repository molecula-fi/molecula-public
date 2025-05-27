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
    /// @param requestIds Array of request IDs.
    /// @param values Array of corresponding values.
    event RedeemClaimable(uint256[] requestIds, uint256[] values);

    // ============ Errors ============

    /// @dev Thrown when the deposit value is less than the minimum one.
    /// @param depositValue Minimum deposit value.
    error ETooLowDepositValue(uint256 depositValue);

    /// @dev Thrown when the redemption value is less than the minimum one.
    /// @param redeemValue Minimum redemption value.
    error ETooLowRedeemValue(uint256 redeemValue);

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
    error ETooManyAssets(uint256 claimableRedeemAssets);

    // ============ Core Functions ============

    /// @dev Initializes the token Vault with specified parameters.
    /// @param asset_ Asset token address.
    /// @param minDepositAssets_ Minimum deposit amount.
    /// @param minRedeemShares_ Minimum redemption shares.
    function init(address asset_, uint256 minDepositAssets_, uint256 minRedeemShares_) external;

    /// @dev Sets the minimum deposit assets' amount.
    /// @param minDepositAssets_ New minimum deposit amount.
    function setMinDepositAssets(uint256 minDepositAssets_) external;

    /// @dev Sets the minimum redemption shares' amount.
    /// @param minRedeemShares_ New minimum redemption shares.
    function setMinRedeemShares(uint256 minRedeemShares_) external;

    // ============ Admin Functions ============

    /// @dev Pauses the `requestDeposit` function and other enter functions.
    function pauseRequestDeposit() external;

    /// @dev Unpauses the `requestDeposit` function.
    function unpauseRequestDeposit() external;

    /// @dev Pauses the `requestRedeem` function.
    function pauseRequestRedeem() external;

    /// @dev Unpauses the `requestRedeem` function.
    function unpauseRequestRedeem() external;

    /// @dev Pauses both `requestDeposit` and `requestRedeem` functions.
    function pauseAll() external;

    /// @dev Unpauses both `requestDeposit` and `requestRedeem` functions.
    function unpauseAll() external;
}
