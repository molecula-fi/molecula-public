// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev User's cooldown information.
/// @param cooldownEnd Timestamp when the cooldown is ended.
/// @param underlyingAmount Amount of frozen tokens.
struct UserCooldown {
    uint104 cooldownEnd;
    uint152 underlyingAmount;
}

/// @dev Interface for
/// https://github.com/ethena-labs/bbp-public-assets/blob/main/contracts/contracts/StakedUSDeV2.sol
abstract contract IStakedUSDeV2 is IERC20 {
    /// @dev cooldownDuration Cooldown duration.
    uint24 public cooldownDuration;

    /// @dev Amount of the last asset distribution from the controller contract
    /// into this contract and any unvested remainder at that time.
    uint256 public vestingAmount;

    /// @dev cooldowns Mapping of cooldowns.
    mapping(address user => UserCooldown) public cooldowns;

    /// @dev Redeems shares into assets and starts the cooldown to claim the converted asset.
    /// @param shares Shares to redeem.
    /// @return assets Assets to redeem.
    function cooldownShares(uint256 shares) external virtual returns (uint256 assets);

    /// @notice Claim the staking amount after the cooldown has finished.
    /// The address can only retire the full amount of assets.
    /// @dev The `unstake` function can be called after the cooldown has been set to 0.
    /// It allows the accounts claim the remaining assets locked at Silo.
    /// @param receiver Address to send the assets via the staker.
    function unstake(address receiver) external virtual;

    /**
     * @dev Returns the amount of USDe tokens that are unvested in the contract.
     * @return value Uninvested tokens.
     */
    function getUnvestedAmount() external view virtual returns (uint256 value);

    /**
     * @dev Returns the amount of USDe tokens that are vested in the contract.
     * @return value Total amount.
     */
    function totalAssets() external view virtual returns (uint256 value);
}
