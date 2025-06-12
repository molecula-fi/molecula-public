// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC7575Payable} from "./../../common/external/interfaces/IERC7575Payable.sol";
import {PausableContract} from "./../../common/pausable/PausableContract.sol";
import {ConstantsCoreV2} from "./../Constants.sol";
import {ISupplyManagerV2} from "./../interfaces/ISupplyManagerV2.sol";
import {ISupplyManagerV2WithNative} from "./../interfaces/ISupplyManagerV2.sol";
import {IBaseTokenVault} from "../Tokens/interfaces/ITokenVault.sol";
import {INativeTokenVault} from "../Tokens/interfaces/ITokenVault.sol";
import {BaseTokenVault} from "./BaseTokenVault.sol";

/// @title NativeTokenVault.
/// @notice Based on EIP-7535: https://eips.ethereum.org/EIPS/eip-7535
/// @dev TokenVault that uses the native token as an underlying asset.
abstract contract NativeTokenVault is INativeTokenVault, BaseTokenVault, IERC7575Payable {
    using Address for address payable;

    /// @dev Initializes the Vault with core dependencies.
    /// @param initialOwner Owner's address.
    /// @param shareAddress Share token contract's address.
    /// @param supplyManager Supply Manager contract's address.
    /// @param guardianAddress Address of the guardian that can pause the contract.
    constructor(
        address initialOwner,
        address shareAddress,
        address supplyManager,
        address guardianAddress
    )
        BaseTokenVault(shareAddress, supplyManager)
        PausableContract(guardianAddress)
        Ownable(initialOwner)
    {}

    // ============ Core Functions ============

    receive() external payable {
        // Get tokens from the Molecula pool.
    }

    /// @inheritdoc IBaseTokenVault
    function init(
        address asset_,
        uint128 minDepositAssets_,
        uint128 minRedeemShares_
    ) external virtual override onlyOwner {
        if (asset_ != ConstantsCoreV2.NATIVE_TOKEN) {
            revert EWrongNativeAddress();
        }
        _init(asset_, minDepositAssets_, minRedeemShares_);
    }

    /// @inheritdoc IERC7575Payable
    function deposit(
        uint256 assets,
        address receiver
    ) external payable virtual override returns (uint256 shares) {
        assets = msg.value;
        (, shares) = _requestDeposit(assets, receiver, msg.sender);
    }

    /// @inheritdoc IERC7575Payable
    function mint(
        uint256 shares,
        address receiver
    ) external payable virtual override returns (uint256 assets) {
        assets = convertToAssets(shares);
        _requestDeposit(assets, receiver, msg.sender);
    }

    /// @inheritdoc IBaseTokenVault
    function requestWithdraw(
        uint256 assets,
        address controller,
        address owner
    ) external virtual override onlyOperator(owner) returns (uint256 requestId) {
        uint256 shares = _convertToShares(assets);
        return _requestRedeem(shares, controller, owner);
    }

    /// @inheritdoc INativeTokenVault
    function fulfillRedeemRequests(
        uint256[] calldata requestIds,
        uint256 sumAssets
    ) external virtual override only(SUPPLY_MANAGER) {
        _fulfillRedeemRequests(requestIds, sumAssets);
    }

    /// @inheritdoc IERC7575Payable
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public payable virtual override onlyOperator(owner) returns (uint256 shares) {
        shares = _withdraw(assets, receiver, owner);
    }

    /// @inheritdoc IERC7575Payable
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external payable virtual override onlyOperator(owner) returns (uint256 assets) {
        assets = convertToAssets(shares);
        withdraw(assets, receiver, owner);
    }

    // ============ View Functions ============

    /// @inheritdoc IERC7575Payable
    function share() external view returns (address shareTokenAddress) {
        return _SHARE;
    }

    /// @inheritdoc IERC7575Payable
    function asset() external view returns (address assetTokenAddress) {
        return _asset;
    }

    /// @inheritdoc IERC7575Payable
    function convertToAssets(uint256 shares) public view virtual override returns (uint256 assets);

    /// @inheritdoc IERC7575Payable
    function maxDeposit(
        address /*receiver*/
    ) external pure virtual override returns (uint256 maxAssets) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575Payable
    function maxMint(
        address /*receiver*/
    ) external pure virtual override returns (uint256 maxShares) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575Payable
    function maxRedeem(address owner) external view virtual override returns (uint256 maxShares) {
        return _maxRedeem(owner);
    }

    /// @inheritdoc IERC7575Payable
    function maxWithdraw(address owner) external view virtual override returns (uint256 maxAssets) {
        uint256 maxShares = _maxRedeem(owner);
        return convertToAssets(maxShares);
    }

    /// @inheritdoc IERC7575Payable
    function previewDeposit(
        uint256 assets
    ) external view virtual override returns (uint256 shares) {
        return _convertToShares(assets);
    }

    /// @inheritdoc IERC7575Payable
    function previewMint(uint256 shares) external view virtual override returns (uint256 assets) {
        return convertToAssets(shares);
    }

    /// @inheritdoc IERC7575Payable
    function previewRedeem(
        uint256 /*shares*/
    ) external pure virtual override returns (uint256 /*assets*/) {
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc IERC7575Payable
    function previewWithdraw(
        uint256 /*assets*/
    ) external pure virtual override returns (uint256 /*shares*/) {
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            type(IERC7575Payable).interfaceId == interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ============ Internal Functions ============

    /// @inheritdoc BaseTokenVault
    function _supplyManagerDeposit(
        uint256 requestId,
        uint256 assets
    ) internal virtual override returns (uint256 shares) {
        return
            ISupplyManagerV2WithNative(SUPPLY_MANAGER).depositNativeToken{value: msg.value}(
                _asset,
                requestId,
                assets
            );
    }

    /// @inheritdoc BaseTokenVault
    function _issuer() internal view virtual override returns (address) {
        return _SHARE;
    }

    /// @inheritdoc BaseTokenVault
    function _storeRedeemRequestInfo(
        uint256 /*requestId*/,
        address /*controller*/,
        address /*owner*/,
        uint256 /*shares*/ // solhint-disable-next-line no-empty-blocks
    ) internal virtual override {
        // Do nothing. SupplyManagerV2 stores information about request.
    }

    /// @inheritdoc BaseTokenVault
    function _supplyManagerRequestRedeem(
        address controller,
        address owner,
        uint256 requestId,
        uint256 shares
    ) internal virtual override returns (uint256 assets) {
        assets = ISupplyManagerV2(SUPPLY_MANAGER).requestRedeem(
            _asset,
            controller,
            owner,
            requestId,
            shares
        );
    }

    /// @inheritdoc BaseTokenVault

    function _transferAssetsFromOwner(
        address /*owner*/,
        uint256 /*assets*/ // solhint-disable-next-line no-empty-blocks
    ) internal virtual override {}

    /// @inheritdoc BaseTokenVault
    function _transferAssetsToReceiver(address receiver, uint256 assets) internal virtual override {
        payable(receiver).sendValue(assets);
    }
}
