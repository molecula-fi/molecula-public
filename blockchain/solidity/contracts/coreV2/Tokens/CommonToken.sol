// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {ValueValidator} from "./../../common/ValueValidator.sol";
import {IOracleV2} from "./../interfaces/IOracleV2.sol";
import {ISupplyManagerV2} from "./../interfaces/ISupplyManagerV2.sol";
import {IShareAssetConverter} from "./interfaces/IShareAssetConverter.sol";
import {VaultContainer} from "./VaultContainer.sol";

/// @title CommonToken
/// @notice Abstract contract that extends VaultContainer to manage token vaults with supply management capabilities.
///         The contract contains common code for Rebase and Reward Bearing tokens.
/// @dev Provides authorization control and supply management integration for token vaults
abstract contract CommonToken is IShareAssetConverter, VaultContainer, ValueValidator {
    /// @dev The address of the Supply Manager contract
    address public immutable SUPPLY_MANAGER;

    /// @dev The address of the Oracle contract.
    address public oracle;

    /// @notice Error thrown when an unauthorized address attempts to access restricted functions
    /// @dev Used in onlySupplyManagerOrTokenVault modifier for access control
    error ENotAuthorized();

    /// @notice Restricts access to Supply Manager or allowed token Vaults
    /// @dev Validates if the caller is either the Supply Manager or a whitelisted token Vault
    modifier onlySupplyManagerOrTokenVault() {
        if (!isTokenVaultAllowed[msg.sender] && msg.sender != SUPPLY_MANAGER) {
            revert ENotAuthorized();
        }
        _;
    }

    // ============ Constructor ============

    /// @dev Initializes the CommonToken with a Oracle and Supply Manager.
    /// @param oracle_ The address of the Oracle contract.
    /// @param supplyManager The address of the Supply Manager contract. Might be equal to the zero address.
    constructor(address oracle_, address supplyManager) notZeroAddress(oracle_) {
        oracle = oracle_;
        SUPPLY_MANAGER = supplyManager;
    }

    // ============ Admin Functions ============

    /// @dev Sets the Oracle contract's address.
    /// @param oracleAddress The new Oracle contract address
    function setOracle(
        address oracleAddress
    ) external virtual onlyOwner notZeroAddress(oracleAddress) {
        // Update the Oracle's address.
        oracle = oracleAddress;
    }

    // ============ View Functions ============

    /// @inheritdoc IShareAssetConverter
    function convertToAssets(uint256 shares) public view virtual override returns (uint256 assets) {
        assets = IOracleV2(oracle).convertToAssets(shares);
    }

    /// @inheritdoc IShareAssetConverter
    function convertToShares(uint256 assets) public view virtual override returns (uint256 shares) {
        shares = IOracleV2(oracle).convertToShares(assets);
    }

    // ============ Internal Functions ============

    /// @inheritdoc VaultContainer
    function _onAddTokenVault(address tokenVault) internal virtual override {
        if (SUPPLY_MANAGER != address(0)) {
            // Notify the Supply Manager about the new token Vault.
            ISupplyManagerV2(SUPPLY_MANAGER).onAddTokenVault(tokenVault);
        }
    }

    /// @inheritdoc VaultContainer
    function _onRemoveTokenVault(address tokenVault) internal virtual override {
        if (SUPPLY_MANAGER != address(0)) {
            // Notify the Supply Manager about the removal of the new token Vault.
            ISupplyManagerV2(SUPPLY_MANAGER).onRemoveTokenVault(tokenVault);
        }
    }

    /// @inheritdoc VaultContainer
    function _getAsset(address tokenVault) internal view virtual override returns (address asset) {
        // Get the underlying asset from the token Vault.
        return IERC7575(tokenVault).asset();
    }
}
