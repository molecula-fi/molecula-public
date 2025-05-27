// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {IERC7575} from "../common/external/interfaces/IERC7575.sol";
import {IIssuerShare7575} from "./interfaces/IIssuer.sol";
import {IMoleculaPoolV2} from "./interfaces/IMoleculaPoolV2.sol";
import {IOracleV2} from "./interfaces/IOracleV2.sol";
import {ISupplyManagerV2} from "./interfaces/ISupplyManagerV2.sol";
import {TokenVault} from "./TokenVault.sol";
import {ZeroValueChecker} from "../common/ZeroValueChecker.sol";

/// @title Supply Manager V2.
/// @notice Manages the Pool data and handles deposit and redemption operations.
/// @dev Implements the yield distribution and share management functionality.
contract SupplyManagerV2 is ISupplyManagerV2, Ownable2Step, IOracleV2, ZeroValueChecker {
    // ============ Constants ============

    /// @dev Basis points factor for the APY calculation (100% = 10000).
    /// Used as a denominator in percentage calculations.
    uint256 internal constant _APY_FACTOR = 10_000;

    /// @dev Represents 100% in the full portion calculation (1e18).
    /// Used for precise decimal calculation in yield distribution.
    uint256 internal constant _FULL_PORTION = 1e18;

    // ============ State Variables ============

    /// @dev Controls token Vault validation and share minting.
    IIssuerShare7575 public immutable SHARE7575;

    /// @notice The Molecula Pool contract's interface.
    /// @dev Handles actual asset deposits and redemptions.
    /// @custom:security non-reentrant
    IMoleculaPoolV2 public immutable MOLECULA_POOL;

    /// @notice Total amount of staking shares in circulation.
    /// @dev Used for calculating share prices and distribution.
    uint256 public totalSharesSupply;

    /// @notice Total amount of assets deposited into the Pool.
    /// @dev Represents the base value without yield.
    uint256 public totalDepositedSupply;

    /// @notice Amount of yield shares locked for future distribution.
    /// @dev Accumulates during redemptions and is distributed in batches.
    uint256 public lockedYieldShares;

    /// @notice APY formatter parameter for yield calculation.
    /// @dev (apyFormatter / _APY_FACTOR) * 100% = percentage retained by mUSD holders.
    uint256 public apyFormatter;

    /// @dev Address authorized to distribute yield.
    address public yieldDistributor;

    /// @dev Mapping of redemption requests to their details.
    mapping(uint256 => RedeemOperationInfo) public redeemRequests;

    /// @dev Validates that the caller is an authorized `TokenVault`.
    modifier onlyTokenVault() {
        SHARE7575.validateTokenVault(msg.sender);
        _;
    }

    /// @dev Ensures the caller matches the expected address.
    /// @param expectedAddress Authorized caller address.
    modifier only(address expectedAddress) {
        if (msg.sender != expectedAddress) {
            revert ENotAuthorized();
        }
        _;
    }

    // ============ Constructor ============

    /// @notice Initializes the Supply Manager's contract.
    /// @param initialOwner Address of the contract's owner.
    /// @param yieldDistributorAddress Address authorized to distribute yield.
    /// @param moleculaPoolAddress Address of the Molecula Pool's contract.
    /// @param apy Initial APY formatter value.
    /// @param share7575_ Address of the Share7575's contract.
    /// @dev Sets up the initial state and validates parameters.
    constructor(
        address initialOwner,
        address yieldDistributorAddress,
        address moleculaPoolAddress,
        uint256 apy,
        address share7575_
    )
        Ownable(initialOwner)
        checkNotZero(initialOwner)
        checkNotZero(yieldDistributorAddress)
        checkNotZero(moleculaPoolAddress)
        checkNotZero(share7575_)
    {
        MOLECULA_POOL = IMoleculaPoolV2(moleculaPoolAddress);
        totalDepositedSupply = MOLECULA_POOL.totalSupply();

        if (totalDepositedSupply == 0) {
            revert EZeroTotalSupply();
        }

        totalSharesSupply = totalDepositedSupply;
        _checkApyFormatter(apy);
        apyFormatter = apy;
        yieldDistributor = yieldDistributorAddress;
        SHARE7575 = IIssuerShare7575(share7575_);
    }

    // ============ Core Deposit/Withdrawal Functions ============

    /// @inheritdoc ISupplyManagerV2
    function deposit(
        address token,
        uint256 requestId,
        uint256 value
    ) external onlyTokenVault returns (uint256 shares) {
        // Save the total supply value at the start of the operation.
        uint256 startTotalSupply = totalSupply();

        // Call the Molecula Pool to deposit the value.
        uint256 formattedValue18 = MOLECULA_POOL.deposit(requestId, token, msg.sender, value);

        // Calculate the shares' amount to add upon the deposit operation by dividing the value by the `sharePrice` value.
        shares = (formattedValue18 * totalSharesSupply) / startTotalSupply;

        // Increase the total shares' supply amount.
        totalSharesSupply += shares;

        // Increase the total deposited supply value.
        totalDepositedSupply += formattedValue18;

        // Emit the `Deposit` event.
        emit Deposit(requestId, msg.sender, value, shares);

        // Return the shares' amount.
        return shares;
    }

    /// @inheritdoc ISupplyManagerV2
    function requestRedeem(
        address token,
        uint256 requestId,
        uint256 shares
    ) external onlyTokenVault returns (uint256 value) {
        // Ensure that shares can be redeemed.
        if (shares > totalSharesSupply) {
            revert ENoShares();
        }

        // Check the operation status.
        if (redeemRequests[requestId].status != OperationStatus.None) {
            revert EBadOperationStatus();
        }

        // Get the current total supply.
        uint256 currentTotalSupply = totalSupply();

        // Convert shares to the value before applying any changes to the contract values.
        value = (shares * currentTotalSupply) / totalSharesSupply;

        // Prepare the operation yield variables.
        uint256 operationYield = 0;
        uint256 operationYieldShares = 0;

        // Ensure that the operation has generated yield and lock it if it has.
        if (apyFormatter != 0 && totalDepositedSupply < currentTotalSupply) {
            // Calculate an operation yield value, which can be later distributed as a protocol income.
            // The operation yield must be equal to `actualIncome * (_APY_FACTOR - apyFormatter)`.
            // The simplified formula: `userIncome / apyFormatter * (_APY_FACTOR - apyFormatter)`.
            // The detailed formula: `((shares * (totalSupply - totalDepositedSupply)) / totalSharesSupply) / apyFormatter * (_APY_FACTOR - apyFormatter)`.
            operationYield =
                (shares *
                    (currentTotalSupply - totalDepositedSupply) *
                    (_APY_FACTOR - apyFormatter)) /
                (totalSharesSupply * apyFormatter);

            // Present the operation yield as locked yield shares, which are to be distributed later.
            // slither-disable-next-line divide-before-multiply.
            operationYieldShares = (operationYield * totalSharesSupply) / currentTotalSupply;

            // Update the locked yield shares by increasing it by the operation yield shares' amount.
            lockedYieldShares += operationYieldShares;
        }

        // Decrease the total deposited supply value by the redeemed value.
        totalDepositedSupply -= (shares * totalDepositedSupply) / totalSharesSupply;

        // Increase `totalDepositedSupply` with the operation yield.
        totalDepositedSupply += operationYield;

        // Decrease the total shares' supply amount by the redeemed shares.
        totalSharesSupply -= shares;

        // Increase the total shares' supply amount with the operation yield shares.
        totalSharesSupply += operationYieldShares;

        // Make a redeem operation request into the Pool and get a converted value with the right decimal amount.
        value = MOLECULA_POOL.requestRedeem(requestId, token, value);

        // Save the redeem operation information.
        redeemRequests[requestId] = RedeemOperationInfo(msg.sender, value, OperationStatus.Pending);

        // Emit the `RedeemRequest` operation event.
        emit RedeemRequest(requestId, msg.sender, shares, value);

        // Return the value.
        return value;
    }

    // ============ Redemption Management ============

    /// @inheritdoc ISupplyManagerV2
    function fulfillRedeemRequests(
        address fromAddress,
        uint256[] memory requestIds
    ) external only(address(MOLECULA_POOL)) returns (address token, uint256 redeemedValue) {
        // In the Molecula Pool, we check that `requestIds` is not empty.
        // Check the status of the first operation.
        if (redeemRequests[requestIds[0]].status != OperationStatus.Pending) {
            revert EBadOperationStatus();
        }

        // Create an array to store the values of the requests.
        uint256[] memory values = new uint256[](requestIds.length);

        // Initialize the first and total values.
        values[0] = redeemRequests[requestIds[0]].value;
        uint256 totalValue = values[0];

        // Get `TokenVault` associated with the first request.
        address tokenVault = redeemRequests[requestIds[0]].tokenVault;

        // Set the status of the first request to `Confirmed`.
        redeemRequests[requestIds[0]].status = OperationStatus.Confirmed;

        // Get the ERC20 token associated with the `TokenVault`.
        token = IERC7575(tokenVault).asset();

        // Loop through the remaining requests.
        for (uint256 i = 1; i < requestIds.length; i++) {
            // Check the status of the operation.
            if (redeemRequests[requestIds[i]].status != OperationStatus.Pending) {
                revert EBadOperationStatus();
            }

            // Check whether `TokenVault` is the same for all requests.
            if (redeemRequests[requestIds[i]].tokenVault != tokenVault) {
                revert EWrongTokenVault();
            }

            // Add the value of the current request to the values array.
            values[i] = redeemRequests[requestIds[i]].value;

            // Add the value to the total value.
            totalValue += values[i];

            // Set the status of the current request to `Confirmed`.
            redeemRequests[requestIds[i]].status = OperationStatus.Confirmed;
        }

        // Call the `redeem` function on `TokenVault`.
        TokenVault(tokenVault).fulfillRedeemRequests(fromAddress, requestIds, values, totalValue);

        emit FulfillRedeemRequests(requestIds, values);

        // Return the token and total redeemed value to the Molecula Pool.
        return (token, totalValue);
    }

    // ============ Yield Management ============

    /**
     * @dev Returns the formatted total supply of the Pool (TVL).
     * @return res Total Pool's supply.
     */
    function totalSupply() public view returns (uint256 res) {
        // Get the Pool's total supply.
        res = MOLECULA_POOL.totalSupply();

        // Reduce the total supply using the APY formatter if needed.
        if (totalDepositedSupply < res) {
            res -= totalDepositedSupply;
            res = (res * apyFormatter) / _APY_FACTOR;
            res += totalDepositedSupply;
        }
    }

    /// @inheritdoc ISupplyManagerV2
    function getMoleculaPool() external view returns (address pool) {
        return address(MOLECULA_POOL);
    }

    /**
     * @dev Validate APY.
     * @param apy APY.
     */
    function _checkApyFormatter(uint256 apy) internal pure {
        if (apy > _APY_FACTOR) {
            revert EInvalidAPY();
        }
    }

    /**
     * @dev Distributes yield.
     * @param parties List of parties.
     * @param newApyFormatter New APY formatter.
     */
    function distributeYield(
        Party[] memory parties,
        uint256 newApyFormatter
    ) external only(yieldDistributor) {
        // Validate the input.
        _checkApyFormatter(newApyFormatter);

        // Validate the parties.
        if (parties.length == 0) {
            revert EEmptyParties();
        }

        // Calculate the extra yield to distribute.
        uint256 realTotalSupply = MOLECULA_POOL.totalSupply();
        if (realTotalSupply <= totalDepositedSupply) {
            revert ENoRealYield();
        }

        uint256 realYield = realTotalSupply - totalDepositedSupply;
        uint256 currentYield = (realYield * apyFormatter) / _APY_FACTOR;
        uint256 extraYield = realYield - currentYield;

        // Find the amount of shares to mint.
        uint256 newTotalSupply = totalDepositedSupply + currentYield;
        uint256 sharesToMint = (extraYield * totalSharesSupply) / newTotalSupply;

        // Find the amount of shares to distribute by adding the locked yield shares' amount.
        uint256 sharesToDistribute = sharesToMint + lockedYieldShares;

        // Distribute the extra yield to the parties.
        uint256 length = parties.length;
        uint256 totalPortion = 0;

        for (uint256 i = 0; i < length; ++i) {
            Party memory party = parties[i];

            // slither-disable-next-line divide-before-multiply.
            uint256 shares = (party.portion * sharesToDistribute) / _FULL_PORTION;
            totalPortion += party.portion;

            // slither-disable-next-line reentrancy-no-eth.
            SHARE7575.mint(party.user, shares);
        }

        // Check that the total portion is equal to `_FULL_PORTION`.
        if (totalPortion != _FULL_PORTION) {
            revert EWrongPortion();
        }

        // Distribute an extra yield by:
        // - Increasing the total shares' supply.
        // - Equating the total deposited and real total supply values.
        totalSharesSupply += sharesToMint;
        totalDepositedSupply = realTotalSupply;

        // Reset the locked yield shares' amount.
        lockedYieldShares = 0;

        // Set the new APY formatter.
        apyFormatter = newApyFormatter;

        // Emit the `DistributeYield` event to log the operation.
        emit DistributeYield();
    }

    // ============ View Functions ============

    /// @inheritdoc IOracleV2
    function getTotalPoolSupply() external view returns (uint256 pool) {
        return totalSupply();
    }

    /// @inheritdoc IOracleV2
    function getTotalSharesSupply() external view returns (uint256 shares) {
        return totalSharesSupply;
    }

    /// @inheritdoc IOracleV2
    function getTotalSupply() public view returns (uint256 pool, uint256 shares) {
        pool = totalSupply();
        shares = totalSharesSupply;
    }

    /// @inheritdoc IOracleV2
    function convertToShares(uint256 assets) public view returns (uint256 shares) {
        (uint256 pool, uint256 poolShares) = getTotalSupply();
        return (assets * poolShares) / pool;
    }

    /// @inheritdoc IOracleV2
    function convertToAssets(uint256 shares) public view returns (uint256 assets) {
        (uint256 pool, uint256 poolShares) = getTotalSupply();
        return (shares * pool) / poolShares;
    }

    // ============ Admin Functions ============

    /**
     * @dev Setter for the Yield Distributor address.
     * @param newYieldDistributor New Yield Distributor address.
     */
    function setYieldDistributor(
        address newYieldDistributor
    ) external onlyOwner checkNotZero(newYieldDistributor) {
        yieldDistributor = newYieldDistributor;
    }

    /// @inheritdoc ISupplyManagerV2
    function onAddTokenVault(address tokenVault) external only(address(SHARE7575)) {
        MOLECULA_POOL.addTokenVault(tokenVault);
    }

    /// @inheritdoc ISupplyManagerV2
    function onRemoveTokenVault(address tokenVault) external only(address(SHARE7575)) {
        MOLECULA_POOL.removeTokenVault(tokenVault);
    }
}
