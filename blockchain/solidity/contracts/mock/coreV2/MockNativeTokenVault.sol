// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {NativeTokenVault} from "../../coreV2/TokenVault/NativeTokenVault.sol";
import {RebaseTokenV2} from "../../coreV2/Tokens/RebaseTokenV2.sol";
import {IERC7575Payable} from "../../common/external/interfaces/IERC7575Payable.sol";
import {BaseTokenVault} from "../../coreV2/TokenVault/BaseTokenVault.sol";
import {ISupplyManagerV2} from "../../coreV2/interfaces/ISupplyManagerV2.sol";
import {IRebaseERC20V2} from "../../coreV2/Tokens/interfaces/IRebaseERC20V2.sol";
import {IOracleV2} from "../../coreV2/interfaces/IOracleV2.sol";

contract MockNativeTokenVault is NativeTokenVault {
    using Address for address payable;

    bool public isRebaseToken;

    /// @dev Initializes the Vault with core dependencies.
    /// @param initialOwner Owner's address.
    /// @param shareAddress Address of the share token contract.
    /// @param supplyManager Address of the Supply Manager contract.
    constructor(
        address initialOwner,
        address shareAddress,
        address supplyManager,
        address guardianAddress,
        bool isRebaseToken_
    ) NativeTokenVault(initialOwner, shareAddress, supplyManager, guardianAddress) {
        isRebaseToken = isRebaseToken_;
    }

    /// @inheritdoc IERC7575Payable
    function convertToAssets(uint256 shares) public view virtual override returns (uint256 assets) {
        uint256 n = 0;
        return IOracleV2(SUPPLY_MANAGER).convertToAssets(shares) / (10 ** n);
    }

    /// @inheritdoc IERC7575Payable
    function convertToShares(uint256 assets) public view virtual override returns (uint256 shares) {
        return _convertToShares(assets);
    }

    /// @inheritdoc BaseTokenVault
    function _convertToShares(
        uint256 assets
    ) internal view virtual override returns (uint256 shares) {
        uint256 n = 0;
        return IOracleV2(SUPPLY_MANAGER).convertToAssets(assets * (10 ** n));
    }

    /// @inheritdoc IERC7575Payable
    function totalAssets() external view returns (uint256 totalManagedAssets) {
        address moleculaPool = ISupplyManagerV2(SUPPLY_MANAGER).getMoleculaPool();
        return address(moleculaPool).balance;
    }

    function _maxRedeem(address owner) internal view virtual override returns (uint256 maxShares) {
        return
            isRebaseToken
                ? IRebaseERC20V2(_SHARE).sharesOf(owner)
                : IERC20(_SHARE).balanceOf(owner);
    }
}
