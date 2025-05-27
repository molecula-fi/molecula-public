// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ERC7540Operator} from "../common/ERC7540Operator.sol";
import {FunctionPausable} from "../common/FunctionPausable.sol";
import {IERC7540Deposit, IERC7540Redeem, IERC7540Operator} from "../common/external/interfaces/IERC7540.sol";
import {IERC7575} from "../common/external/interfaces/IERC7575.sol";
import {IIssuer} from "./interfaces/IIssuer.sol";
import {ISupplyManagerV2} from "./interfaces/ISupplyManagerV2.sol";
import {ITokenVault} from "./interfaces/ITokenVault.sol";
import {IdGenerator} from "../common/IdGenerator.sol";
import {ITokenShares} from "./interfaces/ITokenShares.sol";

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
    FunctionPausable
{
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @dev Function selector for deposit operations.
    bytes4 private constant _DEPOSIT_SELECTOR = IERC7540Deposit.deposit.selector;

    /// @dev Function selector for redemption request operations.
    bytes4 private constant _REQUEST_REDEEM_SELECTOR = this.requestRedeem.selector;

    // ============ State Variables ============

    /// @dev Address of the supply manager contract that coordinates asset movements.
    address public immutable SUPPLY_MANAGER;

    /// @inheritdoc IERC7575
    /// @dev ERC-20 token address (e.g. USDC, USDe).
    address public asset;

    /// @dev Molecula token address (e.g. mUSD).
    address internal immutable _SHARE;

    /// @dev Minimum amount of assets required for a deposit.
    uint256 public minDepositAssets;

    /// @dev Minimum amount of shares required for a redemption.
    uint256 public minRedeemShares;

    /// @dev Stores redemption request information indexed by a request ID.
    mapping(uint256 requestId => RequestInfo) public redeemRequests;

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
    ) checkNotZero(shareAddress) checkNotZero(supplyManager) {
        _SHARE = shareAddress;
        SUPPLY_MANAGER = supplyManager;
    }

    // ============ Core Functions ============
    /// @inheritdoc ITokenVault
    function init(
        address asset_,
        uint256 minDepositAssets_,
        uint256 minRedeemShares_
    ) external checkNotZero(asset_) onlyOwner {
        if (asset != address(0)) {
            revert EAlreadyInitialized();
        }
        asset = asset_;
        minDepositAssets = minDepositAssets_;
        minRedeemShares = minRedeemShares_;
    }

    // ============ View Functions ============
    /// @inheritdoc IERC7575
    function share() external view returns (address) {
        return _SHARE;
    }

    /// @dev Returns the issuer interface implementation.
    /// @return Implementation of the IIssuer interface.
    function issuer() public view virtual returns (IIssuer);

    // ============ Admin Functions ============
    /// @inheritdoc ITokenVault
    function setMinDepositAssets(uint256 minDepositAssets_) external onlyOwner {
        minDepositAssets = minDepositAssets_;
    }

    /// @inheritdoc ITokenVault
    function setMinRedeemShares(uint256 minRedeemShares_) external onlyOwner {
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
        onlyOperator(owner)
        checkNotPause(_DEPOSIT_SELECTOR)
        returns (uint256 requestId, uint256 shares)
    {
        // Check whether the deposit value is greater or equal to `minDepositAssets`.
        if (assets < minDepositAssets) {
            revert ETooLowDepositValue(minDepositAssets);
        }

        // Transfer the requested token value from the user.
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(asset).safeTransferFrom(owner, address(this), assets);

        // Approve to the Molecula Pool.
        IERC20(asset).forceApprove(ISupplyManagerV2(SUPPLY_MANAGER).getMoleculaPool(), assets);

        // Generate an ID for each new operation.
        requestId = _generateId();

        // Call the SupplyManager's `deposit` method.
        shares = ISupplyManagerV2(SUPPLY_MANAGER).deposit(asset, requestId, assets);

        // Mint shares for controller.
        issuer().mint(controller, shares);

        // Emit an event to log the deposit request.
        emit DepositRequest(controller, owner, requestId, msg.sender, assets);
    }

    /// @inheritdoc IERC7540Deposit
    function requestDeposit(
        uint256 assets,
        address controller,
        address owner
    ) external returns (uint256 requestId) {
        (requestId, ) = _requestDeposit(assets, controller, owner);
    }

    /// @inheritdoc IERC7540Deposit
    function deposit(
        uint256 assets,
        address receiver,
        address owner
    ) public returns (uint256 requestId) {
        (requestId, ) = _requestDeposit(assets, receiver, owner);
    }

    /// @inheritdoc IERC7575
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        (, shares) = _requestDeposit(assets, receiver, msg.sender);
    }

    /// @inheritdoc IERC7540Deposit
    function mint(
        uint256 shares,
        address receiver,
        address controller
    ) public returns (uint256 assets) {
        assets = convertToAssets(shares);
        _requestDeposit(assets, receiver, controller);
    }

    /// @inheritdoc IERC7575
    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        return mint(shares, receiver, msg.sender);
    }

    // ============ Internal Functions ============
    /// @dev Processes a redemption request.
    /// @param shares Amount of shares to redeem.
    /// @param controller Address that will receive assets.
    /// @param owner Address that owns the shares.
    /// @return requestId Redemption's ID.
    function _requestRedeem(
        uint256 shares,
        address controller,
        address owner
    ) internal checkNotPause(_REQUEST_REDEEM_SELECTOR) returns (uint256 requestId) {
        // Set the shares' amount equal to the user's shares if the shares' amount is greater than the user's shares.
        uint256 ownerMaxRedeem = maxRedeem(owner);
        if (shares > ownerMaxRedeem) {
            shares = ownerMaxRedeem;
        }

        // Check the redemption operation value.
        if (shares < minRedeemShares) {
            revert ETooLowRedeemValue(minRedeemShares);
        }

        // Generate an ID for each new operation.
        requestId = _generateId();

        // Store the redemption operation in the `redeemRequests` mapping.
        redeemRequests[requestId] = RequestInfo({
            user: controller,
            assets: 0, // Set the correct value in the `_fulfillRedeemRequests` function.
            shares: shares
        });

        // Burn the owner's shares.
        // slither-disable-next-line reentrancy-benign
        issuer().burn(owner, shares);

        // Call the Supply Manager's `requestRedeem` method.
        // slither-disable-next-line reentrancy-benign
        uint256 assets = ISupplyManagerV2(SUPPLY_MANAGER).requestRedeem(asset, requestId, shares);

        // Emit an event to log the redemption operation request.
        emit RedeemRequest(controller, owner, requestId, msg.sender, assets);

        pendingRedeemShares[controller] += shares;
    }

    /// @inheritdoc IERC7540Redeem
    function requestRedeem(
        uint256 shares,
        address controller,
        address owner
    ) external returns (uint256 requestId) {
        return _requestRedeem(shares, controller, owner);
    }

    /// @inheritdoc IERC7540Deposit
    function pendingDepositRequest(
        uint256 /*requestId*/,
        address /*controller*/
    ) external pure returns (uint256 pendingShares) {
        // The deposit flow is not asynchronous as we don't follow IERC7540:
        // “Vaults must not 'push' tokens onto the user after a request”
        // Our Vault implementation takes user's assets and mints tokens for the user in one transaction.
        return 0;
    }

    /// @inheritdoc IERC7540Deposit
    function claimableDepositRequest(
        uint256 /*requestId*/,
        address /*controller*/
    ) external pure returns (uint256 claimableShares) {
        // See the comment in` AbstractTokenVault.pendingDepositRequest`.
        return 0;
    }

    /// @inheritdoc IERC7540Redeem
    function pendingRedeemRequest(
        uint256 requestId,
        address controller
    ) external view returns (uint256 pendingShares) {
        // According to ERC-7540:
        // “When `requestId==0`, the Vault must use purely the controller to distinguish the request state.
        // The `Pending` and `Claimable` state of multiple requests from the same controller would be aggregated.”
        return requestId == 0 ? pendingRedeemShares[controller] : 0;
    }

    /// @inheritdoc IERC7540Redeem
    function claimableRedeemRequest(
        uint256 requestId,
        address controller
    ) external view returns (uint256 claimableShares) {
        // See the comment in `AbstractTokenVault.pendingRedeemRequest`.
        return requestId == 0 ? convertToShares(claimableRedeemAssets[controller]) : 0;
    }

    /// @dev Fulfills redemption requests by transferring assets.
    /// @param fromAddress Source of assets.
    /// @param requestIds Array of redemption request IDs.
    /// @param assets Array of asset amounts per request.
    /// @param totalValue Total assets being transferred.
    function _fulfillRedeemRequests(
        address fromAddress,
        uint256[] memory requestIds,
        uint256[] memory assets,
        uint256 totalValue
    ) internal {
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(asset).safeTransferFrom(fromAddress, address(this), totalValue);

        for (uint256 i = 0; i < requestIds.length; ++i) {
            RequestInfo storage redeemInfo = redeemRequests[requestIds[i]];
            redeemInfo.assets = assets[i];
            pendingRedeemShares[redeemInfo.user] -= redeemInfo.shares;
            claimableRedeemAssets[redeemInfo.user] += assets[i];
        }

        // Emit an event to log the redemption operation.
        emit RedeemClaimable(requestIds, assets);
    }

    /// @inheritdoc IERC7575
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets) {
        assets = convertToAssets(shares);
        withdraw(assets, receiver, owner);
    }

    /// @dev Redeems assets for a redemption.
    /// @param assets Amount of assets to redeem.
    /// @param receiver Address receiving the assets.
    /// @param owner Address that owns the shares.
    /// @return shares Amount of shares burned.
    function _withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) internal returns (uint256 shares) {
        if (assets > claimableRedeemAssets[owner]) {
            revert ETooManyAssets(claimableRedeemAssets[owner]);
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
    ) public onlyOperator(owner) returns (uint256 shares) {
        return _withdraw(assets, receiver, owner);
    }

    /// @inheritdoc ITokenVault
    function pauseRequestDeposit() external onlyAuthForPause {
        _setPause(_DEPOSIT_SELECTOR, true);
    }

    /// @inheritdoc ITokenVault
    function unpauseRequestDeposit() external onlyOwner {
        _setPause(_DEPOSIT_SELECTOR, false);
    }

    /// @inheritdoc ITokenVault
    function pauseRequestRedeem() external onlyAuthForPause {
        _setPause(_REQUEST_REDEEM_SELECTOR, true);
    }

    /// @inheritdoc ITokenVault
    function unpauseRequestRedeem() external onlyOwner {
        _setPause(_REQUEST_REDEEM_SELECTOR, false);
    }

    /// @inheritdoc ITokenVault
    function pauseAll() external onlyAuthForPause {
        _setPause(_DEPOSIT_SELECTOR, true);
        _setPause(_REQUEST_REDEEM_SELECTOR, true);
    }

    /// @inheritdoc ITokenVault
    function unpauseAll() external onlyOwner {
        _setPause(_DEPOSIT_SELECTOR, false);
        _setPause(_REQUEST_REDEEM_SELECTOR, false);
    }

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal override(Ownable, Ownable2Step) {
        super._transferOwnership(newOwner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public override(Ownable, Ownable2Step) {
        super.transferOwnership(newOwner);
    }

    /// @inheritdoc IERC7575
    function convertToAssets(uint256 shares) public view virtual returns (uint256 assets);

    /// @inheritdoc IERC7575
    function convertToShares(uint256 assets) public view virtual returns (uint256 shares);

    /// @inheritdoc IERC7575
    function maxDeposit(address receiver) external pure returns (uint256 maxAssets) {
        receiver;
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575
    function maxMint(address receiver) external pure returns (uint256 maxShares) {
        receiver;
        return type(uint256).max;
    }

    /// @inheritdoc IERC7575
    function maxRedeem(address owner) public view returns (uint256 maxShares) {
        return ITokenShares(_SHARE).sharesOf(owner);
    }

    /// @inheritdoc IERC7575
    function maxWithdraw(address owner) external view returns (uint256 maxAssets) {
        uint256 maxShares = maxRedeem(owner);
        return convertToAssets(maxShares);
    }

    /// @inheritdoc IERC7575
    function previewDeposit(uint256 assets) external view returns (uint256 shares) {
        return convertToShares(assets);
    }

    /// @inheritdoc IERC7575
    function previewMint(uint256 shares) external view returns (uint256 assets) {
        return convertToAssets(shares);
    }

    /// @inheritdoc IERC7575
    function previewRedeem(uint256 shares) external pure returns (uint256 assets) {
        shares;
        assets;
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc IERC7575
    function previewWithdraw(uint256 assets) external pure returns (uint256 shares) {
        assets;
        shares;
        // According to ERC-7540: "... MUST revert for all callers and inputs".
        revert EAsyncRedeem();
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            (type(IERC7540Deposit).interfaceId ^ type(IERC7540Redeem).interfaceId) == interfaceId ||
            type(IERC7540Operator).interfaceId == interfaceId ||
            type(IERC7575).interfaceId == interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
