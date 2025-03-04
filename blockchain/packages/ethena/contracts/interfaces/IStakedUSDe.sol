// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

interface IStakedUSDe {
  // Events //
  /// @notice Event emitted when the rewards are received.
  event RewardsReceived(uint256 amount);
  /// @notice Event emitted when the balance from a `FULL_RESTRICTED_STAKER_ROLE` user is redistributed.
  event LockedAmountRedistributed(address indexed from, address indexed to, uint256 amount);

  // Errors //
  /// @notice Error emitted shares or assets equal zero.
  error InvalidAmount();
  /// @notice Error emitted when the owner attempts to rescue USDe tokens.
  error InvalidToken();
  /// @notice Error emitted when a small non-zero share amount remains, which risks donations attack.
  error MinSharesViolation();
  /// @notice Error emitted when the owner is not allowed to perform an operation.
  error OperationNotAllowed();
  /// @notice Error emitted when there is still an unvested amount.
  error StillVesting();
  /// @notice Error emitted when the owner or the blacklisted manager attempts to blacklist the owner.
  error CantBlacklistOwner();
  /// @notice Error emitted when the zero address is given.
  error InvalidZeroAddress();

  function transferInRewards(uint256 amount) external;

  function rescueTokens(address token, uint256 amount, address to) external;

  function getUnvestedAmount() external view returns (uint256);
}
