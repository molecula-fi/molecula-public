// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {IAgent} from "./../../common/interfaces/IAgent.sol";
import {IRebaseERC20} from "./../../common/interfaces/IRebaseERC20.sol";
import {ISupplyManager} from "./../../common/interfaces/ISupplyManager.sol";
import {PausableContract} from "./../../common/pausable/PausableContract.sol";
import {MoleculaPoolTreasuryV2, TokenType} from "./../../core/MoleculaPoolTreasuryV2.sol";
import {IRebaseERC20V2} from "../../coreV2/Tokens/interfaces/IRebaseERC20V2.sol";
import {BaseTokenVault} from "./../../coreV2/TokenVault/BaseTokenVault.sol";
import {CommonERC20TokenVault} from "./../../coreV2/TokenVault/CommonERC20TokenVault.sol";
import {INitrogenTokenVault} from "./interfaces/INitrogenTokenVault.sol";
import {RebaseTokenOwner} from "./RebaseTokenOwner.sol";

/// @dev Specialized Vault implementing asynchronous redemption flows following the ERC-7540 standard,
/// with synchronous deposit functionality following ERC-4626. This Vault integrates with
/// RebaseTokenOwner for token supply management and MoleculaPoolTreasury for the underlying asset handling.
contract NitrogenTokenVault is INitrogenTokenVault, CommonERC20TokenVault, IAgent {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @dev Rebase token owner contract responsible for minting and managing rebase tokens.
    RebaseTokenOwner public immutable REBASE_TOKEN_OWNER;

    /// @dev Stores redemption request information indexed by a request ID.
    mapping(uint256 requestId => RequestInfo) public redeemRequests;

    // ============ Events ============

    /// @dev Emitted when redemption requests are ready to be processed.
    /// @param requestIds Array of request IDs.
    /// @param values Array of corresponding values.
    event RedeemClaimable(uint256[] requestIds, uint256[] values);

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
        BaseTokenVault(shareAddress, supplyManager)
        PausableContract(guardianAddress)
        Ownable(initialOwner)
    {
        REBASE_TOKEN_OWNER = tokenOwner;
    }

    // ============ View Functions ============

    /// @inheritdoc BaseTokenVault
    function _issuer() internal view virtual override returns (address) {
        return address(REBASE_TOKEN_OWNER);
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public view virtual override returns (uint256 assets) {
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        MoleculaPoolTreasuryV2 poolTreasury = MoleculaPoolTreasuryV2(moleculaPool);

        uint256 mUSDAmount = IRebaseERC20(_SHARE).convertToAssets(shares);

        // See MoleculaPoolTreasury.requestRedeem
        // slither-disable-next-line unused-return
        (TokenType tokenType, , int8 n, , ) = poolTreasury.poolMap(_asset);
        if (tokenType == TokenType.None) {
            revert MoleculaPoolTreasuryV2.ETokenNotExist();
        }

        if (tokenType == TokenType.ERC20) {
            assets = mUSDAmount / (uint256(10) ** uint256(int256(n)));
        } else {
            uint256 assets2 = mUSDAmount / (uint256(10) ** uint256(int256(n)));
            assets = IERC4626(_asset).convertToShares(assets2);
        }
    }

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public view virtual override returns (uint256 shares) {
        shares = _convertToShares(assets);
    }

    /// @inheritdoc BaseTokenVault
    function _convertToShares(
        uint256 assets
    ) internal view virtual override returns (uint256 shares) {
        // Get a Molecula Pool instance for conversion calculations.
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        MoleculaPoolTreasuryV2 poolTreasury = MoleculaPoolTreasuryV2(moleculaPool);

        // Get the token configuration from the pool map.
        // slither-disable-next-line unused-return
        (TokenType tokenType, , int8 n, , ) = poolTreasury.poolMap(_asset);
        if (tokenType == TokenType.None) {
            revert MoleculaPoolTreasuryV2.ETokenNotExist();
        }
        uint256 mUSDAmount;
        if (tokenType == TokenType.ERC20) {
            mUSDAmount = assets * (uint256(10) ** uint256(int256(n)));
        } else {
            uint256 assets2 = IERC4626(_asset).convertToAssets(assets);
            mUSDAmount = assets2 * (uint256(10) ** uint256(int256(n)));
        }

        shares = IRebaseERC20(_SHARE).convertToShares(mUSDAmount);
    }

    /// @inheritdoc IERC7575
    function totalAssets() external view virtual override returns (uint256 totalManagedAssets) {
        // Total amount of the underlying asset managed by the Vault.
        address moleculaPool = ISupplyManager(SUPPLY_MANAGER).getMoleculaPool();
        return IERC20(_asset).balanceOf(moleculaPool);
    }

    /// @inheritdoc IAgent
    function getERC20Token() external view virtual override returns (address token) {
        return _asset;
    }

    // ============ Core Functions ============

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function distribute(
        address[] calldata users,
        uint256[] calldata shares
    ) external payable virtual override zeroMsgValue only(SUPPLY_MANAGER) {
        REBASE_TOKEN_OWNER.distribute(users, shares);
        // Emit an event to log the operation.
        emit DistributeYield(users, shares);
    }

    /// @inheritdoc IAgent
    // slither-disable-next-line locked-ether
    function redeem(
        address assetOwner,
        uint256[] calldata requestIds,
        uint256[] calldata assets,
        uint256 sumAssets
    ) external payable virtual override zeroMsgValue only(SUPPLY_MANAGER) {
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(_asset).safeTransferFrom(assetOwner, address(this), sumAssets);

        uint256 length = requestIds.length;
        for (uint256 i = 0; i < length; ++i) {
            // If assets[i] == 0 than requestIds[i] is already processed.
            if (assets[i] > 0) {
                // Store the assets' amount for this request.
                RequestInfo storage requestInfo = redeemRequests[requestIds[i]];
                requestInfo.assets = assets[i];

                // Decrease the pending shares since the request is fulfilled and
                // increase the amount of claimable assets that the user can withdraw.
                RedeemInfo storage redeemInfo = _redeemInfo[requestInfo.controller];
                redeemInfo.pendingRedeemShares -= requestInfo.shares;
                redeemInfo.claimableRedeemAssets += requestInfo.assets;
            }
        }

        // Emit an event to log the redemption operation.
        emit RedeemClaimable(requestIds, assets);
    }

    /// @inheritdoc INitrogenTokenVault
    function redeemImmediately(
        uint256 shares,
        address receiver,
        address owner
    ) external virtual override onlyOperator(owner) returns (uint256 requestId) {
        // Redeem the claimable assets
        uint256 claimableRedeemShares = convertToShares(_redeemInfo[owner].claimableRedeemAssets);
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
        MoleculaPoolTreasuryV2(moleculaPool).redeem(requestIds);

        _withdraw(redeemRequests[requestId].assets, receiver, msg.sender);
    }

    /// @inheritdoc BaseTokenVault
    function _supplyManagerRequestRedeem(
        address /*controller*/,
        address /*owner*/,
        uint256 requestId,
        uint256 shares
    ) internal virtual override returns (uint256 assets) {
        assets = ISupplyManager(SUPPLY_MANAGER).requestRedeem(_asset, requestId, shares);
    }

    /// @inheritdoc BaseTokenVault
    function _storeRedeemRequestInfo(
        uint256 requestId,
        address controller,
        address owner,
        uint256 shares
    ) internal virtual override {
        // Store the redemption operation in the `redeemRequests` mapping.
        redeemRequests[requestId] = RequestInfo({
            controller: controller,
            owner: owner,
            assets: 0, // Set the correct value in the `_fulfillRedeemRequests` function.
            shares: shares
        });
    }

    /// @inheritdoc BaseTokenVault
    function _maxRedeem(address owner) internal view virtual override returns (uint256 maxShares) {
        return IRebaseERC20V2(_SHARE).sharesOf(owner);
    }
}
