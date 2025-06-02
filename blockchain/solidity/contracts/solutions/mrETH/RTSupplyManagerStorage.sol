// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;
import {IEigenPodManager} from "./external/interfaces/IEigenPodManager.sol";
import {IRTSupplyManagerTypes} from "./interfaces/IRTSupplyManagerTypes.sol";

/// @title Restaking Supply Manager Storage.
/// @notice Storage of Restaking Supply Manager contract.
contract RTSupplyManagerStorage is IRTSupplyManagerTypes {
    /// @dev Rebase token contract's address.
    // solhint-disable-next-line var-name-mixedcase
    address public immutable REBASE_TOKEN;

    /// @dev Authorized Yield Distributor.
    address public authorizedYieldDistributor;

    /// @dev Authorized Staker and Restaker in EigenLayer.
    address public authorizedStaker;

    /// @dev Account's address that can pause the `deposit` and `redeem` functions.
    address public guardian;

    /// @dev WETH Token's address.
    // solhint-disable-next-line var-name-mixedcase
    address public immutable WETH; // TODO: remove so you can read it from EIP7575's Share vaults,
    // i.e. REBASE_TOKEN.vaults.

    /// @dev EigenLayer stake contract's address.
    // solhint-disable-next-line var-name-mixedcase
    IEigenPodManager public immutable EIGEN_POD_MANAGER;

    /// @dev Total staking shares supply.
    uint256 public totalSharesSupply;

    /// @dev Total staking supply.
    uint256 public totalDepositedSupply;

    /// @dev Protocol-locked yield in shares, which are to be distributed later.
    uint256 public lockedYieldShares;

    /// @dev APY formatter parameter, where
    /// (apyFormatter / PERCENTAGE_FACTOR) * 100% is the percentage of revenue retained by all mUSD holder.
    uint128 public apyFormatter;

    /// @dev Buffer percentage parameter, where
    /// (TVL ETH * bufferPercentage / PERCENTAGE_FACTOR) * is the amount of ETH token staked in pools.
    uint128 public bufferPercentage;

    /// @dev Constant for percentage decimals using for `apy` and `poolPortion`.
    uint128 public constant PERCENTAGE_FACTOR = 10_000;

    /// @dev Constant for percentage decimals using for yield distribution.
    uint128 public constant FULL_PORTION = 1e18;

    /// @dev Initialization indicator.
    bool public initialized;

    /// @dev Boolean flag indicating whether the `deposit` functions is paused.
    bool public isDepositPaused;

    /// @dev Boolean flag indicating whether the `redeem` functions is paused.
    bool public isRedeemPaused;

    /// @dev Mapping of redemptions.
    mapping(uint256 => RedeemOperationInfo) public redeemRequests;

    /// @dev Mapping of pool data.
    mapping(address => PoolData) public poolData;

    /// @dev Array of pools contracts
    address[] public poolsArray;
}
