// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {AbstractTokenVault} from "../../coreV2/AbstractTokenVault.sol";
import {FunctionPausable} from "../../common/FunctionPausable.sol";
import {IAgent} from "../../common/interfaces/IAgent.sol";
import {IERC7575} from "../../common/external/interfaces/IERC7575.sol";
import {IIssuer} from "../../coreV2/interfaces/IIssuer.sol";
import {IRebaseERC20} from "../../common/interfaces/IRebaseERC20.sol";
import {ISupplyManager} from "../../common/interfaces/ISupplyManager.sol";
import {MoleculaPoolTreasury, TokenType} from "../../core/MoleculaPoolTreasury.sol";
import {RebaseTokenOwner} from "./RebaseTokenOwner.sol";

/// @dev Specialized Vault implementing asynchronous redemption flows following the ERC-7540 standard,
/// with synchronous deposit functionality following ERC-4626. This Vault integrates with
/// RebaseTokenOwner for token supply management and MoleculaPoolTreasury for asset handling.
contract NitrogenTokenVault is AbstractTokenVault, IAgent {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @dev Rebase token owner contract responsible for minting and managing rebase tokens.
    RebaseTokenOwner public immutable REBASE_TOKEN_OWNER;

    // ============ Constructor ============

    /// @dev Sets up the Vault with required dependencies and security controls.
    /// @param initialOwner Contract owner's address.
    /// @param shareAddress Address of the ERC7575 share token contract.
    /// @param supplyManager Address of the supply management contract.
    /// @param tokenOwner Instance of the RebaseTokenOwner contract for managing rebase tokens.
    /// @param guardianAddress Address with pause privileges for emergency functions.
    constructor(
        address initialOwner,
        address shareAddress,
        address supplyManager,
        RebaseTokenOwner tokenOwner,
        address guardianAddress
    )
        AbstractTokenVault(shareAddress, supplyManager)
        Ownable(initialOwner)
        FunctionPausable(guardianAddress)
    {
        REBASE_TOKEN_OWNER = tokenOwner;
    }

    // ============ View Functions ============

    /// @inheritdoc AbstractTokenVault
    function issuer() public view override returns (IIssuer) {
        return IIssuer(address(REBASE_TOKEN_OWNER));
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public view override returns (uint256 assets) {
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        MoleculaPoolTreasury poolTreasury = MoleculaPoolTreasury(moleculaPool);

        uint256 mUSDAmount = IRebaseERC20(_SHARE).convertToAssets(shares);

        // See MoleculaPoolTreasury.requestRedeem
        // slither-disable-next-line unused-return
        (TokenType tokenType, , int8 n, , ) = poolTreasury.poolMap(asset);
        if (tokenType == TokenType.None) {
            revert MoleculaPoolTreasury.ETokenNotExist();
        }

        if (tokenType == TokenType.ERC20) {
            assets = mUSDAmount / (uint256(10) ** uint256(int256(n)));
        } else {
            uint256 assets2 = mUSDAmount / (uint256(10) ** uint256(int256(n)));
            assets = IERC4626(asset).convertToShares(assets2);
        }
    }

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public view override returns (uint256 shares) {
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        MoleculaPoolTreasury poolTreasury = MoleculaPoolTreasury(moleculaPool);

        // See MoleculaPoolTreasury.deposit
        // slither-disable-next-line unused-return
        (TokenType tokenType, , int8 n, , ) = poolTreasury.poolMap(asset);
        if (tokenType == TokenType.None) {
            revert MoleculaPoolTreasury.ETokenNotExist();
        }
        uint256 mUSDAmount;
        if (tokenType == TokenType.ERC20) {
            mUSDAmount = assets * (uint256(10) ** uint256(int256(n)));
        } else {
            uint256 assets2 = IERC4626(asset).convertToAssets(assets);
            mUSDAmount = assets2 * (uint256(10) ** uint256(int256(n)));
        }

        shares = IRebaseERC20(_SHARE).convertToShares(mUSDAmount);
    }

    /// @inheritdoc IERC7575
    function totalAssets() external view override returns (uint256 totalManagedAssets) {
        // Total amount of the underlying asset managed by the Vault.
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        return IERC20(asset).balanceOf(moleculaPool);
    }

    /// @inheritdoc IAgent
    function getERC20Token() external view override returns (address token) {
        return asset;
    }

    // ============ Core Functions ============

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function distribute(
        address[] memory users,
        uint256[] memory shares
    ) external payable override onlyZeroMsgValue only(SUPPLY_MANAGER) {
        REBASE_TOKEN_OWNER.distribute(users, shares);
        // Emit an event to log the operation.
        emit DistributeYield(users, shares);
    }

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function redeem(
        address fromAddress,
        uint256[] memory requestIds,
        uint256[] memory assets,
        uint256 totalValue
    ) external payable override onlyZeroMsgValue only(SUPPLY_MANAGER) {
        _fulfillRedeemRequests(fromAddress, requestIds, assets, totalValue);
    }

    /// @dev Follows the sequences:
    /// - Creates a new redemption operation request.
    /// - Attempts to redeem the tokens immediately.
    /// - Claims the redeemed assets.
    /// @param shares Amount of shares to redeem.
    /// @param receiver Receiver's address.
    /// @param owner Owner of shares.
    /// @return requestId Operation ID.
    function redeemImmediately(
        uint256 shares,
        address receiver,
        address owner
    ) external onlyOperator(owner) returns (uint256 requestId) {
        // Redeem the claimable assets
        uint256 claimableRedeemShares = convertToShares(claimableRedeemAssets[owner]);
        if (0 < claimableRedeemShares) {
            if (shares <= claimableRedeemShares) {
                _withdraw(convertToAssets(shares), receiver, owner);
                return 0;
            }

            shares -= claimableRedeemShares;
            _withdraw(convertToAssets(claimableRedeemShares), receiver, owner);
        }

        // slither-disable-next-line reentrancy-no-eth
        requestId = _requestRedeem(shares, msg.sender, owner);

        // Find the Molecula Pool's address.
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();

        // Try to redeem from the Pool.
        uint256[] memory requestIds = new uint256[](1);
        requestIds[0] = requestId;
        // slither-disable-next-line reentrancy-no-eth
        MoleculaPoolTreasury(moleculaPool).redeem(requestIds);

        _withdraw(redeemRequests[requestId].assets, receiver, msg.sender);
    }
}
