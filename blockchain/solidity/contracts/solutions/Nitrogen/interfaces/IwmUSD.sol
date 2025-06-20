// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {RebaseERC20} from "../../../common/rebase/RebaseERC20.sol";

interface IwmUSD {
    /// @dev Event emitted when the user wrapped their mUSD tokens.
    /// @param sender User address.
    /// @param value mUSD amount that user wrapped and one got the same amount of wmUSD amount.
    event Wrapped(address indexed sender, uint256 indexed value);

    /// @dev Event emitted when the user has unwrapped their mUSD tokens.
    /// @param sender User address.
    /// @param wmUSDAmount wmUSD amount to burn.
    /// @param mUSDAmount mUSD amount that user gets.
    event Unwrapped(
        address indexed sender,
        uint256 indexed wmUSDAmount,
        uint256 indexed mUSDAmount
    );

    /// @dev Event emitted when yield is distributed for user.
    /// @param user User address.
    /// @param shares Shares for the user.
    /// @param mUSDAmount mUSD amount.
    event YieldDistributed(
        address indexed user,
        uint256 indexed shares,
        uint256 indexed mUSDAmount
    );

    /// @dev Event emitted when authorized yield distributor is changed.
    /// @param oldAuthorizedYieldDistributor Previous authorized yield distributor.
    /// @param newAuthorizedYieldDistributor New authorized yield distributor.
    event AuthorizedYieldDistributorChanged(
        address indexed oldAuthorizedYieldDistributor,
        address indexed newAuthorizedYieldDistributor
    );

    /// @dev Throws an error if the Yield Distributor is not authorized.
    error ENotAuthorizedYieldDistributor();

    /// @dev Throws an error if shares for distributions are greater than the yield shares.
    error ETooManyShares();

    /// @dev Returns mUSD Rebase token's address.
    /// @return mUSD Rebase token's address.
    // solhint-disable-next-line func-name-mixedcase
    function MUSD() external returns (RebaseERC20);

    /// @dev Authorized yield distributor (e.g. the lmUSD token).
    /// @return Authorized yield distributor.
    function authorizedYieldDistributor() external returns (address);

    /// @dev Returns mUSD wrapped value.
    /// @return mUSD wrapped value.
    function mUSDWrappedValue() external returns (uint256);

    /// @dev Returns mUSD wrapped shares.
    /// @return mUSD wrapped shares.
    function mUSDWrappedShares() external returns (uint256);

    /// @dev Convert mUSD to wmUSD.
    /// @param value Token amount.
    function wrap(uint256 value) external;

    /// @dev Convert wmUSD to mUSD.
    /// @param value Token amount.
    function unwrap(uint256 value) external;

    /// @dev Convert wmUSD to mUSD.
    /// @param wmUSDAmount wmUSD amount.
    /// @return mUSDAmount mUSD amount.
    function convertTomUSD(uint256 wmUSDAmount) external view returns (uint256 mUSDAmount);

    /// @dev Returns the current yield in the token value.
    /// @return Current yield in the token value.
    function currentYield() external view returns (uint256);

    /// @dev Returns the current yield in shares.
    /// @return Current yield in shares.
    function currentYieldShares() external view returns (uint256);

    /// @dev Grant shares for the user.
    /// @param user User address.
    /// @param shares Shares for the user.
    function distributeYield(address user, uint256 shares) external;

    /// @dev Setter for the Authorized Yield Distributor address.
    /// @param newAuthorizedYieldDistributor New authorized Yield Distributor address.
    function setAuthorizedYieldDistributor(address newAuthorizedYieldDistributor) external;
}
