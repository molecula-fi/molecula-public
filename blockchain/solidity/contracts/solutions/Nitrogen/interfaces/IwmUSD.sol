// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {RebaseERC20} from "../../../common/rebase/RebaseERC20.sol";

interface IwmUSD {
    /// @dev MUSD Rebase token address.
    // solhint-disable-next-line func-name-mixedcase
    function MUSD() external returns (RebaseERC20);

    /// @dev Authorized yield distributor (e.g. lmUSD token).
    function authorizedYieldDistributor() external returns (address);

    /// @dev mUSD wrapped value.
    function mUSDWrappedValue() external returns (uint256);

    /// @dev mUSD wrapped shares.
    function mUSDWrappedShares() external returns (uint256);

    /// @dev Throws an error if the Yield Distributor is not authorized.
    error ENotAuthorizedYieldDistributor();

    /// @dev Throws an error if shares for distributions are greater than the yield shares.
    error ETooManyShares();

    /// @dev Event emitted when the user wrapped their mUSD tokens.
    /// @param sender User address.
    /// @param value mUSD amount that user wrapped and one got the same amount of wmUSD amount.
    event Wrapped(address sender, uint256 value);

    /// @dev Event emitted when the user has unwrapped their mUSD tokens.
    /// @param sender User address.
    /// @param wmUSDAmount wmUSD amount to burn.
    /// @param mUSDAmount mUSD amount that user gets.
    event Unwrapped(address sender, uint256 wmUSDAmount, uint256 mUSDAmount);

    /// @dev Event emitted when yield is distributed for user.
    /// @param user User address.
    /// @param shares Shares for the user.
    /// @param mUSDAmount mUSD amount.
    event YieldDistributed(address user, uint256 shares, uint256 mUSDAmount);

    /// @dev Event emitted when authorized yield distributor is changed.
    /// @param oldAuthorizedYieldDistributor Previous authorized yield distributor.
    /// @param newAuthorizedYieldDistributor New authorized yield distributor.
    event AuthorizedYieldDistributorChanged(
        address oldAuthorizedYieldDistributor,
        address newAuthorizedYieldDistributor
    );

    /// @dev Convert mUSD to wmUSD.
    /// @param value Token amount.
    function wrap(uint256 value) external;

    /// @dev Convert wmUSD to mUSD.
    /// @param value Token amount.
    function unwrap(uint256 value) external;

    /// @dev Convert wmUSD to mUSD.
    /// @param wmUSDAmount wmUSD amount.
    /// @param mUSDAmount mUSD amount.
    function convertTomUSD(uint256 wmUSDAmount) external view returns (uint256 mUSDAmount);

    /// @dev Return the current yield in the token value.
    /// @return Current yield in the token value.
    function currentYield() external view returns (uint256);

    /// @dev Return the current yield in shares.
    /// @return Current yield in shares.
    function currentYieldShares() external view returns (uint256);

    /// @dev Grand shares for the user.
    /// @param user User address.
    /// @param shares Shares for the user.
    function distributeYield(address user, uint256 shares) external;

    /// @dev Setter for the Authorized Yield Distributor address.
    /// @param newAuthorizedYieldDistributor New authorized Yield Distributor address.
    function setAuthorizedYieldDistributor(address newAuthorizedYieldDistributor) external;
}
