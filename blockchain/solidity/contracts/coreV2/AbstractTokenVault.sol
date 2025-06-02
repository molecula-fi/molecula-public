// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC7540Operator} from "./../common/ERC7540Operator.sol";
import {IERC7540Deposit, IERC7540Redeem, IERC7540Operator} from "./../common/external/interfaces/IERC7540.sol";
import {IERC7575} from "./../common/external/interfaces/IERC7575.sol";
import {IdGenerator} from "./../common/IdGenerator.sol";
import {PausableVault} from "./../common/pausable/PausableVault.sol";
import {IIssuer} from "./interfaces/IIssuer.sol";
import {ISupplyManagerV2} from "./interfaces/ISupplyManagerV2.sol";
import {ITokenShares} from "./interfaces/ITokenShares.sol";
import {ITokenVault} from "./interfaces/ITokenVault.sol";

/// @dev Vault that implements only asynchronous requests for redemption flows (ERC-7540).
/// Deposit flow is synchronous (ERC-4626), while also supporting ERC-7540.
abstract contract AbstractTokenVault is
    IERC7575,
    ERC7540Operator,
    IERC7540Deposit,
    IERC7540Redeem,
    ERC165,
    ITokenVault,
    IdGenerator,
    Ownable2Step,
    PausableVault
{
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @dev Address of the supply manager contract that coordinates asset movements.
    address public immutable SUPPLY_MANAGER;

    /// @dev Molecula token address (e.g. mUSD).
    address internal immutable _SHARE;

    /// @inheritdoc IERC7575
    /// @dev ERC-20 token address (e.g. USDC, sUSDe).
    address public asset;

    /// @dev Minimum amount of assets required for a deposit.
    uint128 public minDepositAssets;

    /// @dev Minimum amount of shares required for a redemption.
    uint128 public minRedeemShares;

    /// @dev Tracks pending redemption shares for each controller address.
    mapping(address controller => uint256 shares) public pendingRedeemShares;

    /// @dev Tracks claimable redemption assets for each controller address.
    mapping(address controller => uint256 assets) public claimableRedeemAssets;

    // ============ Modifiers ============

    /// @dev Ensures caller matches expected address.
    /// @param expectedSender Authorized address to call the functions.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert ENotAuthorized();
        }
        _;
    }

    // ============ Constructor ============

    /// @dev Initializes the Vault with core dependencies.
    /// @param shareAddress Address of the share token contract.
    /// @param supplyManager Address of the Supply Manager contract.
    constructor(
        address shareAddress,
        address supplyManager
    ) notZeroAddress(shareAddress) notZeroAddress(supplyManager) {
        _SHARE = shareAddress;
        SUPPLY_MANAGER = supplyManager;
    }

    // ============ Core Functions ============
    /// @inheritdoc ITokenVault
    function init(
        address asset_,
        uint128 minDepositAssets_,
        uint128 minRedeemShares_
    )
        external
        virtual
        override
        notZeroAddress(asset_)
        notZero(minDepositAssets_)
        notZero(minRedeemShares_)
        onlyOwner
    {
        if (asset != address(0)) {
            revert EAlreadyInitialized();
        }
        asset = asset_;
        minDepositAssets = minDepositAssets_;
        minRedeemShares = minRedeemShares_;

        // Infinity approve to the Molecula Pool.
        IERC20(asset).forceApprove(
            ISupplyManagerV2(SUPPLY_MANAGER).getMoleculaPool(),
            type(uint256).max
        );
    }

    // ============ View Functions ============
    /// @inheritdoc IERC7575
    function share() external view virtual override returns (address) {
        return _SHARE;
    }

    /// @dev Returns the issuer interface implementation.
    /// @return Implementation of the IIssuer interface.
    function _issuer() internal view virtual returns (address);

    // ============ Admin Functions ============
    /// @inheritdoc ITokenVault
    function setMinDepositAssets(
        uint128 minDepositAssets_
    ) external virtual override onlyOwner notZero(minDepositAssets_) {
        minDepositAssets = minDepositAssets_;
    }

    /// @inheritdoc ITokenVault
    function setMinRedeemShares(
        uint128 minRedeemShares_
    ) external virtual override onlyOwner notZero(minRedeemShares_) {
        minRedeemShares = minRedeemShares_;
    }

    // ============ Core Functions ============
    /// @dev We support ERC-7540 for the deposit flow, while it is not asynchronous.
    /// We don't follow IERC7540: “Vaults must not 'push' tokens onto the user after a request”
    /// Our Vault implementation takes user's assets and mints tokens for the user in one transaction.
    /// @dev Processes a deposit request.
    /// @param assets Amount of assets to deposit.
    /// @param controller Address that will receive shares.
    /// @param owner Address that owns the assets.
    /// @return requestId Deposit's ID.
    /// @return shares Amount of shares minted.
    function _requestDeposit(
        uint256 assets,
        address controller,
        address owner
    )
        internal
        virtual
        notZeroAddress(controller)
        notZeroAddress(owner)
        onlyOperator(owner)
        checkNotPause(_DEPOSIT_SELECTOR)
        returns (uint256 requestId, uint256 shares)
    {
        // Check whether the deposit value is greater or equal to `minDepositAssets`.
        if (assets < minDepositAssets) {
            revert ETooLowDepositAssets(minDepositAssets);
        }

        // Transfer the requested token value from the user.
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(asset).safeTransferFrom(owner, address(this), assets);

        // Generate an ID for each new operation.
        // Note: According to ERC-7540, returning requestId must be equal to zero, because we aggregate Requests.
        // But here requestId != 0.
        requestId = _generateId();

        // Call the SupplyManager's `deposit` method.
        shares = ISupplyManagerV2(SUPPLY_MANAGER).deposit(asset, requestId, assets);

        // Mint shares for controller.
        IIssuer(_issuer()).mint(controller, shares);

        // Emit an event to log the deposit request.
        emit DepositRequest(controller, owner, requestId, msg.sender, assets);
    }

    /// @inheritdoc IERC7540Deposit
    function requestDeposit(
        uint256 assets,
        address controller,
        address owner
    ) external virtual override returns (uint256 requestId) {
        (requestId, ) = _requestDeposit(assets, controller, owner);
    }

    /// @inheritdoc IERC7540Deposit
    function deposit(
        uint256 assets,
        address receiver,
        address owner
    ) external virtual override returns (uint256 requestId) {
        (requestId, ) = _requestDeposit(assets, receiver, owner);
    }

    /// @inheritdoc IERC7575
    function deposit(
        uint256 assets,
        address receiver
    ) external virtual override returns (uint256 shares) {
        (, shares) = _requestDeposit(assets, receiver, msg.sender);
    }

    /// @inheritdoc IERC7540Deposit
    function mint(
        uint256 shares,
        address receiver,
        address controller
    ) public virtual override returns (uint256 assets) {
        assets = convertToAssets(shares);
        _requestDeposit(assets, receiver, controller);
    }

    /// @inheritdoc IERC7575
    function mint(
        uint256 shares,
        address receiver
    ) external virtual override returns (uint256 assets) {
        return mint(shares, receiver, msg.sender);
    }

    // ============ Internal Functions ============

    /// @dev Stores information about a redemption request.
    /// @param requestId Unique identifier for the redemption request.
    /// @param controller Address that will receive the assets.
    /// @param shares Amount of shares being redeemed.
    function _storeRequestInfo(
        uint256 requestId,
        address controller,
        uint256 shares
    ) internal virtual;

    /// @dev Requests redemption through the supply manager contract.
    /// @param controller Address that will receive the assets.
    /// @param requestId Unique identifier for the redemption request.
    /// @param shares Amount of shares being redeemed.
    /// @return assets Amount of assets that will be redeemed.
    function _supplyManagerRequestRedeem(
        address controller,
        uint256 requestId,
        uint256 shares
    ) internal virtual returns (uint256 assets);

    /// @dev Processes a redemption request.
    /// @param shares Amount of shares to redeem.
    /// @param controller Address that will receive assets.
    /// @param owner Address that owns the shares.
    /// @return requestId Redemption's ID.
    /// Note: notZeroAddress(owner) is not called because owner is already checked
    function _requestRedeem(
        uint256 shares,
        address controller,
        address owner
    )
        internal
        virtual
        checkNotPause(_REQUEST_REDEEM_SELECTOR)
        notZeroAddress(controller)
        returns (uint256 requestId)
    {
        // Check if requested shares do not exceed owner's balance.
        uint256 ownerMaxRedeem = maxRedeem(owner);
        if (shares > ownerMaxRedeem) {
            revert ETooManyRequestRedeemShares(ownerMaxRedeem);
        }

        // Check the redemption operation value.
        if (shares < minRedeemShares) {
            revert ETooLowRequestRedeemShares(minRedeemShares);
        }

        // Generate an ID for each new operation.
        // Note: According to ERC-7540, returning requestId must be equal to zero, because we aggregate Requests.
        // But here requestId != 0.
        requestId = _generateId();

        // Store the redemption operation info.
        _storeRequestInfo(requestId, controller, shares);

        // Burn the owner's shares.
        // slither-disable-next-line reentrancy-benign
        IIssuer(_issuer()).burn(owner, shares);

        // Call the Supply Manager's `requestRedeem` method.
        // slither-disable-next-line reentrancy-benign
        uint256 assets = _supplyManagerRequestRedeem(controller, requestId, shares);

        // Increase the amount of pending redeem shares for the controller.
        pendingRedeemShares[controller] += shares;

        // Emit an event to log the redemption operation request.
        emit RedeemRequest(controller, owner, requestId, msg.sender, assets);
    }

    /// @inheritdoc IERC7540Redeem
    function requestRedeem(
        uint256 shares,
        address controller,
        address owner
    ) external virtual override onlyOperator(owner) returns (uint256 requestId) {
        return _requestRedeem(shares, controller, owner);
    }

    /// @inheritdoc ITokenVault
    function requestWithdraw(
        uint256 assets,
        address controller,
        address owner
    ) external virtual override onlyOperator(owner) returns (uint256 requestId) {
        uint256 shares = convertToShares(assets);
        return _requestRedeem(shares, controller, owner);
    }

    /// @inheritdoc IERC7540Deposit
    function pendingDepositRequest(
        uint256 /*requestId*/,
        address /*controller*/
    ) external pure virtual override returns (uint256 pendingShares) {
        // The deposit flow is not asynchronous as we don't follow IERC7540:
        // “Vaults must not 'push' tokens onto the user after a request”
        // Our Vault implementation takes user's assets and mints tokens for the user in one transaction.
        return 0;
    }

    /// @inheritdoc IERC7540Deposit
    function claimableDepositRequest(
        uint256 /*requestId*/,
        address /*controller*/
    ) external pure virtual override returns (uint256 claimableShares) {
        // See the comment in` AbstractTokenVault.pendingDepositRequest`.
        return 0;
    }

    /// @inheritdoc IERC7540Redeem
    function pendingRedeemRequest(
        uint256 requestId,
        address controller
    ) external view virtual override returns (uint256 pendingShares) {
        // According to ERC-7540:
        // “When `requestId==0`, the Vault must use purely the controller to distinguish the request state.
        // The `Pending` and `Claimable` state of multiple requests from the same controller would be aggregated.”
        return requestId == 0 ? pendingRedeemShares[controller] : 0;
    }

    /// @inheritdoc IERC7540Redeem
    function claimableRedeemRequest(
        uint256 requestId,
        address controller
    ) external view virtual override returns (uint256 claimableShares) {
        // See the comment in `AbstractTokenVault.pendingRedeemRequest`.
        return requestId == 0 ? convertToShares(claimableRedeemAssets[controller]) : 0;
    }

    /// @inheritdoc IERC7575
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external virtual override returns (uint256 assets) {
        assets = convertToAssets(shares);
        withdraw(assets, receiver, owner);
    }

    /// @dev Redeems assets for a redemption.
    /// @param assets Amount of assets to redeem.
    /// @param receiver Address receiving the assets.
    /// @param owner Address that owns the shares.
    /// @return shares Amount of shares burned.
    /// Note: notZeroAddress(owner) is not called because owner is already checked
    function _withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) internal virtual notZero(assets) notZeroAddress(receiver) returns (uint256 shares) {
        if (assets > claimableRedeemAssets[owner]) {
            revert ETooManyRedeemAssets(claimableRedeemAssets[owner]);
        }
        claimableRedeemAssets[owner] -= assets;
        shares = convertToShares(assets);

        IERC20(asset).safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /// @inheritdoc IERC7575
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override onlyOperator(owner) returns (uint256 shares) {
        return _withdraw(assets, receiver, owner);
    }

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) {
        super.transferOwnership(newOwner);
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public view virtual returns (uint256 assets);

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public view virtual returns (uint256 shares);

    /// @inheritdoc IERC7575
    function maxDeposit(
        address /*receiver*/
    ) external pure virtual override returns (uint256 maxAssets) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575
    function maxMint(
        address /*receiver*/
    ) external pure virtual override returns (uint256 maxShares) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575
    function maxRedeem(address owner) public view virtual override returns (uint256 maxShares) {
        return ITokenShares(_SHARE).sharesOf(owner);
    }

    /// @inheritdoc IERC7575
    function maxWithdraw(address owner) external view virtual override returns (uint256 maxAssets) {
        uint256 maxShares = maxRedeem(owner);
        return convertToAssets(maxShares);
    }

    /// @inheritdoc IERC7575
    function previewDeposit(
        uint256 assets
    ) external view virtual override returns (uint256 shares) {
        return convertToShares(assets);
    }

    /// @inheritdoc IERC7575
    function previewMint(uint256 shares) external view virtual override returns (uint256 assets) {
        return convertToAssets(shares);
    }

    /// @inheritdoc IERC7575
    function previewRedeem(
        uint256 /*shares*/
    ) external pure virtual override returns (uint256 /*assets*/) {
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc IERC7575
    function previewWithdraw(
        uint256 /*assets*/
    ) external pure virtual override returns (uint256 /*shares*/) {
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            type(IERC7540Deposit).interfaceId == interfaceId ||
            type(IERC7540Redeem).interfaceId == interfaceId ||
            type(IERC7540Operator).interfaceId == interfaceId ||
            type(IERC7575).interfaceId == interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
