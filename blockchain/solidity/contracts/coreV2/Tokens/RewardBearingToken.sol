// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IIssuer, IIssuerShare7575} from "./../interfaces/IIssuer.sol";
import {IOracleV2} from "./../interfaces/IOracleV2.sol";
import {CommonToken} from "./CommonToken.sol";
import {IShareAssetConverter} from "./interfaces/IShareAssetConverter.sol";
import {Permit} from "./Permit.sol";

/// @title RewardBearingToken Contract
/// @notice A token contract that represents shares in an underlying asset pool with reward-bearing capabilities
/// @dev Implements ERC20 standard with additional functionality for reward distribution and ownership management
contract RewardBearingToken is IIssuerShare7575, ERC20, Ownable2Step, Permit, CommonToken {
    // ============ Constructor ============

    /// @dev Initializes the RewardBearingToken contract
    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    /// @param initialOwner The address of the initial owner
    /// @param oracle_ The address of the oracle contract
    /// @param supplyManager The address of the supply manager contract
    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner,
        address oracle_,
        address supplyManager
    )
        ERC20(name_, symbol_)
        EIP712(name_, "2.0.0")
        Ownable(initialOwner)
        CommonToken(oracle_, supplyManager)
    {}

    // ============ Admin Functions ============

    /// @inheritdoc IIssuer
    function mint(
        address user,
        uint256 value
    ) external virtual override onlySupplyManagerOrTokenVault {
        _mint(user, value);
    }

    /// @inheritdoc IIssuer
    function burn(
        address user,
        uint256 value
    ) external virtual override onlySupplyManagerOrTokenVault {
        _burn(user, value);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) {
        // Initiate ownership transfer.
        super.transferOwnership(newOwner);
    }

    // ============ View Functions ============

    /// @inheritdoc ERC20
    function totalSupply() public view virtual override returns (uint256) {
        return IOracleV2(oracle).getTotalSharesSupply();
    }

    /// @inheritdoc IShareAssetConverter
    function localTotalShares() external view virtual override returns (uint256) {
        return super.totalSupply();
    }

    // ============ Internal Functions ============

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        // Transfer ownership to the new owner.
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Permit
    function _onPermit(address owner, address spender, uint256 value) internal virtual override {
        _approve(owner, spender, value);
    }
}
