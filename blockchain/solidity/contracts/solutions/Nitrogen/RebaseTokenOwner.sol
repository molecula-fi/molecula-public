// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {FunctionPausable} from "../../common/FunctionPausable.sol";
import {IAgent} from "../../common/interfaces/IAgent.sol";
import {IERC7575Share} from "../../common/external/interfaces/IERC7575.sol";
import {IIssuer, IIssuerShare7575} from "../../coreV2/interfaces/IIssuer.sol";
import {IRebaseTokenOwner} from "./interfaces/IRebaseTokenOwner.sol";
import {RebaseERC20} from "../../common/rebase/RebaseERC20.sol";
import {VaultContainer} from "../../coreV2/VaultContainer.sol";

contract RebaseTokenOwner is
    VaultContainer,
    ERC165,
    IRebaseTokenOwner,
    FunctionPausable,
    Ownable2Step,
    IIssuerShare7575
{
    using Address for address;

    // ============ State Variables ============

    /// @dev Rebase token contract's address.
    RebaseERC20 public immutable REBASE_TOKEN;

    // ============ Constructor ============

    /// @dev Initializes the contract.
    /// @param initialOwner Owner's address.
    /// @param rebaseTokenAddress Rebase token's address.
    /// @param guardianAddress Guardian's address that can pause the contract.
    constructor(
        address initialOwner,
        address rebaseTokenAddress,
        address guardianAddress
    )
        Ownable(initialOwner)
        FunctionPausable(guardianAddress)
        checkNotZero(initialOwner)
        checkNotZero(rebaseTokenAddress)
    {
        REBASE_TOKEN = RebaseERC20(rebaseTokenAddress);
        guardian = guardianAddress;
    }

    // ============ Core Functions ============

    /// @inheritdoc IIssuer
    function mint(
        address user,
        uint256 shares
    ) external onlyTokenVault checkNotPause(RebaseTokenOwner.mint.selector) {
        // Mint shares for the user.
        REBASE_TOKEN.mint(user, shares);

        emit RequestDeposit(user, shares);
    }

    /// @inheritdoc IIssuer
    function burn(
        address user,
        uint256 shares
    ) external onlyTokenVault checkNotPause(RebaseTokenOwner.burn.selector) {
        // Burn shares for the user.
        REBASE_TOKEN.burn(user, shares);

        emit RequestRedeem(user, shares);
    }

    /// @inheritdoc IRebaseTokenOwner
    function callRebaseToken(bytes memory data) external onlyOwner returns (bytes memory result) {
        // Decode the function selector.
        bytes4 selector = bytes4(data);

        // Check whether the selector is allowed.
        if (
            selector == Ownable2Step.transferOwnership.selector ||
            selector == Ownable.renounceOwnership.selector ||
            selector == RebaseERC20.mint.selector ||
            selector == RebaseERC20.burn.selector
        ) {
            revert EBadSelector();
        }

        // Call the RebaseToken's function.
        return address(REBASE_TOKEN).functionCall(data);
    }

    /// @inheritdoc IRebaseTokenOwner
    function distribute(address[] memory users, uint256[] memory shares) external onlyTokenVault {
        for (uint256 i = 0; i < users.length; ++i) {
            REBASE_TOKEN.mint(users[i], shares[i]);
        }

        // Emit the `DistributeYield` event to log the operation.
        emit DistributeYield(users, shares);
    }

    // ============ Admin Functions ============

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal override(Ownable, Ownable2Step) {
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public override(Ownable, Ownable2Step) {
        super.transferOwnership(newOwner);
    }

    // ============ View Functions ============

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            type(IERC7575Share).interfaceId == interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ Internal Functions ============

    /// @inheritdoc VaultContainer
    function _getAsset(address tokenVault) internal view override returns (address asset) {
        return IAgent(tokenVault).getERC20Token();
    }

    /// @inheritdoc VaultContainer
    // solhint-disable-next-line no-empty-blocks
    function _onAddTokenVault(address) internal override {}

    /// @inheritdoc VaultContainer
    // solhint-disable-next-line no-empty-blocks
    function _onRemoveTokenVault(address) internal override {}
}
