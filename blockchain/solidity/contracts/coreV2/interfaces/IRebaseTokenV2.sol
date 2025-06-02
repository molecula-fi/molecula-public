// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/// @title IRebaseTokenV2 Interface.
/// @notice Interface for rebase token V2 functionality.
interface IRebaseTokenV2 {
    /// @dev Sets the oracle address for the rebase token.
    /// @param oracleAddress The address of the oracle contract.
    function setOracle(address oracleAddress) external;
}
