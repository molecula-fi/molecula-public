// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;
import {IDelegationManager, IStrategy} from "./external/interfaces/IDelegationManager.sol";
import {IStrategyFactory} from "./external/interfaces/IStrategyFactory.sol";
import {IDepositManagerTypes} from "./interfaces/IDepositManagerTypes.sol";

/// @title Deposit Manager Storage.
/// @notice Storage of Deposit Manager contract.
contract DepositManagerStorage is IDepositManagerTypes {
    /// @dev Constant for percentage decimals using for calculations around the pool portions.
    uint256 public constant PERCENTAGE_FACTOR = 10_000;

    /// @dev Supply Manager contract's address.
    address public immutable SUPPLY_MANAGER;

    /// @dev WETH Token's address.
    address public immutable WETH;

    /// @dev EigenLayer restake contract's address.
    IDelegationManager public immutable DELEGATION_MANAGER;

    /// @dev EigenLayer strategy factory contract's address.
    IStrategyFactory public immutable STRATEGY_FACTORY;

    /// @dev Authorized Staker and Restaker in EigenLayer.
    address public authorizedStaker;

    /// @dev Buffer percentage parameter, where
    /// (TVL ETH * bufferPercentage / PERCENTAGE_FACTOR) * is the amount of ETH token staked in pools dedicated for buffer needs.
    uint32 public bufferPercentage;

    /// @dev Initialization indicator.
    bool public initialized;

    /// @dev Boolean flag indicating whether the `stake` and `delegate` functions is paused.
    bool public isStakePaused;

    /// @dev Array of pools contracts.
    address[] public poolsArray;

    /// @dev Mapping of pool data.
    mapping(address => PoolData) public poolData;

    /// @dev Mapping of EigenLayer strategies which are not stored into STRATEGY_FACTORY.
    mapping(address => IStrategy) public strategies;
}
