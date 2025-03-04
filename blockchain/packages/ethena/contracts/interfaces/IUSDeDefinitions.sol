// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

interface IUSDeDefinitions {
  /// @notice This event is emitted when the minter changes.
  event MinterUpdated(address indexed newMinter, address indexed oldMinter);

  /// @notice Zero address is not allowed.
  error ZeroAddressException();
  /// @notice It is not possible to renounce the ownership.
  error CantRenounceOwnership();
  /// @notice Only the minter role can perform the action.
  error OnlyMinter();
}
