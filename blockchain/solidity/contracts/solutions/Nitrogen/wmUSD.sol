// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IwmUSD} from "./interfaces/IwmUSD.sol";
import {RebaseERC20} from "../../common/rebase/RebaseERC20.sol";
import {ZeroValueChecker} from "../../common/ZeroValueChecker.sol";

/// @notice WMUSD is a wrapped, non-rebasing version of mUSD.
/// The token is designed for seamless integration into DeFi protocols, CEXes, etc.
contract WMUSD is IwmUSD, ERC20, ERC20Permit, ERC20Votes, ERC165, Ownable2Step, ZeroValueChecker {
    using SafeERC20 for RebaseERC20;

    /// @inheritdoc IwmUSD
    RebaseERC20 public immutable MUSD;

    /// @inheritdoc IwmUSD
    address public authorizedYieldDistributor;

    /// @inheritdoc IwmUSD
    uint256 public mUSDWrappedValue;

    /// @inheritdoc IwmUSD
    uint256 public mUSDWrappedShares;

    /// @dev Throws an error if the caller is not the authorized Yield Distributor.
    modifier onlyAuthorizedYieldDistributor() {
        if (msg.sender != authorizedYieldDistributor) {
            revert ENotAuthorizedYieldDistributor();
        }
        _;
    }

    /// @dev Constructor for initializing the contract.
    /// @param name Token name.
    /// @param symbol Token symbol.
    /// @param owner Smart contract owner address.
    /// @param mUSD Rebase token address.
    /// @param authorizedYieldDistributorAddress Authorized `yieldDistributor` address.
    constructor(
        string memory name,
        string memory symbol,
        address owner,
        RebaseERC20 mUSD,
        address authorizedYieldDistributorAddress
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(owner) {
        MUSD = mUSD;
        authorizedYieldDistributor = authorizedYieldDistributorAddress;
    }

    /// @inheritdoc IwmUSD
    function wrap(uint256 mUSDAmount) external {
        // Transfer the requested amount of mUSD from the user.
        MUSD.safeTransferFrom(msg.sender, address(this), mUSDAmount);

        // Mint wmUSD tokens for the user.
        _mint(msg.sender, mUSDAmount);

        // Increase the total wrapped mUSD value.
        mUSDWrappedValue += mUSDAmount;

        // Increase the total wrapped mUSD shares.
        mUSDWrappedShares += MUSD.convertToShares(mUSDAmount);

        // Emit an event to log the wrap operation.
        emit Wrapped(msg.sender, mUSDAmount);
    }

    /// @inheritdoc IwmUSD
    function unwrap(uint256 wmUSDAmount) external {
        // Burn wmUSD tokens for the user and emit the `Transfer` event.
        _burn(msg.sender, wmUSDAmount);

        // Convert wmUSD to mUSD.
        uint256 mUSDAmount = convertTomUSD(wmUSDAmount);

        // Transfer the requested amount of mUSD to the user.
        MUSD.safeTransfer(msg.sender, mUSDAmount);

        // Decrease the total wrapped mUSD value.
        mUSDWrappedValue -= wmUSDAmount;

        // Decrease the total wrapped mUSD shares.
        mUSDWrappedShares -= MUSD.convertToShares(mUSDAmount);

        // Emit an event to log the unwrap operation.
        emit Unwrapped(msg.sender, wmUSDAmount, mUSDAmount);
    }

    /// @inheritdoc IwmUSD
    function convertTomUSD(uint256 wmUSDAmount) public view returns (uint256 mUSDAmount) {
        // Get the actual mUSD balance of this contract.
        uint256 actualValue = MUSD.balanceOf(address(this));

        // Check that actual mUSD balance is less than mUSD wrapped value; share price is decreased.
        if (actualValue < mUSDWrappedValue) {
            // In unfavorable situation, 1 wmUSD is greater than 1 mUSD.

            // Calculate actual mUSD shares.
            uint256 shares = (wmUSDAmount * mUSDWrappedShares) / mUSDWrappedValue;

            // Convert actual mUSD shares to the mUSD value.
            mUSDAmount = MUSD.convertToAssets(shares);
        } else {
            // In regular case, 1 wmUSD is equal to 1 mUSD.
            mUSDAmount = wmUSDAmount;
        }
    }

    /// @inheritdoc IwmUSD
    function currentYield() external view returns (uint256) {
        uint256 totalWrappedValue = MUSD.convertToAssets(mUSDWrappedShares);
        // Note: User locked their mUSD tokens in the contract.
        // Shares' price is always increasing in the mUSD contract, along with the user's mUSD.
        // Yield is the difference between the increased mUSD and locked mUSD amounts.
        if (totalWrappedValue > mUSDWrappedValue) {
            unchecked {
                return totalWrappedValue - mUSDWrappedValue;
            }
        }
        return 0;
    }

    /// @inheritdoc IwmUSD
    function currentYieldShares() public view returns (uint256) {
        uint256 totalWrappedShares = MUSD.convertToShares(mUSDWrappedValue);
        if (mUSDWrappedShares > totalWrappedShares) {
            unchecked {
                return mUSDWrappedShares - totalWrappedShares;
            }
        }
        return 0;
    }

    /// @inheritdoc IwmUSD
    function distributeYield(address user, uint256 shares) external onlyAuthorizedYieldDistributor {
        // Check whether there are enough shares.
        if (shares > currentYieldShares()) {
            revert ETooManyShares();
        }

        // Decrease the total mUSD wrapped shares' amount.
        mUSDWrappedShares -= shares;

        // Convert the shares to the equivalent mUSD amount.
        uint256 mUSDAmount = MUSD.convertToAssets(shares);

        // Transfer the requested amount of mUSD to the user.
        MUSD.safeTransfer(user, mUSDAmount);

        // Emit event for tracking.
        emit YieldDistributed(user, shares, mUSDAmount);
    }

    /// @inheritdoc IwmUSD
    function setAuthorizedYieldDistributor(
        address newAuthorizedYieldDistributor
    ) external onlyOwner checkNotZero(newAuthorizedYieldDistributor) {
        address oldAuthorizedYieldDistributor = authorizedYieldDistributor;
        authorizedYieldDistributor = newAuthorizedYieldDistributor;

        // Emit event for tracking.
        emit AuthorizedYieldDistributorChanged(
            oldAuthorizedYieldDistributor,
            newAuthorizedYieldDistributor
        );
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC20Permit).interfaceId ||
            interfaceId == type(IERC6372).interfaceId ||
            interfaceId == type(IVotes).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // The functions below (`_update` and `nonces`) are overrides required by Solidity.

    /// @inheritdoc ERC20
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /// @inheritdoc Nonces
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
