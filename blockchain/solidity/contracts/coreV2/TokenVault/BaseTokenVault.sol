// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC7540Operator} from "./../../common/ERC7540Operator.sol";
import {IERC7540Deposit, IERC7540Redeem, IERC7540Operator} from "./../../common/external/interfaces/IERC7540.sol";
import {IERC7575} from "./../../common/external/interfaces/IERC7575.sol";
import {IdGenerator} from "./../../common/IdGenerator.sol";
import {PausableVault} from "./../../common/pausable/PausableVault.sol";
import {IIssuer} from "./../interfaces/IIssuer.sol";
import {ISupplyManagerV2} from "./../interfaces/ISupplyManagerV2.sol";
import {IBaseTokenVault} from "../Tokens/interfaces/ITokenVault.sol";

/// @title BaseTokenVault.
/// @dev Vault is used for solutions based on CoreV2. For native and ERC-20 tokens.
abstract contract BaseTokenVault is
    IBaseTokenVault,
    ERC7540Operator,
    IERC7540Redeem,
    ERC165,
    IdGenerator,
    Ownable2Step,
    PausableVault
{
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @dev Address of the Supply Manager contract that coordinates asset movements.
    address public immutable SUPPLY_MANAGER;

    /// @dev Molecula token address (e.g. mUSD).
    address internal immutable _SHARE;

    /// @dev ERC-20 token address (e.g. USDC, sUSDe) or native token.
    address internal _asset;

    /// @dev Minimum amount of assets required for a deposit.
    uint128 public minDepositAssets;

    /// @dev Minimum amount of shares required for a redemption.
    uint128 public minRedeemShares;

    /// @dev Stores the redemption information associated with each controller address.
    mapping(address controller => RedeemInfo) internal _redeemInfo;

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

        _setPause(_DEPOSIT_SELECTOR, true);
        _setPause(_REQUEST_REDEEM_SELECTOR, true);
    }

    // ============ Modifiers ============

    /// @dev Ensures the caller's address matches the expected address.
    /// @param expectedSender Authorized address to call the functions.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert ENotAuthorized();
        }
        _;
    }

    // ============ Core Functions ============

    /// @inheritdoc IBaseTokenVault
    function setMinDepositAssets(
        uint128 minDepositAssets_
    ) external virtual override onlyOwner notZero(minDepositAssets_) {
        minDepositAssets = minDepositAssets_;
    }

    /// @inheritdoc IBaseTokenVault
    function setMinRedeemShares(
        uint128 minRedeemShares_
    ) external virtual override onlyOwner notZero(minRedeemShares_) {
        minRedeemShares = minRedeemShares_;
    }

    /// @inheritdoc IERC7540Redeem
    function requestRedeem(
        uint256 shares,
        address controller,
        address owner
    ) external virtual override onlyOperator(owner) returns (uint256 requestId) {
        return _requestRedeem(shares, controller, owner);
    }

    /// @inheritdoc Ownable2Step
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) {
        super.transferOwnership(newOwner);
    }

    // ============ View Functions ============

    /// @inheritdoc IERC7540Redeem
    function pendingRedeemRequest(
        uint256 requestId,
        address controller
    ) external view virtual override returns (uint256 pendingShares) {
        // According to ERC-7540:
        // “When `requestId==0`, the Vault must use purely the controller to distinguish the request state.
        // The `Pending` and `Claimable` state of multiple requests from the same controller would be aggregated.”
        return requestId == 0 ? _redeemInfo[controller].pendingRedeemShares : 0;
    }

    /// @inheritdoc IERC7540Redeem
    function claimableRedeemRequest(
        uint256 requestId,
        address controller
    ) external view virtual override returns (uint256 claimableShares) {
        // See the comment in `CommonERC20TokenVault.pendingRedeemRequest`.
        return requestId == 0 ? _convertToShares(_redeemInfo[controller].claimableRedeemAssets) : 0;
    }

    /// @inheritdoc IBaseTokenVault
    function pendingRedeemShares(
        address controller
    ) external view virtual override returns (uint256 shares) {
        return _redeemInfo[controller].pendingRedeemShares;
    }

    /// @inheritdoc IBaseTokenVault
    function claimableRedeemAssets(
        address controller
    ) external view virtual override returns (uint256 assets) {
        return _redeemInfo[controller].claimableRedeemAssets;
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            type(IERC7540Redeem).interfaceId == interfaceId ||
            type(IERC7540Operator).interfaceId == interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ============ Internal Functions ============

    /// @dev Initializes the token Vault with specified parameters.
    /// @param asset_ Asset token address.
    /// @param minDepositAssets_ Minimum deposit amount.
    /// @param minRedeemShares_ Minimum redemption shares.
    function _init(
        address asset_,
        uint128 minDepositAssets_,
        uint128 minRedeemShares_
    ) internal virtual notZeroAddress(asset_) notZero(minDepositAssets_) notZero(minRedeemShares_) {
        if (_asset != address(0)) {
            revert EAlreadyInitialized();
        }
        _asset = asset_;
        minDepositAssets = minDepositAssets_;
        minRedeemShares = minRedeemShares_;
    }

    /// @dev We support ERC-7540 for the deposit flow, while it is not asynchronous.
    /// We don't follow IERC7540: “Vaults must not 'push' tokens onto the user after a request”
    /// Our Vault implementation takes user's assets and mints tokens for the user in one transaction.
    /// @dev Processes a deposit request.
    /// @param assets Amount of assets to deposit.
    /// @param receiver Address that will receive shares.
    /// @param owner Address that owns the assets.
    /// @return requestId Deposit's ID.
    /// @return shares Amount of shares minted.
    function _requestDeposit(
        uint256 assets,
        address receiver,
        address owner
    )
        internal
        virtual
        notZeroAddress(receiver)
        notZeroAddress(owner)
        checkNotPause(_DEPOSIT_SELECTOR)
        returns (uint256 requestId, uint256 shares)
    {
        // Check whether the deposit value is greater or equal to `minDepositAssets`.
        if (assets < minDepositAssets) {
            revert ETooLowDepositAssets(minDepositAssets);
        }

        // Transfer the requested assets from the owner.
        _transferAssetsFromOwner(owner, assets);

        // Generate an ID for each new operation.
        // Note: According to ERC-7540, returning `requestId` must be equal to zero, as we aggregate requests.
        // However, here we have `requestId != 0`.
        requestId = _generateId();

        // Call the SupplyManager's `deposit` method.
        shares = _supplyManagerDeposit(requestId, assets);

        // Mint shares for controller.
        IIssuer(_issuer()).mint(receiver, shares);

        // Emit an event to log the deposit request.
        emit IERC7540Deposit.DepositRequest(receiver, owner, requestId, msg.sender, assets);
    }

    /// @dev Processes a redemption request.
    /// @param shares Amount of shares to redeem.
    /// @param controller Address that will receive assets.
    /// @param owner Address that owns the shares.
    /// @return requestId Redemption's ID.
    /// Note: `notZeroAddress(owner)` is not called as the owner has already been checked.
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
        // Check if the requested shares do not exceed owner's balance.
        uint256 ownerMaxRedeem = _maxRedeem(owner);
        if (shares > ownerMaxRedeem) {
            revert ETooManyRequestRedeemShares(ownerMaxRedeem);
        }

        // Check the redemption operation value.
        if (shares < minRedeemShares) {
            revert ETooLowRequestRedeemShares(minRedeemShares);
        }

        // Generate an ID for each new operation.
        // Note: According to ERC-7540, returning `requestId` must be equal to zero, as we aggregate requests.
        // However, here we have `requestId != 0`.
        requestId = _generateId();

        // Store the redemption operation info.
        _storeRedeemRequestInfo(requestId, controller, owner, shares);

        // Burn the owner's shares.
        // slither-disable-next-line reentrancy-benign
        IIssuer(_issuer()).burn(owner, shares);

        // Call the Supply Manager's `requestRedeem` method.
        // slither-disable-next-line reentrancy-benign
        uint256 assets = _supplyManagerRequestRedeem(controller, owner, requestId, shares);

        // Increase the amount of pending redeem shares for the controller.
        _redeemInfo[controller].pendingRedeemShares += shares;

        // Emit an event to log the redemption operation request.
        emit IERC7540Redeem.RedeemRequest(controller, owner, requestId, msg.sender, assets);
    }

    /// @dev Withdraws assets from the Vault to the specified receiver.
    /// @param assets Amount of assets to withdraw.
    /// @param receiver Address that will receive the assets.
    /// @param controller Controller address.
    /// @return shares Amount of shares that were burned for the withdrawal.
    /// @dev Note: `notZeroAddress(controller)` is not called as the controller has already been checked.
    /// @dev ERC-7540: `The owner field of redeem and withdraw SHOULD be renamed to the controller...`
    function _withdraw(
        uint256 assets,
        address receiver,
        address controller
    ) internal virtual notZero(assets) notZeroAddress(receiver) returns (uint256 shares) {
        // Ensure that the requested withdrawal amount does not exceed the claimable assets' amount.
        uint256 maxWithdraw = _redeemInfo[controller].claimableRedeemAssets;
        if (assets > maxWithdraw) {
            revert ETooManyRedeemAssets(maxWithdraw);
        }

        // Reduce the claimable assets' amount for the controller.
        _redeemInfo[controller].claimableRedeemAssets -= assets;

        // Convert the assets' amount to shares.
        shares = _convertToShares(assets);

        // Transfer the assets to the receiver.
        _transferAssetsToReceiver(receiver, assets);

        // Emit the `withdraw` event.
        emit IERC7575.Withdraw(msg.sender, receiver, controller, assets, shares);
    }

    /// @dev Returns the maximum amount of shares that can be redeemed.
    /// @param owner Owner's address.
    /// @return maxShares Maximum amount of shares that can be redeemed.
    function _maxRedeem(address owner) internal view virtual returns (uint256 maxShares);

    /// @inheritdoc Ownable2Step
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        super._transferOwnership(newOwner);
    }

    /// @dev Fulfills redemption requests for the specified request IDs.
    /// @param requestIds Array of redemption request IDs.
    /// @param sumAssets Total assets being transferred.
    /// @dev If `requestId[i]` is zero, its value should be skipped from being processed.
    ///      This might happen when someone satisfies the redemption request in the same block.
    function _fulfillRedeemRequests(
        uint256[] calldata requestIds,
        uint256 sumAssets
    ) internal virtual {
        // Get the total number of requests to process.
        uint256 length = requestIds.length;

        // Iterate through each request ID.
        for (uint256 i = 0; i < length; ++i) {
            // Get the current request ID from the array.
            uint256 requestId = requestIds[i];

            // Only process non-zero request IDs as zero IDs may have been fulfilled in the same block.
            if (requestId != 0) {
                // Call the Supply Manager to get the redemption request details.
                // slither-disable-next-line unused-return
                (, , address controller, , uint256 assets, uint256 shares) = ISupplyManagerV2(
                    SUPPLY_MANAGER
                ).redeemRequests(requestId);

                // Update the redemption info by decreasing the pending shares and increasing claimable assets' amount.
                RedeemInfo storage redeemInfo = _redeemInfo[controller];
                redeemInfo.pendingRedeemShares -= shares;
                redeemInfo.claimableRedeemAssets += assets;
            }
        }

        // Emit an event to log the redemption operation.
        emit RedeemClaimable(requestIds, sumAssets);
    }

    /// @dev Returns the issuer interface implementation.
    /// @return Implementation of the IIssuer interface.
    function _issuer() internal view virtual returns (address);

    /// @dev Stores information about a redemption request.
    /// @param requestId Redemption request's ID.
    /// @param controller Address of the controller associated with the request.
    /// @param owner Address of the owner associated with the request.
    /// @param shares Amount of shares being redeemed.
    function _storeRedeemRequestInfo(
        uint256 requestId,
        address controller,
        address owner,
        uint256 shares
    ) internal virtual;

    /// @dev Processes the deposit through the Supply Manager contract.
    /// @param requestId Deposit request's ID.
    /// @param assets Amount of assets being deposited.
    /// @return shares Amount of shares to mint.
    function _supplyManagerDeposit(
        uint256 requestId,
        uint256 assets
    ) internal virtual returns (uint256 shares);

    /// @dev Requests redemption through the Supply Manager contract.
    /// @param controller Controller's address associated with the request.
    /// @param owner Owner's address associated with the request.
    /// @param requestId Redemption request's ID.
    /// @param shares Amount of shares being redeemed.
    /// @return assets Amount of assets to redeem.
    function _supplyManagerRequestRedeem(
        address controller,
        address owner,
        uint256 requestId,
        uint256 shares
    ) internal virtual returns (uint256 assets);

    /// @dev Converts the given amount of assets to the equivalent shares based on the current exchange rate.
    /// @param assets Amount of assets to convert.
    /// @return shares Equivalent amount of shares.
    function _convertToShares(uint256 assets) internal view virtual returns (uint256 shares);

    /// @dev Transfers assets from the owner to the Vault during the deposit.
    /// @param owner Address from which the assets must be transferred.
    /// @param assets Amount of assets to transfer.
    function _transferAssetsFromOwner(address owner, uint256 assets) internal virtual;

    /// @dev Transfers assets or the native token from the Vault to the receiver during the withdrawal.
    /// @param receiver Address that will receive the assets.
    /// @param assets Amount of assets to transfer.
    function _transferAssetsToReceiver(address receiver, uint256 assets) internal virtual;
}
