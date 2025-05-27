// SPDX-FileCopyrightText: 2025 Molecula <info@molecula.fi>
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {RTSupplyManagerStorage, IEigenPodManager} from "./RTSupplyManagerStorage.sol";

import {IBufferInteractor} from "./interfaces/IBufferInteractor.sol";
import {IWETH} from "./external/interfaces/IWETH.sol";
import {IRTSupplyManager} from "./interfaces/IRTSupplyManager.sol";
import {ZeroValueChecker} from "../../common/ZeroValueChecker.sol";
import {IOracle} from "../../common/interfaces/IOracle.sol";
import {IRebaseToken} from "../../common/interfaces/IRebaseToken.sol";

/// @title Deposit Manager.
/// @notice Manages the deposits and pool data.
contract RTSupplyManager is
    RTSupplyManagerStorage,
    IRTSupplyManager,
    IOracle,
    Ownable2Step,
    ZeroValueChecker
{
    using SafeERC20 for IERC20;
    using Address for address;

    /// @dev Throws an error if called with the wrong sender.
    /// @param expectedSender Expected sender.
    modifier only(address expectedSender) {
        if (msg.sender != expectedSender) {
            revert EBadSender();
        }
        _;
    }

    /// @dev Check that `msg.sender` is the owner or guardian.
    modifier onlyAuthForPause() {
        if (msg.sender != owner() && msg.sender != guardian) {
            revert EBadSender();
        }
        _;
    }

    /**
     * @dev Constructor.
     * @param initialOwner_ Smart contract owner address.
     * @param authorizedYieldDistributorAddress_ Authorized Yield Distributor address.
     * @param authorizedStaker_ Authorized Staker and Restaker address.
     * @param rebaseTokenAddress_ Address of mrETH token.
     * @param weth_ Wrapped ETH contract address.
     * @param eigenPodManager_ Address of EigenPodManager contract.
     * @param initialSupply_ Amount of tokens to be deposited while initialize.
     * @param apyFormatter_ APY formatter value.
     * @param bufferPercent_ Percentage from TVL to be stored in Pools.
     */
    constructor(
        address initialOwner_,
        address authorizedYieldDistributorAddress_,
        address authorizedStaker_,
        address rebaseTokenAddress_,
        address weth_,
        address eigenPodManager_,
        uint256 initialSupply_,
        uint256 apyFormatter_,
        uint256 bufferPercent_
    )
        checkNotZero(initialOwner_)
        checkNotZero(authorizedYieldDistributorAddress_)
        checkNotZero(authorizedStaker_)
        checkNotZero(rebaseTokenAddress_)
        checkNotZero(weth_)
        checkNotZero(eigenPodManager_)
        Ownable(initialOwner_)
    {
        REBASE_TOKEN = rebaseTokenAddress_;

        authorizedYieldDistributor = authorizedYieldDistributorAddress_;
        authorizedStaker = authorizedStaker_;

        // TODO: remove WETH and read it from EIP7575's Share vaults,
        // i.e. REBASE_TOKEN.vaults.
        WETH = weth_;

        EIGEN_POD_MANAGER = IEigenPodManager(eigenPodManager_);

        // Set initial total deposited supply.
        totalDepositedSupply = initialSupply_;

        // Set initial total shares supply.
        totalSharesSupply = totalDepositedSupply;

        // Set initial APY formatter.
        _checkPercentage(apyFormatter_);
        apyFormatter = apyFormatter_;

        // Set initial buffer percentage.
        _checkPercentage(bufferPercent_);
        bufferPercentage = bufferPercent_;
    }

    /**
     * @dev Initialize function.
     * @param pools_ Array of pools addresses.
     * @param poolData_ Array of PoolData structs.
     */
    function initialize(
        address[] memory pools_,
        PoolData[] memory poolData_,
        bool[] memory auth_
    ) external onlyOwner {
        if (initialized) {
            revert EInitialized();
        }
        initialized = true;

        _setPools(pools_, poolData_, auth_);

        // Transfer from user
        // slither-disable-next-line arbitrary-send-erc20
        IERC20(WETH).safeTransferFrom(msg.sender, address(this), totalDepositedSupply);

        // Deposit into Pools.
        _depositIntoPools(totalDepositedSupply);
    }

    /// @inheritdoc IRTSupplyManager
    function requestDeposit(
        address user,
        uint256 requestId,
        uint256 value
    ) external payable only(REBASE_TOKEN) {
        // TODO: authorized EIP7575 entries.
        if (isDepositPaused) {
            revert EDepositPaused();
        }

        // Save the total supply value at the start of the operation.
        uint256 startTotalSupply = totalSupply();

        // Calculate the shares' amount to add upon the deposit operation by dividing the value by the `sharePrice` value.
        uint256 shares = (value * totalSharesSupply) / startTotalSupply;

        // Increase the total shares' supply amount.
        totalSharesSupply += shares;

        // Increase the total deposited supply value.
        totalDepositedSupply += value;

        // TODO: split the logic depending on the token type of the entry.
        // Idea: Consider to find out the dedicated flow logic from the entry itself.
        if (msg.value > 0) {
            // Convert ETH to WETH
            IWETH(WETH).deposit{value: msg.value}();
        } else {
            // Transfer from user
            // slither-disable-next-line arbitrary-send-erc20
            IERC20(WETH).safeTransferFrom(user, address(this), value);
        }

        // Call the Pool to deposit the value.
        _depositIntoPools(value);

        // Emit the request deposit event.
        emit RequestDeposit(requestId, user, value, shares);

        // ConfirmDeposit for user with shares' amount.
        IRebaseToken(REBASE_TOKEN).confirmDeposit(requestId, shares);
    }

    /// @dev receive ETH function.
    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    /// @inheritdoc IRTSupplyManager
    function deposit(
        uint256 value,
        bytes calldata pubkey,
        bytes calldata signature,
        bytes32 depositDataRoot
    ) external only(authorizedStaker) {
        if (isDepositPaused) {
            revert EDepositPaused();
        }

        // Calculate the actual buffered supply.
        uint256 actualBufferedSupply = _totalBufferedSupply(); // TODO: implement it.

        // Revert if the value is greater than the actual buffered supply.
        if (value > actualBufferedSupply) {
            revert ETooHighDepositValue();
        }

        // If the buffer percentage is greater than 0, calculate the max value to deposit.
        if (bufferPercentage > 0) {
            // Calculate the max value to deposit.
            uint256 maxValueToDeposit = (_totalSupply() * bufferPercentage) / PERCENTAGE_FACTOR;

            // Ensure we can deposit the value.
            if (value > maxValueToDeposit) {
                revert ETooHighDepositValue();
            }
        }

        // Call to withdraw the value from Pools.
        _withdrawFromPools(value);

        // convert WETH amount of value into ETH
        IWETH(WETH).withdraw(value);

        // stake ETH in EigenPod contract
        // EIGEN_POD_MANAGER.stake{value: value}(pubkey, signature, depositDataRoot);

        // Emit the deposit event.
        emit Deposit(value, pubkey, signature, depositDataRoot);
    }

    // TODO: add a token deposit function to support assets different from ETH.
    // commented to avoid compile warrnings
    // function depositToken(
    //     address token,
    //     bytes calldata pubkey,
    //     bytes calldata signature,
    //     bytes32 depositDataRoot
    // ) external only(authorizedStaker) {
    //     if (isDepositPaused) {
    //         revert EDepositPaused();
    //     }

    // TODO: implement it.
    // }

    // TO:DO add requestRedeem and redeem

    /**
     * @dev Distributes yield.
     * @param beneficiaryInfo List of parties.
     * @param newApyFormatter New APY formatter.
     */
    function distributeYield(
        Party[] memory beneficiaryInfo,
        uint256 newApyFormatter
    ) external only(authorizedYieldDistributor) {
        // Validate the input.
        _checkPercentage(newApyFormatter);

        // Calculate the extra yield to distribute.
        uint256 realTotalSupply = _totalSupply();
        if (realTotalSupply <= totalDepositedSupply) {
            revert ENoRealYield();
        }
        uint256 realYield = realTotalSupply - totalDepositedSupply;
        uint256 currentYield = (realYield * apyFormatter) / PERCENTAGE_FACTOR;
        uint256 extraYield = realYield - currentYield;
        // Find the amount of shares to mint.
        uint256 newTotalSupply = totalDepositedSupply + currentYield;
        uint256 sharesToMint = (extraYield * totalSharesSupply) / newTotalSupply;

        // Find the amount of shares to distribute by adding the locked yield shares' amount.
        uint256 sharesToDistribute = sharesToMint + lockedYieldShares;

        uint256 length = beneficiaryInfo.length;
        // slither-disable-next-line uninitialized-local
        uint256 totalPortion;

        // Distribute the extra yield to the parties.
        address[] memory users = new address[](length);
        uint256[] memory shares = new uint256[](length);
        // Calculate shares' value for every user.
        for (uint256 i = 0; i < length; i++) {
            Party memory p = beneficiaryInfo[i];
            users[i] = p.party;
            // slither-disable-next-line divide-before-multiply
            shares[i] = (p.portion * sharesToDistribute) / FULL_PORTION;

            // Get the total portion.
            totalPortion += beneficiaryInfo[i].portion;

            // slither-disable-next-line reentrancy-no-eth
            IRebaseToken(REBASE_TOKEN).distribute(users[i], shares[i]);
        }

        // Check that the total portion is equal to `FULL_PORTION`.
        if (totalPortion != FULL_PORTION) {
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

        // Emit an event to log operation.
        emit DistributeYield(users, shares);
    }

    /// @dev deposits ETH into Pools.
    /// @param value Amount of ETH to deposit.
    function _depositIntoPools(uint256 value) internal {
        uint256 length = poolsArray.length;

        for (uint256 i = 0; i < length; i++) {
            PoolData memory _poolData = poolData[poolsArray[i]];

            if (_poolData.poolPortion > 0) {
                // calculate amount to deposit to pool by distribution deposit portions.
                uint256 depositValue = (value * _poolData.poolPortion) / PERCENTAGE_FACTOR;

                // Call the Pool to deposit the value.
                _executeDeposit(poolsArray[i], depositValue);
            }
        }
    }

    /// @dev withdraws ETH from Pools.
    /// @param value Amount of ETH to withdraw.
    function _withdrawFromPools(uint256 value) internal {
        uint256 length = poolsArray.length;

        // TODO: calculate the required amount to withdraw from each pool
        // to keep the desired pool proportion allocation.

        // To achieve it you can use the ETH balance of the pool.

        // Once calculated, withdraw the required amount from each pool.
        // TODO: implement it.

        for (uint256 i = 0; i < length; i++) {
            PoolData memory _poolData = poolData[poolsArray[i]];

            if (_poolData.poolPortion > 0) {
                // calculate amount to withdraw from pool by distribution deposit portions.
                uint256 withdrawValue = (value * _poolData.poolPortion) / PERCENTAGE_FACTOR;

                // Call the Pool to withdraw the value.
                _executeWithdraw(poolsArray[i], withdrawValue);
            }
        }

        // TODO: include any possible remains in the last pool (?).
        // in order to avoid rounding issues.
    }

    /// @inheritdoc IRTSupplyManager
    function totalSupply() public view returns (uint256 res) {
        // Get the Pool's total supply.
        res = _totalSupply();

        // Then reduce it using APY formatter if needed.
        if (totalDepositedSupply < res) {
            res -= totalDepositedSupply;
            res = (res * apyFormatter) / PERCENTAGE_FACTOR;
            res += totalDepositedSupply;
        }
    }

    /// @dev calculates the yield of the .
    /// @return res Total ETH supply.
    function _totalSupply() internal view returns (uint256) {
        return _totalBufferedSupply();
        // TODO: include the supply from EigenLayer pods.
    }

    /// @dev calculates the yield on the increased balances of LP tokens.
    /// @return res Total ETH supply.
    function _totalBufferedSupply() internal view returns (uint256 res) {
        uint256 length = poolsArray.length;
        for (uint256 i = 0; i < length; i++) {
            address pool = poolsArray[i];
            PoolData memory _poolData = poolData[pool];

            res += IBufferInteractor(_poolData.poolLib).getEthBalance(
                pool,
                _poolData.poolToken,
                address(this)
            );
        }
    }

    /**
     * @dev Validate Percentage.
     * @param percentage All needed percentages.
     */
    function _checkPercentage(uint256 percentage) internal pure {
        if (percentage > PERCENTAGE_FACTOR) {
            revert EInvalidAPY();
        }
    }

    /**
     * @inheritdoc IOracle
     */
    function getTotalPoolSupply() external view returns (uint256 pool) {
        return totalSupply();
    }

    /**
     * @inheritdoc IOracle
     */
    function getTotalSharesSupply() external view returns (uint256 shares) {
        return totalSharesSupply;
    }

    /**
     * @inheritdoc IOracle
     */
    function getTotalSupply() external view returns (uint256 pool, uint256 shares) {
        pool = totalSupply();
        shares = totalSharesSupply;
    }

    /**
     * @dev Setter for the Authorized Yield Distributor address.
     * @param newAuthorizedYieldDistributor New authorized Yield Distributor address.
     */
    function setAuthorizedYieldDistributor(
        address newAuthorizedYieldDistributor
    ) external onlyOwner checkNotZero(newAuthorizedYieldDistributor) {
        authorizedYieldDistributor = newAuthorizedYieldDistributor;
    }

    /**
     * @dev Setter for the Authorized Staker and Restaker in EigenLayer address.
     * @param newAuthorizedStaker New authorized Staker and Restaker address.
     */
    function setAuthorizedStaker(
        address newAuthorizedStaker
    ) external onlyOwner checkNotZero(newAuthorizedStaker) {
        authorizedStaker = newAuthorizedStaker;
    }

    /**
     * @dev Authorizes a new Pools.
     * @param pools Pool's addresses array.
     * @param newPoolsData array of new pools data.
     * @param auth Array of boolean flags indicating for adding or removing Pool.
     */
    function setPools(
        address[] calldata pools,
        PoolData[] calldata newPoolsData,
        bool[] calldata auth
    ) external onlyOwner {
        uint256 balanceEthToRebalance = _setPools(pools, newPoolsData, auth);
        _rebalanceBuffer(newPoolsData, balanceEthToRebalance);
    }

    /**
     * @dev Authorizes a new Pool.
     * @param pool Pool's address.
     * @param newPoolData PoolData of new pool.
     * @param auth Boolean flag indicating for adding or removing Pool.
     */
    function _setPool(
        address pool,
        PoolData memory newPoolData,
        bool auth
    ) internal returns (uint256 balanceEthToRebalance) {
        if (auth) {
            if (poolData[pool].poolPortion == 0) {
                poolsArray.push(pool);
            }

            poolData[pool] = newPoolData;
        } else {
            PoolData memory _poolData = poolData[pool];

            poolsArray[_poolData.poolId] = poolsArray[poolsArray.length - 1];
            // slither-disable-next-line costly-loop
            poolsArray.pop();

            // get actual balance of pool
            balanceEthToRebalance = IBufferInteractor(_poolData.poolLib).getEthBalance(
                pool,
                _poolData.poolToken,
                address(this)
            );

            // withdraws all deleted pool balance
            _executeWithdraw(pool, balanceEthToRebalance);

            delete poolData[pool];
        }
    }

    /**
     * @dev Authorizes a new Pools.
     * @param pools actual Pool's addresses array.
     * @param newPoolsData array of new pools data.
     * @param auth Array of boolean flags indicating for adding or removing Pool.
     */
    function _setPools(
        address[] memory pools,
        PoolData[] memory newPoolsData,
        bool[] memory auth
    ) internal returns (uint256 balanceEthToRebalance) {
        // length of new poolsArray
        uint256 length = pools.length;

        // validate length of newPoolsData
        if (length != newPoolsData.length || length != auth.length) {
            revert EIncorrectLength();
        }

        // slither-disable-next-line uninitialized-local
        uint256 percentagesSum;

        for (uint256 i = 0; i < length; i++) {
            balanceEthToRebalance += _setPool(pools[i], newPoolsData[i], auth[i]);

            percentagesSum += newPoolsData[i].poolPortion;

            // poolId must match the position in the array
            if (newPoolsData[i].poolId != i) {
                revert EWrongPoolId();
            }
        }

        // percentagesSum should be equal 100%
        if (percentagesSum > PERCENTAGE_FACTOR) {
            revert EWrongPortion();
        }
    }

    /**
     * @dev Changes poolPortions and rebalance Buffer.
     * @param newPoolsData array of new pools data.
     */
    function rebalanceBuffer(PoolData[] calldata newPoolsData) external onlyOwner {
        _rebalanceBuffer(newPoolsData, 0);
    }

    /**
     * @dev Changes poolPortions and rebalance Buffer.
     * @param newPoolsData array of new pools data.
     * @param extraValue extra value for rebalance.
     */
    function _rebalanceBuffer(PoolData[] calldata newPoolsData, uint256 extraValue) internal {
        // length of new poolsArray
        uint256 length = poolsArray.length;

        // calculate actual buffer tvl
        uint256 bufferTvl = extraValue + _totalSupply();

        // create arrays for rebalance calculation
        uint256[] memory expectedPoolsBalances = new uint256[](length);
        uint256[] memory actualPoolsBalances = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address pool = poolsArray[i];

            // rewrite new poolData
            poolData[pool] = newPoolsData[i];

            // calculate amount to deposit to pool by distribution deposit portions.
            expectedPoolsBalances[i] =
                (bufferTvl * newPoolsData[i].poolPortion) /
                PERCENTAGE_FACTOR;

            actualPoolsBalances[i] = IBufferInteractor(newPoolsData[i].poolLib).getEthBalance(
                pool,
                newPoolsData[i].poolToken,
                address(this)
            );

            // withdraw extra balance of pool
            if (actualPoolsBalances[i] > expectedPoolsBalances[i]) {
                _executeWithdraw(pool, actualPoolsBalances[i] - expectedPoolsBalances[i]);
            }
        }

        // deposit into pools after withdrawing all extra balances
        for (uint256 i = 0; i < length; i++) {
            if (expectedPoolsBalances[i] > actualPoolsBalances[i]) {
                _executeDeposit(poolsArray[i], expectedPoolsBalances[i] - actualPoolsBalances[i]);
            }
        }
    }

    /**
     * @dev Setter for the bufferPercentage.
     * @param newBufferPercentage Number of new bufferPercentage.
     */
    function setBufferPercentage(uint256 newBufferPercentage) external onlyOwner {
        _checkPercentage(newBufferPercentage);
        bufferPercentage = newBufferPercentage;
    }

    /// @dev Change the guardian address.
    /// @param newGuardian New guardian address.
    function changeGuardian(address newGuardian) external onlyOwner checkNotZero(newGuardian) {
        guardian = newGuardian;
    }

    /// @dev Set new value for the `isExecutePaused` flag.
    /// @param newValue New value.
    function _setDepositPaused(bool newValue) private {
        if (isDepositPaused != newValue) {
            isDepositPaused = newValue;
            emit IsDepositPausedChanged(newValue);
        }
    }

    /// @dev Set new value for the `isRedeemPaused` flag.
    /// @param newValue New value.
    function _setRedeemPaused(bool newValue) private {
        if (isRedeemPaused != newValue) {
            isRedeemPaused = newValue;
            emit IsRedeemPausedChanged(newValue);
        }
    }

    /// @dev Pause the `deposit` functions.
    function pauseDeposit() external onlyAuthForPause {
        _setDepositPaused(true);
    }

    /// @dev Unpause the `deposit` functions.
    function unpauseDeposit() external onlyOwner {
        _setDepositPaused(false);
    }

    /// @dev Pause the `redeem` functions.
    function pauseRedeem() external onlyAuthForPause {
        _setRedeemPaused(true);
    }

    /// @dev Unpause the `redeem` functions.
    function unpauseRedeem() external onlyOwner {
        _setRedeemPaused(false);
    }

    /// @dev Pause the `deposit` and `redeem` functions.
    function pauseAll() external onlyAuthForPause {
        _setDepositPaused(true);
        _setRedeemPaused(true);
    }

    /// @dev Unpause the `deposit` and `redeem` functions.
    function unpauseAll() external onlyOwner {
        _setDepositPaused(false);
        _setRedeemPaused(false);
    }

    // TO:DO remove after eigenlayer integration
    function withdrawETH(uint256 amount) external onlyOwner {
        payable(msg.sender).transfer(amount);
    }

    function _executeDeposit(address pool, uint256 value) internal {
        // Approve to the AAVE Pool.
        IERC20(WETH).forceApprove(pool, value);

        // gets calldata for deposit into Pool
        bytes memory data = IBufferInteractor(poolData[pool].poolLib).encodeSupply(
            WETH,
            address(this),
            value
        );

        // slither-disable-next-line unused-return
        pool.functionCall(data);
    }

    function _executeWithdraw(address pool, uint256 value) internal {
        // gets calldata for withdraw from Pool
        bytes memory data = IBufferInteractor(poolData[pool].poolLib).encodeWithdraw(
            WETH,
            address(this),
            value
        );
        // slither-disable-next-line unused-return
        pool.functionCall(data);
    }
}
