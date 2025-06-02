// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IERC7575} from "./../common/external/interfaces/IERC7575.sol";
import {IIssuer, IIssuerShare7575} from "./interfaces/IIssuer.sol";
import {IRebaseTokenV2} from "./interfaces/IRebaseTokenV2.sol";
import {ISupplyManagerV2} from "./interfaces/ISupplyManagerV2.sol";
import {Permit} from "./Permit.sol";
import {RebaseERC20V2} from "./RebaseERC20V2.sol";
import {VaultContainer} from "./VaultContainer.sol";

/// @title RebaseTokenV2.
/// @notice Contract for implementing the RebaseERC20V2 functionality.
/// @dev Extends RebaseERC20V2 with additional vault container and ownership features.
// slither-disable-next-line missing-inheritance
contract RebaseTokenV2 is
    IIssuerShare7575,
    IRebaseTokenV2,
    Ownable2Step,
    Permit,
    RebaseERC20V2,
    VaultContainer
{
    // ============ State Variables ============

    /// @dev Supply Manager's contract address.
    address public immutable SUPPLY_MANAGER;

    // ============ Errors ============

    /// @dev Thrown when the caller is not authorized.
    error ENotAuthorized();

    // ============ Modifiers ============

    /// @dev Ensures the caller is either the Supply Manager or an allowed token Vault.
    modifier onlySupplyManagerOrTokenVault() {
        if (!isTokenVaultAllowed[msg.sender] && msg.sender != SUPPLY_MANAGER) {
            revert ENotAuthorized();
        }
        _;
    }

    // ============ Constructor ============

    /// @dev Initializes the contract with specified parameters.
    /// @param oracleAddress Oracle contract's address.
    /// @param initialOwner Smart contract owner's address.
    /// @param tokenName Token name.
    /// @param tokenSymbol Token symbol.
    /// @param tokenDecimals Token decimals.
    /// @param supplyManager_ SupplyManager's address. Might be equal to the zero address.
    constructor(
        address oracleAddress,
        address initialOwner,
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        address supplyManager_
    )
        RebaseERC20V2(oracleAddress, tokenName, tokenSymbol, tokenDecimals)
        Ownable(initialOwner)
        EIP712(tokenName, "2.0.0")
        notZeroAddress(supplyManager_)
    {
        SUPPLY_MANAGER = supplyManager_;
    }

    // ============ Core Functions ============

    /// @inheritdoc IIssuer
    function mint(
        address user,
        uint256 shares
    ) external virtual override onlySupplyManagerOrTokenVault {
        // Mint shares for the user.
        _mint(user, shares);
    }

    /// @inheritdoc IIssuer
    function burn(
        address user,
        uint256 shares
    ) external virtual override onlySupplyManagerOrTokenVault {
        // Burn the user's shares.
        _burn(user, shares);
    }

    // ============ Admin Functions ============

    /// @dev Sets the Oracle contract's address.
    /// @param oracleAddress Oracle contract's address.
    function setOracle(
        address oracleAddress
    ) external virtual override onlyOwner notZeroAddress(oracleAddress) {
        // Update the Oracle's address.
        oracle = oracleAddress;
    }

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        // Transfer ownership to the new owner.
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) {
        // Initiate ownership transfer.
        super.transferOwnership(newOwner);
    }

    // ============ Internal Functions ============

    /// @inheritdoc VaultContainer
    function _getAsset(address tokenVault) internal view virtual override returns (address asset) {
        // Get the underlying asset from the token Vault.
        return IERC7575(tokenVault).asset();
    }

    /// @inheritdoc VaultContainer
    function _onAddTokenVault(address tokenVault) internal virtual override {
        // Notify the Supply Manager about the new token Vault.
        ISupplyManagerV2(oracle).onAddTokenVault(tokenVault);
    }

    /// @inheritdoc VaultContainer
    function _onRemoveTokenVault(address tokenVault) internal virtual override {
        // Notify the Supply Manager about the removal of the new token Vault.
        ISupplyManagerV2(oracle).onRemoveTokenVault(tokenVault);
    }

    /// @inheritdoc Permit
    function _onPermit(address owner, address spender, uint256 shares) internal virtual override {
        _approve(owner, spender, shares);
    }
}
