// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

/* solhint-disable var-name-mixedcase */

import "./StakedUSDe.sol";
import "./interfaces/IStakedUSDeCooldown.sol";
import "./USDeSilo.sol";

/**
 * @title StakedUSDeV2
 * @notice StakedUSDeV2 contract allows users to:
 * - Stake USDe tokens.
 * - Earn a portion of:
 *   - The protocol LST.
 *   - The erpetual yield allocated to stakers by the Ethena DAO governance voted yield distribution algorithm.
 * The algorithm seeks to balance the stability of the protocol by:
 * - Funding the protocol's insurance fund and DAO activities.
 * - Rewarding stakers with a portion of the protocol's yield.
 * @dev If the cooldown duration is set to zero, the StakedUSDeV2 behavior changes to follow ERC4626
 *      standard and disables cooldownShares and cooldownAssets methods. If cooldown duration is 
 *      greater than zero, the ERC4626 withdrawal and redeem functions are disabled, breaking
 *      the ERC4626 standard, and enabling the cooldownShares and the cooldownAssets functions.
 */
contract StakedUSDeV2 is IStakedUSDeCooldown, StakedUSDe {
  using SafeERC20 for IERC20;

  mapping(address => UserCooldown) public cooldowns;

  USDeSilo public immutable silo;

  uint24 public constant MAX_COOLDOWN_DURATION = 90 days;

  uint24 public cooldownDuration;

  /// @notice Ensure `cooldownDuration` is zero.
  modifier ensureCooldownOff() {
    if (cooldownDuration != 0) revert OperationNotAllowed();
    _;
  }

  /// @notice Ensure `cooldownDuration` is greater than zero.
  modifier ensureCooldownOn() {
    if (cooldownDuration == 0) revert OperationNotAllowed();
    _;
  }

  /// @notice Constructor for the StakedUSDeV2 contract.
  /// @param _asset USDe token's address.
  /// @param initialRewarder Initial rewarder's address.
  /// @param _owner Admin role's address.
  constructor(IERC20 _asset, address initialRewarder, address _owner) StakedUSDe(_asset, initialRewarder, _owner) {
    silo = new USDeSilo(address(this), address(_asset));
    cooldownDuration = MAX_COOLDOWN_DURATION;
  }

  /* ------------- EXTERNAL ------------- */

  /**
   * @dev See {IERC4626-withdraw}.
   */
  function withdraw(uint256 assets, address receiver, address _owner)
    public
    virtual
    override
    ensureCooldownOff
    returns (uint256)
  {
    return super.withdraw(assets, receiver, _owner);
  }

  /**
   * @dev See {IERC4626-redeem}.
   */
  function redeem(uint256 shares, address receiver, address _owner)
    public
    virtual
    override
    ensureCooldownOff
    returns (uint256)
  {
    return super.redeem(shares, receiver, _owner);
  }

  /// @notice Claim the staking amount after the cooldown has finished. The address can only retire the full amount of assets.
  /// @dev `Unstake` can be called after the cooldown has been set to 0 to let accounts claim the remaining assets locked at Silo.
  /// @param receiver Address to send the assets by the staker.
  function unstake(address receiver) external {
    UserCooldown storage userCooldown = cooldowns[msg.sender];
    uint256 assets = userCooldown.underlyingAmount;

    if (block.timestamp >= userCooldown.cooldownEnd || cooldownDuration == 0) {
      userCooldown.cooldownEnd = 0;
      userCooldown.underlyingAmount = 0;

      silo.withdraw(receiver, assets);
    } else {
      revert InvalidCooldown();
    }
  }

  /// @notice Redeem assets and start the cooldown to claim the converted underlying asset.
  /// @param assets Assets to redeem.
  function cooldownAssets(uint256 assets) external ensureCooldownOn returns (uint256 shares) {
    if (assets > maxWithdraw(msg.sender)) revert ExcessiveWithdrawAmount();

    shares = previewWithdraw(assets);

    cooldowns[msg.sender].cooldownEnd = uint104(block.timestamp) + cooldownDuration;
    cooldowns[msg.sender].underlyingAmount += uint152(assets);

    _withdraw(msg.sender, address(silo), msg.sender, assets, shares);
  }

  /// @notice Redeem shares into assets and start the cooldown to claim the converted underlying asset.
  /// @param shares Shares to redeem.
  function cooldownShares(uint256 shares) external ensureCooldownOn returns (uint256 assets) {
    if (shares > maxRedeem(msg.sender)) revert ExcessiveRedeemAmount();

    assets = previewRedeem(shares);

    cooldowns[msg.sender].cooldownEnd = uint104(block.timestamp) + cooldownDuration;
    cooldowns[msg.sender].underlyingAmount += uint152(assets);

    _withdraw(msg.sender, address(silo), msg.sender, assets, shares);
  }

  /// @notice Set the cooldown duration.
  // If the cooldown duration is set to zero, the `StakedUSDeV2` behavior:
  // - Changes to follow the `ERC4626` standard.
  // - Disables the `cooldownShares` and `cooldownAssets` methods. 
  // If the cooldown duration is greater than zero:
  // - The `ERC4626` withdrawal and redeem functions are disabled:
  //   - Breaking the `ERC4626` standard.
  //   - Enabling the `cooldownShares` and the `cooldownAssets` functions.
  /// @param duration Cooldown duration.
  function setCooldownDuration(uint24 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (duration > MAX_COOLDOWN_DURATION) {
      revert InvalidCooldown();
    }

    uint24 previousDuration = cooldownDuration;
    cooldownDuration = duration;
    emit CooldownDurationUpdated(previousDuration, cooldownDuration);
  }
}
